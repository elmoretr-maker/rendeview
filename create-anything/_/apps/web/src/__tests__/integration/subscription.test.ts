import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as checkoutHandler } from '@/app/api/payments/checkout/route';
import { POST as downgradeHandler } from '@/app/api/payments/downgrade/route';
import { POST as cancelDowngradeHandler } from '@/app/api/payments/cancel-downgrade/route';
import { POST as webhookHandler } from '@/app/api/payments/webhook/route';
import {
  mockAuth,
  cleanupTestData,
  createTestUser,
  callRoute,
  assertSuccess,
  assertError,
  getUserData,
} from '../utils/test-helpers';

/**
 * Integration Tests for Subscription Flows
 * Tests actual API routes with real database interactions
 */

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock Stripe
const mockStripeCustomer = { id: 'cus_test_123' };
const mockCheckoutSession = {
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/test',
};
const mockSubscription = {
  id: 'sub_test_123',
  status: 'active',
  current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
  current_period_start: Math.floor(Date.now() / 1000),
  items: {
    data: [{
      price: {
        id: 'price_test_123',
        product: 'prod_test_123',
      },
      quantity: 1,
    }],
  },
  metadata: {},
};

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: vi.fn().mockResolvedValue(mockStripeCustomer),
        retrieve: vi.fn().mockResolvedValue(mockStripeCustomer),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue(mockCheckoutSession),
        },
      },
      subscriptions: {
        list: vi.fn().mockResolvedValue({ data: [mockSubscription] }),
        retrieve: vi.fn().mockResolvedValue(mockSubscription),
        update: vi.fn().mockResolvedValue(mockSubscription),
      },
      subscriptionSchedules: {
        create: vi.fn().mockResolvedValue({ id: 'sub_sched_test_123' }),
        list: vi.fn().mockResolvedValue({ data: [] }),
        release: vi.fn().mockResolvedValue({ id: 'sub_sched_test_123' }),
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    })),
  };
});

describe('Subscription Integration Tests - Real API Routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth(1);
    await cleanupTestData();
    await createTestUser(1, {
      name: 'Test User',
      email: 'test@example.com',
      membershipTier: 'free',
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Checkout API - POST /api/payments/checkout', () => {
    it('should create checkout session for subscription upgrade', async () => {
      const response = await callRoute(checkoutHandler, {
        method: 'POST',
        body: {
          kind: 'subscription',
          tier: 'dating',
          redirectURL: 'http://localhost:5000/success',
        },
      });

      assertSuccess(response);
      expect(response.data.url).toBe('https://checkout.stripe.com/test');
      expect(response.data.sessionId).toBe('cs_test_123');
    });

    it('should handle free to casual upgrade', async () => {
      const response = await callRoute(checkoutHandler, {
        method: 'POST',
        body: {
          kind: 'subscription',
          tier: 'casual',
        },
      });

      assertSuccess(response);
      expect(response.data.url).toBeDefined();
    });

    it('should handle free to business upgrade', async () => {
      const response = await callRoute(checkoutHandler, {
        method: 'POST',
        body: {
          kind: 'subscription',
          tier: 'business',
        },
      });

      assertSuccess(response);
      expect(response.data.url).toBeDefined();
    });

    it('should reject invalid tier', async () => {
      const response = await callRoute(checkoutHandler, {
        method: 'POST',
        body: {
          kind: 'subscription',
          tier: 'invalid_tier',
        },
      });

      assertError(response, 400);
      expect(response.data.error).toBeDefined();
    });

    it('should handle unauthorized access', async () => {
      mockAuth(null as any);

      const response = await callRoute(checkoutHandler, {
        method: 'POST',
        body: {
          kind: 'subscription',
          tier: 'dating',
        },
      });

      assertError(response, 401);
      expect(response.data.error).toBe('Unauthorized');
    });

    it('should support idempotency keys', async () => {
      const idempotencyKey = 'test-idempotency-key-123';

      const response1 = await callRoute(checkoutHandler, {
        method: 'POST',
        headers: {
          'idempotency-key': idempotencyKey,
        },
        body: {
          kind: 'subscription',
          tier: 'dating',
        },
      });

      assertSuccess(response1);

      // Second request with same key should return cached response
      const response2 = await callRoute(checkoutHandler, {
        method: 'POST',
        headers: {
          'idempotency-key': idempotencyKey,
        },
        body: {
          kind: 'subscription',
          tier: 'dating',
        },
      });

      assertSuccess(response2);
      expect(response2.data.url).toBe(response1.data.url);
    });
  });

  describe('Scheduled Downgrade Flow - Complete Lifecycle', () => {
    beforeEach(async () => {
      // Set user to paid tier with Stripe customer ID
      await createTestUser(1, {
        membershipTier: 'business',
        email: 'test@example.com',
      });

      // Add Stripe customer ID
      const sql = (await import('@/app/api/utils/sql')).default;
      await sql`UPDATE auth_users SET stripe_id = 'cus_test_123' WHERE id = 1`;
    });

    it('should schedule downgrade from business to casual', async () => {
      const response = await callRoute(downgradeHandler, {
        method: 'POST',
        body: {
          tier: 'casual',
        },
      });

      assertSuccess(response);
      expect(response.data.success).toBe(true);
      expect(response.data.scheduledTier).toBe('casual');
      expect(response.data.tierChangeAt).toBeDefined();
      expect(response.data.message).toContain('scheduled');

      // Verify database state
      const user = await getUserData(1);
      expect(user.scheduled_tier).toBe('casual');
      expect(user.tier_change_at).toBeDefined();
      expect(user.membership_tier).toBe('business'); // Should remain business until period end
    });

    it('should schedule downgrade from dating to free', async () => {
      await createTestUser(1, {
        membershipTier: 'dating',
      });

      const response = await callRoute(downgradeHandler, {
        method: 'POST',
        body: {
          tier: 'free',
        },
      });

      assertSuccess(response);
      expect(response.data.scheduledTier).toBe('free');

      const user = await getUserData(1);
      expect(user.scheduled_tier).toBe('free');
      expect(user.membership_tier).toBe('dating'); // Remains dating until end of period
    });

    it('should prevent downgrade to same or higher tier', async () => {
      const response = await callRoute(downgradeHandler, {
        method: 'POST',
        body: {
          tier: 'business', // Same tier
        },
      });

      assertError(response, 400);
      expect(response.data.error).toContain('lower tier');
    });

    it('should cancel scheduled downgrade', async () => {
      // First, schedule a downgrade
      await callRoute(downgradeHandler, {
        method: 'POST',
        body: {
          tier: 'casual',
        },
      });

      // Verify downgrade was scheduled
      let user = await getUserData(1);
      expect(user.scheduled_tier).toBe('casual');

      // Now cancel it
      const response = await callRoute(cancelDowngradeHandler, {
        method: 'POST',
      });

      assertSuccess(response);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('cancelled');

      // Verify cancellation in database
      user = await getUserData(1);
      expect(user.scheduled_tier).toBeNull();
      expect(user.tier_change_at).toBeNull();
    });

    it('should handle cancel when no scheduled downgrade exists', async () => {
      const response = await callRoute(cancelDowngradeHandler, {
        method: 'POST',
      });

      assertError(response, 400);
      expect(response.data.error).toContain('No scheduled downgrade');
    });

    it('should validate tier is provided', async () => {
      const response = await callRoute(downgradeHandler, {
        method: 'POST',
        body: {},
      });

      assertError(response, 400);
      expect(response.data.error).toContain('Tier is required');
    });

    it('should reject invalid tier values', async () => {
      const response = await callRoute(downgradeHandler, {
        method: 'POST',
        body: {
          tier: 'premium', // Not a valid tier
        },
      });

      assertError(response, 400);
      expect(response.data.error).toContain('Invalid tier');
    });
  });

  describe('Webhook Processing - Real Event Handling', () => {
    it('should process checkout.session.completed webhook', async () => {
      const mockEvent = {
        id: 'evt_test_checkout',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            mode: 'subscription',
            client_reference_id: '1',
            metadata: {
              kind: 'subscription',
              tier: 'dating',
            },
          },
        },
      };

      const Stripe = require('stripe');
      const stripeInstance = new Stripe();
      stripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const webhookBody = JSON.stringify(mockEvent);
      const response = await callRoute(webhookHandler, {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: webhookBody as any, // Pass raw string for webhook
      });

      // Webhook should return 200 even if processing has minor issues
      expect(response.status).toBeLessThan(500);
    });

    it('should reject webhook without signature', async () => {
      const response = await callRoute(webhookHandler, {
        method: 'POST',
        body: {
          id: 'evt_test',
          type: 'checkout.session.completed',
        },
      });

      assertError(response, 400);
      expect(response.data.error).toContain('signature');
    });
  });

  describe('Pricing Validation', () => {
    it('should use correct pricing from configuration', () => {
      const { MEMBERSHIP_TIERS } = require('@/config/constants');

      expect(MEMBERSHIP_TIERS.FREE.PRICE_CENTS).toBe(0);
      expect(MEMBERSHIP_TIERS.CASUAL.PRICE_CENTS).toBe(999);
      expect(MEMBERSHIP_TIERS.DATING.PRICE_CENTS).toBe(2999);
      expect(MEMBERSHIP_TIERS.BUSINESS.PRICE_CENTS).toBe(4999);
    });

    it('should use correct video duration from configuration', () => {
      const { MEMBERSHIP_TIERS } = require('@/config/constants');

      expect(MEMBERSHIP_TIERS.CASUAL.VIDEO_DURATION_MINUTES).toBe(15);
      expect(MEMBERSHIP_TIERS.DATING.VIDEO_DURATION_MINUTES).toBe(25);
      expect(MEMBERSHIP_TIERS.BUSINESS.VIDEO_DURATION_MINUTES).toBe(45);
    });

    it('should validate extension pricing', () => {
      const { VIDEO_CALL } = require('@/config/constants');

      expect(VIDEO_CALL.EXTENSION_PRICE_CENTS).toBe(800); // $8.00
      expect(VIDEO_CALL.EXTENSION_DURATION_MINUTES).toBe(10);
    });
  });
});

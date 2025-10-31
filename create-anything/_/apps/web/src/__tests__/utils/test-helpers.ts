/**
 * Test Utilities for Integration Tests
 * Provides helpers for API testing with real route handlers
 */

import sql from '@/app/api/utils/sql';

// Mock auth session for testing
// Note: This function expects auth to be mocked via vi.mock('@/auth') in the test file
export async function mockAuth(userId: number | null = 1) {
  // Import the mocked auth module
  const authModule = await import('../../../src/auth');
  const auth = authModule.auth as any;
  
  if (userId === null) {
    auth.mockResolvedValue(null);
  } else {
    auth.mockResolvedValue({
      user: { id: userId },
    });
  }
}

// Clean up test data from database
export async function cleanupTestData() {
  try {
    // Clean up blockers for all test users
    await sql`DELETE FROM blockers WHERE blocker_id <= 10 OR blocker_id >= 1000 OR blocked_id >= 1000`;
    
    // Clean up ALL rate limits (including user 1) to prevent test contamination
    await sql`DELETE FROM rate_limits WHERE user_id <= 10 OR user_id >= 1000`;
    
    // Clean up test webhook events
    await sql`DELETE FROM webhook_events WHERE event_id LIKE 'test_%'`;
    
    // Reset test user states for all test users
    await sql`
      UPDATE auth_users 
      SET block_count = 0,
          flagged_for_admin = false,
          account_status = 'active',
          scheduled_tier = NULL,
          tier_change_at = NULL
      WHERE id >= 1000
    `;
    
    // Also reset user 1 (main test user) to clean state
    await sql`
      UPDATE auth_users 
      SET block_count = 0,
          flagged_for_admin = false,
          account_status = 'active',
          scheduled_tier = NULL,
          tier_change_at = NULL
      WHERE id = 1
    `;
  } catch (err) {
    console.error('Test cleanup error:', err);
  }
}

// Create test users in database
export async function createTestUser(id: number, options: {
  name?: string;
  email?: string;
  membershipTier?: string;
  blockCount?: number;
  accountStatus?: string;
} = {}) {
  const {
    name = `Test User ${id}`,
    email = `test${id}@example.com`,
    membershipTier = 'free',
    blockCount = 0,
    accountStatus = 'active',
  } = options;

  await sql`
    INSERT INTO auth_users (id, name, email, membership_tier, block_count, account_status)
    VALUES (${id}, ${name}, ${email}, ${membershipTier}, ${blockCount}, ${accountStatus})
    ON CONFLICT (id) DO UPDATE SET
      name = ${name},
      email = ${email},
      membership_tier = ${membershipTier},
      block_count = ${blockCount},
      account_status = ${accountStatus}
  `;

  return { id, name, email, membershipTier, blockCount, accountStatus };
}

// Call API route handler directly
export async function callRoute(
  handler: (request: Request) => Promise<Response>,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<{ status: number; data: any; headers: Headers }> {
  const {
    method = 'GET',
    body = null,
    headers = {},
  } = options;

  const request = new Request('http://localhost:3000/api/test', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : null,
  });

  const response = await handler(request);
  const data = await response.json().catch(() => null);

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
}

// Assert response is successful
export function assertSuccess(response: { status: number; data: any }) {
  if (response.status >= 400) {
    throw new Error(`Expected successful response, got ${response.status}: ${JSON.stringify(response.data)}`);
  }
}

// Assert response has error
export function assertError(response: { status: number; data: any }, expectedStatus?: number) {
  if (response.status < 400) {
    throw new Error(`Expected error response, got ${response.status}`);
  }
  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
}

// Get user data from database
export async function getUserData(userId: number) {
  const [user] = await sql`
    SELECT id, name, email, membership_tier, block_count, account_status, 
           flagged_for_admin, scheduled_tier, tier_change_at
    FROM auth_users 
    WHERE id = ${userId}
  `;
  return user;
}

// Get all blockers for a user
export async function getBlockersForUser(blockerId: number) {
  const blockers = await sql`
    SELECT blocker_id, blocked_id, created_at, notes
    FROM blockers 
    WHERE blocker_id = ${blockerId}
    ORDER BY created_at DESC
  `;
  return blockers;
}

// Clear rate limits for a user
export async function clearRateLimits(userId: number, endpoint?: string) {
  if (endpoint) {
    await sql`DELETE FROM rate_limits WHERE user_id = ${userId} AND endpoint = ${endpoint}`;
  } else {
    await sql`DELETE FROM rate_limits WHERE user_id = ${userId}`;
  }
}

// Mock Stripe for payment tests
export function mockStripeSuccess() {
  const Stripe = require('stripe');
  Stripe.prototype.customers = {
    create: jest.fn().mockResolvedValue({ id: 'cus_test_123' }),
    retrieve: jest.fn().mockResolvedValue({ id: 'cus_test_123', email: 'test@example.com' }),
  };
  Stripe.prototype.checkout = {
    sessions: {
      create: jest.fn().mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      }),
    },
  };
  Stripe.prototype.subscriptions = {
    list: jest.fn().mockResolvedValue({ data: [] }),
    retrieve: jest.fn().mockResolvedValue({ id: 'sub_test_123', status: 'active', current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30 }),
    update: jest.fn().mockResolvedValue({ id: 'sub_test_123' }),
  };
  Stripe.prototype.subscriptionSchedules = {
    create: jest.fn().mockResolvedValue({ id: 'sub_sched_test_123' }),
    list: jest.fn().mockResolvedValue({ data: [] }),
    release: jest.fn().mockResolvedValue({ id: 'sub_sched_test_123' }),
  };
}

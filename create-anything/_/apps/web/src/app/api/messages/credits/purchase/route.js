import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import { getMessageCreditPricing } from '@/utils/membershipTiers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/messages/credits/purchase
 * 
 * Purchase message credits with reward pricing if eligible.
 * 
 * Body:
 * {
 *   packSize: 'PACK_SMALL' | 'PACK_MEDIUM' | 'PACK_LARGE',
 *   stripePaymentIntentId: 'pi_xxx' (from Stripe)
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   creditsAdded: number,
 *   newBalance: number,
 *   pricingTier: 'STANDARD' | 'REWARD'
 * }
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const body = await request.json();
    const { packSize, stripePaymentIntentId } = body;

    if (!packSize || !stripePaymentIntentId) {
      return Response.json(
        { error: "Missing packSize or stripePaymentIntentId" }, 
        { status: 400 }
      );
    }

    if (!['PACK_SMALL', 'PACK_MEDIUM', 'PACK_LARGE'].includes(packSize)) {
      return Response.json({ error: "Invalid packSize" }, { status: 400 });
    }

    // Check user's reward status to determine pricing
    const [rewardStatus] = await sql`
      SELECT has_active_reward
      FROM reward_status
      WHERE user_id = ${userId}
    `;

    const hasActiveReward = rewardStatus?.has_active_reward || false;
    const pricing = getMessageCreditPricing(hasActiveReward);
    const packDetails = pricing[packSize];

    if (!packDetails) {
      return Response.json({ error: "Invalid pack configuration" }, { status: 500 });
    }

    // CRITICAL SECURITY: Verify Stripe payment intent before crediting
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    } catch (stripeErr) {
      console.error('[/api/messages/credits/purchase] Invalid payment intent:', stripeErr);
      return Response.json({ 
        error: "Invalid payment intent ID" 
      }, { status: 400 });
    }

    // Verify payment succeeded
    if (paymentIntent.status !== 'succeeded') {
      console.error(`[/api/messages/credits/purchase] Payment not succeeded: ${paymentIntent.status}`);
      return Response.json({ 
        error: `Payment status is ${paymentIntent.status}, not succeeded` 
      }, { status: 400 });
    }

    // Verify amount matches expected price (convert to cents)
    const expectedAmountCents = packDetails.priceInCents;
    if (paymentIntent.amount !== expectedAmountCents) {
      console.error(`[/api/messages/credits/purchase] Amount mismatch: expected ${expectedAmountCents}, got ${paymentIntent.amount}`);
      return Response.json({ 
        error: "Payment amount does not match pack price" 
      }, { status: 400 });
    }

    // Check idempotency to prevent double-crediting (use payment intent ID as idempotency key)
    const [existingPurchase] = await sql`
      SELECT id FROM message_credit_purchases 
      WHERE user_id = ${userId} AND payment_intent_id = ${stripePaymentIntentId}
    `;

    if (existingPurchase) {
      // Already processed this payment
      const [currentCredits] = await sql`
        SELECT credits_remaining FROM user_message_credits WHERE user_id = ${userId}
      `;
      
      return Response.json({
        success: true,
        creditsAdded: packDetails.credits,
        newBalance: currentCredits?.credits_remaining || 0,
        pricingTier: hasActiveReward ? 'REWARD' : 'STANDARD',
        packDetails: {
          credits: packDetails.credits,
          price: packDetails.price,
          perMessageCost: packDetails.perMessageCost
        },
        alreadyProcessed: true
      });
    }

    // Use transaction for atomic credit addition and purchase tracking
    let newBalance;
    await sql.begin(async (tx) => {
      // Get or create user_message_credits record
      const [existingCredits] = await tx`
        SELECT credits_remaining, total_purchased, total_spent
        FROM user_message_credits
        WHERE user_id = ${userId}
        FOR UPDATE
      `;

      if (existingCredits) {
        // Update existing record
        newBalance = existingCredits.credits_remaining + packDetails.credits;
        await tx`
          UPDATE user_message_credits
          SET 
            credits_remaining = COALESCE(credits_remaining, 0) + ${packDetails.credits},
            total_purchased = COALESCE(total_purchased, 0) + ${packDetails.credits},
            updated_at = NOW()
          WHERE user_id = ${userId}
        `;
      } else {
        // Create new record
        newBalance = packDetails.credits;
        await tx`
          INSERT INTO user_message_credits (
            user_id, 
            credits_remaining, 
            total_purchased, 
            total_spent
          )
          VALUES (
            ${userId}, 
            ${packDetails.credits}, 
            ${packDetails.credits}, 
            0
          )
        `;
      }

      // Record this purchase for idempotency
      await tx`
        INSERT INTO message_credit_purchases (
          user_id,
          payment_intent_id,
          pack_size,
          credits_amount,
          price_cents,
          pricing_tier,
          created_at
        )
        VALUES (
          ${userId},
          ${stripePaymentIntentId},
          ${packSize},
          ${packDetails.credits},
          ${expectedAmountCents},
          ${hasActiveReward ? 'REWARD' : 'STANDARD'},
          NOW()
        )
      `;
    });

    // Get final balance
    const [finalCredits] = await sql`
      SELECT credits_remaining FROM user_message_credits WHERE user_id = ${userId}
    `;
    newBalance = finalCredits?.credits_remaining || newBalance;

    console.log(`[/api/messages/credits/purchase] Success: ${packDetails.credits} credits added to user ${userId}`);

    return Response.json({
      success: true,
      creditsAdded: packDetails.credits,
      newBalance,
      pricingTier: hasActiveReward ? 'REWARD' : 'STANDARD',
      packDetails: {
        credits: packDetails.credits,
        price: packDetails.price,
        perMessageCost: packDetails.perMessageCost
      }
    });

  } catch (err) {
    console.error('[/api/messages/credits/purchase] Error:', err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * GET /api/messages/credits/purchase
 * 
 * Get available message credit packs with pricing based on user's reward status.
 * 
 * Returns:
 * {
 *   packs: [...],
 *   pricingTier: 'STANDARD' | 'REWARD',
 *   currentBalance: number
 * }
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    // Check user's reward status
    const [rewardStatus] = await sql`
      SELECT has_active_reward, current_month_calls
      FROM reward_status
      WHERE user_id = ${userId}
    `;

    const hasActiveReward = rewardStatus?.has_active_reward || false;
    const pricing = getMessageCreditPricing(hasActiveReward);

    // Get current credit balance
    const [credits] = await sql`
      SELECT credits_remaining
      FROM user_message_credits
      WHERE user_id = ${userId}
    `;
    const currentBalance = credits?.credits_remaining || 0;

    // Build pack options
    const packs = [
      {
        id: 'PACK_SMALL',
        ...pricing.PACK_SMALL
      },
      {
        id: 'PACK_MEDIUM',
        ...pricing.PACK_MEDIUM
      },
      {
        id: 'PACK_LARGE',
        ...pricing.PACK_LARGE
      }
    ];

    return Response.json({
      packs,
      pricingTier: hasActiveReward ? 'REWARD' : 'STANDARD',
      currentBalance,
      videoCallsThisMonth: rewardStatus?.current_month_calls || 0,
      hasActiveReward
    });

  } catch (err) {
    console.error('[/api/messages/credits/purchase] Error:', err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

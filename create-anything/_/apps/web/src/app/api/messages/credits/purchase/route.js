import { auth } from '../../../../../auth';
import sql from '../../../utils/sql';
import { getMessageCreditPricing } from '../../../../../utils/membershipTiers';

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

    // TODO: Verify Stripe payment intent before crediting
    // For now, assuming payment is verified
    // In production, you would:
    // 1. Retrieve payment intent from Stripe API
    // 2. Verify amount matches packDetails.priceInCents
    // 3. Verify status is 'succeeded'
    // 4. Check idempotency to prevent double-crediting

    // Get or create user_message_credits record
    const [existingCredits] = await sql`
      SELECT credits_remaining, total_purchased, total_spent
      FROM user_message_credits
      WHERE user_id = ${userId}
    `;

    let newBalance;
    if (existingCredits) {
      // Update existing record
      newBalance = existingCredits.credits_remaining + packDetails.credits;
      await sql`
        UPDATE user_message_credits
        SET 
          credits_remaining = ${newBalance},
          total_purchased = total_purchased + ${packDetails.credits},
          updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    } else {
      // Create new record
      newBalance = packDetails.credits;
      await sql`
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

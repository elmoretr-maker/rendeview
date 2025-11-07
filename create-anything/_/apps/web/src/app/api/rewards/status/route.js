import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import { 
  MESSAGE_CREDIT_PRICING,
  shouldShowRewardWarning,
  getRemainingVideoCallsForReward
} from '@/utils/membershipTiers';

/**
 * GET /api/rewards/status
 * 
 * Returns user's reward status for message credit pricing.
 * 
 * Rolling Monthly Reward System:
 * - Complete 3 video calls with 3 different people each calendar month
 * - Maintains 50% bonus on message credits (e.g., $1.99 = 30 credits instead of 20)
 * - Resets each calendar month (not rolling 30-day window)
 * - Shows 7-day warning before month ends if requirement not met
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const currentMonthYear = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Get or create reward status
    let [rewardStatus] = await sql`
      SELECT 
        has_active_reward,
        current_month_calls,
        month_year,
        last_warning_shown_at
      FROM reward_status
      WHERE user_id = ${userId}
    `;

    // If no record exists or month changed, initialize/reset
    if (!rewardStatus || rewardStatus.month_year !== currentMonthYear) {
      // Month changed - reset to new month
      await sql`
        INSERT INTO reward_status (
          user_id, 
          has_active_reward, 
          current_month_calls, 
          month_year
        )
        VALUES (${userId}, FALSE, 0, ${currentMonthYear})
        ON CONFLICT (user_id) DO UPDATE SET
          has_active_reward = FALSE,
          current_month_calls = 0,
          month_year = ${currentMonthYear},
          updated_at = NOW()
      `;

      [rewardStatus] = await sql`
        SELECT has_active_reward, current_month_calls, month_year, last_warning_shown_at
        FROM reward_status
        WHERE user_id = ${userId}
      `;
    }

    // Get actual video call count from monthly_video_calls table
    const videoCallRows = await sql`
      SELECT COUNT(DISTINCT partner_id) as unique_partners
      FROM monthly_video_calls
      WHERE user_id = ${userId} AND month_year = ${currentMonthYear}
    `;
    const actualCalls = Number(videoCallRows[0]?.unique_partners) || 0;

    // Update current_month_calls if it doesn't match actual
    if (actualCalls !== rewardStatus.current_month_calls) {
      await sql`
        UPDATE reward_status
        SET current_month_calls = ${actualCalls},
            updated_at = NOW()
        WHERE user_id = ${userId}
      `;
      rewardStatus.current_month_calls = actualCalls;
    }

    // Determine if reward is active
    const hasActiveReward = actualCalls >= MESSAGE_CREDIT_PRICING.MONTHLY_MAINTENANCE_THRESHOLD;

    // Update has_active_reward if it doesn't match
    if (hasActiveReward !== rewardStatus.has_active_reward) {
      await sql`
        UPDATE reward_status
        SET has_active_reward = ${hasActiveReward},
            updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    }

    // Calculate days until end of month
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysUntilMonthEnd = Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Determine if should show warning
    const showWarning = shouldShowRewardWarning(actualCalls, daysUntilMonthEnd);
    const remainingCalls = getRemainingVideoCallsForReward(actualCalls);

    return Response.json({
      hasActiveReward,
      videoCallsThisMonth: actualCalls,
      requiredCalls: MESSAGE_CREDIT_PRICING.MONTHLY_MAINTENANCE_THRESHOLD,
      remainingCalls,
      daysUntilMonthEnd,
      showWarning,
      warningMessage: showWarning 
        ? `Complete ${remainingCalls} more video ${remainingCalls === 1 ? 'call' : 'calls'} in the next ${daysUntilMonthEnd} ${daysUntilMonthEnd === 1 ? 'day' : 'days'} to keep your 50% message credit bonus!`
        : null,
      monthYear: currentMonthYear
    });

  } catch (err) {
    console.error('[/api/rewards/status] Error:', err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

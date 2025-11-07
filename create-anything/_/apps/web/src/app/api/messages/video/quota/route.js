import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import { getVideoMessageLimits } from '@/utils/membershipTiers';

/**
 * GET /api/messages/video/quota?conversationId={id}
 * 
 * Returns video message quota for the user.
 * 
 * Flat Daily Totals System:
 * - Free: 1 video message/day total (across ALL conversations)
 * - Casual: 3 video messages/day total
 * - Dating: 5 video messages/day total
 * - Business: 10 video messages/day total
 * 
 * User allocates their daily allowance however they choose.
 * Unlocked after completing first video call with the person.
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return Response.json({ error: "Missing conversationId" }, { status: 400 });
    }

    // Get user's membership tier
    const [userData] = await sql`
      SELECT membership_tier 
      FROM auth_users 
      WHERE id = ${userId}
    `;
    const tier = (userData?.membership_tier || 'free').toLowerCase();

    // Check if user has completed video call with this person
    const [metadata] = await sql`
      SELECT video_call_count
      FROM conversation_metadata
      WHERE conversation_id = ${conversationId}
    `;

    const hasCompletedVideo = metadata?.video_call_count > 0;

    if (!hasCompletedVideo) {
      return Response.json({
        canSendVideoMessage: false,
        blockingReason: 'video_call_required',
        message: 'Complete a video call to unlock video messaging',
        videosAllowedToday: 0,
        videosSentToday: 0,
        videosRemaining: 0,
        creditsAvailable: 0
      });
    }

    // Get tier limits
    const { freePerDay, maxDuration } = getVideoMessageLimits(tier);

    // Get today's video messages sent (flat daily total across all conversations)
    const today = new Date().toISOString().split('T')[0];
    const [dailyUsage] = await sql`
      SELECT videos_sent
      FROM video_message_usage
      WHERE user_id = ${userId} AND date = ${today}
    `;
    const videosSentToday = dailyUsage?.videos_sent || 0;

    const videosRemaining = Math.max(0, freePerDay - videosSentToday);

    // Get available purchased video message credits
    const [credits] = await sql`
      SELECT credits_remaining
      FROM video_message_credits
      WHERE user_id = ${userId}
    `;
    const creditsAvailable = credits?.credits_remaining || 0;

    // Determine if user can send a video message
    const canSendVideoMessage = videosRemaining > 0 || creditsAvailable > 0;

    return Response.json({
      canSendVideoMessage,
      blockingReason: canSendVideoMessage ? null : 'daily_limit_reached',
      videosAllowedToday: freePerDay,
      videosSentToday,
      videosRemaining,
      creditsAvailable,
      maxDurationSeconds: maxDuration,
      tier
    });

  } catch (err) {
    console.error('[/api/messages/video/quota] Error:', err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

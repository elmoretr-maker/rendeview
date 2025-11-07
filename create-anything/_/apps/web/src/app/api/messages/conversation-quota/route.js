import { auth } from '../../../../auth';
import sql from '../../utils/sql';
import { 
  getPerPersonMessageLimit, 
  getBonusMessagesAfterVideo,
  isConversationInDecayMode,
  getDecayedMessageLimit,
  SMART_PROMPT_CONFIG
} from '../../../../utils/membershipTiers';

/**
 * GET /api/messages/conversation-quota?conversationId={id}
 * 
 * Progressive Video Unlock System:
 * Returns message quota for a specific conversation under the new video-first model.
 * 
 * Rules:
 * - Before first video call: 10 messages/day per person
 * - After 3 days without video: Decay to 2 messages/day
 * - After video call completion: 10 + tier bonus (Casual:+25, Dating:+50, Business:+100)
 * - Can use purchased credits when daily limit exhausted
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

    // Verify user is a participant in this conversation
    const [participant] = await sql`
      SELECT conversation_id
      FROM conversation_participants
      WHERE conversation_id = ${conversationId} AND user_id = ${userId}
    `;

    if (!participant) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user's membership tier
    const [userData] = await sql`
      SELECT membership_tier 
      FROM auth_users 
      WHERE id = ${userId}
    `;
    const tier = (userData?.membership_tier || 'free').toLowerCase();

    // Get or create conversation metadata
    let [metadata] = await sql`
      SELECT 
        started_at,
        first_video_call_at,
        last_video_call_at,
        video_call_count
      FROM conversation_metadata
      WHERE conversation_id = ${conversationId}
    `;

    if (!metadata) {
      // Create metadata entry for new conversation
      await sql`
        INSERT INTO conversation_metadata (conversation_id, started_at)
        VALUES (${conversationId}, NOW())
        ON CONFLICT (conversation_id) DO NOTHING
      `;
      
      [metadata] = await sql`
        SELECT started_at, first_video_call_at, last_video_call_at, video_call_count
        FROM conversation_metadata
        WHERE conversation_id = ${conversationId}
      `;
    }

    const hasCompletedVideo = metadata?.video_call_count > 0;
    const isDecay = metadata 
      ? isConversationInDecayMode(metadata.started_at, hasCompletedVideo)
      : false;

    // Get today's messages sent to this person
    const today = new Date().toISOString().split('T')[0];
    const [dailyMessages] = await sql`
      SELECT messages_sent
      FROM conversation_daily_messages
      WHERE conversation_id = ${conversationId}
        AND user_id = ${userId}
        AND date = ${today}
    `;
    const messagesSentToday = dailyMessages?.messages_sent || 0;

    // Calculate allowed messages based on state
    let messagesAllowedToday;
    if (isDecay) {
      // Decay mode: 2 messages/day
      messagesAllowedToday = getDecayedMessageLimit();
    } else if (hasCompletedVideo) {
      // Post-video: 10 + tier bonus
      const bonusMessages = getBonusMessagesAfterVideo(tier);
      messagesAllowedToday = SMART_PROMPT_CONFIG.MESSAGE_COUNT_HARD_LIMIT + bonusMessages;
    } else {
      // Pre-video: 10 messages/day
      messagesAllowedToday = getPerPersonMessageLimit(tier);
    }

    const messagesRemaining = Math.max(0, messagesAllowedToday - messagesSentToday);

    // Get available purchased credits
    const [credits] = await sql`
      SELECT credits_remaining
      FROM user_message_credits
      WHERE user_id = ${userId}
    `;
    const creditsAvailable = credits?.credits_remaining || 0;

    // Determine if user can send a message
    let canSendMessage = messagesRemaining > 0 || creditsAvailable > 0;
    let blockingReason = null;

    if (!canSendMessage) {
      if (isDecay) {
        blockingReason = 'decay_limit_reached';
      } else if (hasCompletedVideo) {
        blockingReason = 'daily_limit_reached';
      } else {
        blockingReason = 'pre_video_limit_reached';
      }
    }

    // Check if should show smart prompts
    const shouldShowLongMessagePrompt = false; // Determined on frontend based on character count
    const shouldShowVideoNudge = !hasCompletedVideo && messagesSentToday >= SMART_PROMPT_CONFIG.MESSAGE_COUNT_WARNING_THRESHOLD;

    return Response.json({
      messagesAllowedToday,
      messagesSentToday,
      messagesRemaining,
      isDecayMode: isDecay,
      decayedLimit: isDecay ? getDecayedMessageLimit() : null,
      hasCompletedVideo,
      bonusMessages: hasCompletedVideo ? getBonusMessagesAfterVideo(tier) : 0,
      creditsAvailable,
      canSendMessage,
      blockingReason,
      tier,
      shouldShowVideoNudge,
      conversationStartDate: metadata?.started_at
    });

  } catch (err) {
    console.error('[/api/messages/conversation-quota] Error:', err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

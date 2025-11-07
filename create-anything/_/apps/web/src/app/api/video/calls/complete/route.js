import { auth } from '../../../../auth';
import sql from '../../utils/sql';

/**
 * POST /api/video/calls/complete
 * 
 * Called when a video call completes successfully.
 * Updates conversation metadata and tracks monthly video calls for reward system.
 * 
 * Body:
 * {
 *   conversationId: number,
 *   partnerId: number,
 *   videoSessionId: number (optional)
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
    const { conversationId, partnerId, videoSessionId } = body;

    if (!conversationId || !partnerId) {
      return Response.json(
        { error: "Missing conversationId or partnerId" }, 
        { status: 400 }
      );
    }

    // Verify both users are participants in the conversation
    const participants = await sql`
      SELECT user_id
      FROM conversation_participants
      WHERE conversation_id = ${conversationId}
        AND user_id IN (${userId}, ${partnerId})
    `;

    if (participants.length !== 2) {
      return Response.json({ error: "Invalid conversation participants" }, { status: 403 });
    }

    const currentMonthYear = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Update conversation metadata for both users
    const [metadata] = await sql`
      SELECT video_call_count, first_video_call_at
      FROM conversation_metadata
      WHERE conversation_id = ${conversationId}
    `;

    if (metadata) {
      // Update existing metadata
      await sql`
        UPDATE conversation_metadata
        SET 
          first_video_call_at = COALESCE(first_video_call_at, NOW()),
          last_video_call_at = NOW(),
          video_call_count = video_call_count + 1,
          updated_at = NOW()
        WHERE conversation_id = ${conversationId}
      `;
    } else {
      // Create new metadata
      await sql`
        INSERT INTO conversation_metadata (
          conversation_id,
          first_video_call_at,
          last_video_call_at,
          video_call_count
        )
        VALUES (${conversationId}, NOW(), NOW(), 1)
        ON CONFLICT (conversation_id) DO UPDATE SET
          first_video_call_at = COALESCE(conversation_metadata.first_video_call_at, NOW()),
          last_video_call_at = NOW(),
          video_call_count = conversation_metadata.video_call_count + 1,
          updated_at = NOW()
      `;
    }

    // Track this video call for current user (for reward system)
    await sql`
      INSERT INTO monthly_video_calls (
        user_id,
        partner_id,
        video_session_id,
        completed_at,
        month_year
      )
      VALUES (
        ${userId},
        ${partnerId},
        ${videoSessionId || null},
        NOW(),
        ${currentMonthYear}
      )
      ON CONFLICT (user_id, partner_id, month_year) DO UPDATE SET
        completed_at = NOW(),
        video_session_id = ${videoSessionId || null}
    `;

    // Track this video call for partner (for their reward system)
    await sql`
      INSERT INTO monthly_video_calls (
        user_id,
        partner_id,
        video_session_id,
        completed_at,
        month_year
      )
      VALUES (
        ${partnerId},
        ${userId},
        ${videoSessionId || null},
        NOW(),
        ${currentMonthYear}
      )
      ON CONFLICT (user_id, partner_id, month_year) DO UPDATE SET
        completed_at = NOW(),
        video_session_id = ${videoSessionId || null}
    `;

    // Get updated video call counts for both users
    const [userCallCount] = await sql`
      SELECT COUNT(DISTINCT partner_id) as unique_partners
      FROM monthly_video_calls
      WHERE user_id = ${userId} AND month_year = ${currentMonthYear}
    `;

    const [partnerCallCount] = await sql`
      SELECT COUNT(DISTINCT partner_id) as unique_partners
      FROM monthly_video_calls
      WHERE user_id = ${partnerId} AND month_year = ${currentMonthYear}
    `;

    const userCalls = Number(userCallCount?.unique_partners) || 0;
    const partnerCalls = Number(partnerCallCount?.unique_partners) || 0;

    // Update reward status for current user
    await sql`
      INSERT INTO reward_status (
        user_id,
        has_active_reward,
        current_month_calls,
        month_year
      )
      VALUES (
        ${userId},
        ${userCalls >= 3},
        ${userCalls},
        ${currentMonthYear}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        has_active_reward = ${userCalls >= 3},
        current_month_calls = ${userCalls},
        month_year = ${currentMonthYear},
        updated_at = NOW()
    `;

    // Update reward status for partner
    await sql`
      INSERT INTO reward_status (
        user_id,
        has_active_reward,
        current_month_calls,
        month_year
      )
      VALUES (
        ${partnerId},
        ${partnerCalls >= 3},
        ${partnerCalls},
        ${currentMonthYear}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        has_active_reward = ${partnerCalls >= 3},
        current_month_calls = ${partnerCalls},
        month_year = ${currentMonthYear},
        updated_at = NOW()
    `;

    return Response.json({
      success: true,
      conversationUpdated: true,
      userVideoCallsThisMonth: userCalls,
      partnerVideoCallsThisMonth: partnerCalls,
      userHasReward: userCalls >= 3,
      partnerHasReward: partnerCalls >= 3
    });

  } catch (err) {
    console.error('[/api/video/calls/complete] Error:', err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

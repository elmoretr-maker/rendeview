import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { getFirstEncounterMessageLimit } from "@/utils/membershipTiers";

export async function POST(request) {
  try {
    const uid = await getAuthenticatedUserId();
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId, sessionId } = await request.json();

    if (!matchId) {
      return Response.json({ error: "matchId is required" }, { status: 400 });
    }

    const matchRows = await sql`
      SELECT id, user_a_id, user_b_id FROM matches 
      WHERE id = ${matchId} AND (user_a_id = ${uid} OR user_b_id = ${uid})
    `;
    
    if (!matchRows?.length) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const match = matchRows[0];
    const otherUserId = match.user_a_id === uid ? match.user_b_id : match.user_a_id;

    const userRows = await sql`SELECT membership_tier FROM auth_users WHERE id = ${uid}`;
    const userTier = userRows?.[0]?.membership_tier || 'free';
    const refreshLimit = getFirstEncounterMessageLimit(userTier);

    await sql`
      INSERT INTO match_first_encounter_messages (
        match_id, 
        user_id, 
        messages_remaining, 
        last_video_call_at
      )
      VALUES (
        ${matchId}, 
        ${uid}, 
        ${refreshLimit}, 
        NOW()
      )
      ON CONFLICT (match_id, user_id)
      DO UPDATE SET 
        messages_remaining = ${refreshLimit},
        last_video_call_at = NOW(),
        updated_at = NOW()
    `;

    const otherUserRows = await sql`SELECT membership_tier FROM auth_users WHERE id = ${otherUserId}`;
    const otherUserTier = otherUserRows?.[0]?.membership_tier || 'free';
    const otherRefreshLimit = getFirstEncounterMessageLimit(otherUserTier);

    await sql`
      INSERT INTO match_first_encounter_messages (
        match_id, 
        user_id, 
        messages_remaining, 
        last_video_call_at
      )
      VALUES (
        ${matchId}, 
        ${otherUserId}, 
        ${otherRefreshLimit}, 
        NOW()
      )
      ON CONFLICT (match_id, user_id)
      DO UPDATE SET 
        messages_remaining = ${otherRefreshLimit},
        last_video_call_at = NOW(),
        updated_at = NOW()
    `;

    const today = new Date().toISOString().split('T')[0];
    
    await sql`
      UPDATE match_daily_message_counts
      SET video_call_completed = TRUE, updated_at = NOW()
      WHERE match_id = ${matchId} 
        AND user_id IN (${uid}, ${otherUserId})
        AND date = ${today}
    `;

    return Response.json({ 
      success: true,
      messagesRefreshed: refreshLimit,
      premiumFeaturesUnlocked: userTier === 'business'
    });

  } catch (err) {
    console.error("POST /api/video/complete error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { getDailyMessageLimit, getFirstEncounterMessageLimit, getPerMatchDailyLimit } from "@/utils/membershipTiers";

export async function GET(request) {
  try {
    const uid = await getAuthenticatedUserId();
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return Response.json({ error: "matchId is required" }, { status: 400 });
    }

    const matchRows = await sql`
      SELECT id FROM matches 
      WHERE id = ${matchId} AND (user_a_id = ${uid} OR user_b_id = ${uid})
    `;
    
    if (!matchRows?.length) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const userRows = await sql`
      SELECT membership_tier FROM auth_users WHERE id = ${uid}
    `;
    
    const userTier = userRows?.[0]?.membership_tier || 'free';
    const today = new Date().toISOString().split('T')[0];

    const dailyLimit = getDailyMessageLimit(userTier);
    
    const dailyCountRows = await sql`
      SELECT messages_sent 
      FROM user_daily_message_counts 
      WHERE user_id = ${uid} AND date = ${today}
    `;
    const dailyMessagesUsed = dailyCountRows?.[0]?.messages_sent || 0;
    const dailyMessagesRemaining = Math.max(0, dailyLimit - dailyMessagesUsed);

    const firstEncounterRows = await sql`
      SELECT messages_remaining, last_video_call_at 
      FROM match_first_encounter_messages 
      WHERE match_id = ${matchId} AND user_id = ${uid}
    `;
    
    let firstEncounterRemaining = 0;
    let hasVideoCalledWith = false;
    
    if (firstEncounterRows?.length) {
      firstEncounterRemaining = firstEncounterRows[0].messages_remaining || 0;
      hasVideoCalledWith = !!firstEncounterRows[0].last_video_call_at;
    } else {
      firstEncounterRemaining = getFirstEncounterMessageLimit(userTier);
      
      await sql`
        INSERT INTO match_first_encounter_messages (match_id, user_id, messages_remaining)
        VALUES (${matchId}, ${uid}, ${firstEncounterRemaining})
        ON CONFLICT (match_id, user_id) DO NOTHING
      `;
    }

    const creditRows = await sql`
      SELECT credits_remaining FROM user_message_credits WHERE user_id = ${uid}
    `;
    const creditsRemaining = creditRows?.[0]?.credits_remaining || 0;

    let perMatchDailyRemaining = null;
    const perMatchLimit = getPerMatchDailyLimit(userTier, hasVideoCalledWith);
    
    if (perMatchLimit !== null) {
      const perMatchCountRows = await sql`
        SELECT messages_sent 
        FROM match_daily_message_counts 
        WHERE match_id = ${matchId} AND user_id = ${uid} AND date = ${today}
      `;
      const perMatchMessagesUsed = perMatchCountRows?.[0]?.messages_sent || 0;
      perMatchDailyRemaining = Math.max(0, perMatchLimit - perMatchMessagesUsed);
    }

    let canSendMessage = firstEncounterRemaining > 0 
      || dailyMessagesRemaining > 0 
      || creditsRemaining > 0;
    
    if (perMatchDailyRemaining !== null && perMatchDailyRemaining <= 0) {
      canSendMessage = false;
    }

    return Response.json({
      canSend: canSendMessage,
      quota: {
        firstEncounter: {
          remaining: firstEncounterRemaining,
          limit: getFirstEncounterMessageLimit(userTier)
        },
        dailyTier: {
          remaining: dailyMessagesRemaining,
          limit: dailyLimit,
          resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
        },
        credits: {
          remaining: creditsRemaining
        },
        perMatchDaily: perMatchLimit !== null ? {
          remaining: perMatchDailyRemaining,
          limit: perMatchLimit,
          resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
        } : null
      },
      tier: userTier,
      hasVideoCalledWith
    });

  } catch (err) {
    console.error("GET /api/messages/quota error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

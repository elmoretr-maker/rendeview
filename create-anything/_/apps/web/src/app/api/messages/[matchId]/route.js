import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { 
  getDailyMessageLimit, 
  getFirstEncounterMessageLimit, 
  getPerMatchDailyLimit 
} from "@/utils/membershipTiers";

export async function GET(request, { params: { matchId } }) {
  try {
    const uid = await getAuthenticatedUserId();
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure the user is part of the match
    const matchRows = await sql`SELECT id FROM matches WHERE id = ${matchId} AND (user_a_id = ${uid} OR user_b_id = ${uid})`;
    if (!matchRows?.length) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await sql`
      SELECT id, sender_id, body, created_at
      FROM messages
      WHERE match_id = ${matchId}
      ORDER BY created_at ASC`;

    return Response.json({ messages: rows });
  } catch (err) {
    console.error("GET /api/messages/[matchId] error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request, { params: { matchId } }) {
  try {
    const uid = await getAuthenticatedUserId();
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { body } = await request.json();

    if (typeof body !== "string" || body.trim().length === 0 || body.length > 50) {
      return Response.json({ error: "Message must be 1-50 characters" }, { status: 400 });
    }

    const matchRows = await sql`SELECT id FROM matches WHERE id = ${matchId} AND (user_a_id = ${uid} OR user_b_id = ${uid})`;
    if (!matchRows?.length) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const userRows = await sql`SELECT membership_tier FROM auth_users WHERE id = ${uid}`;
    const userTier = userRows?.[0]?.membership_tier || 'free';
    const today = new Date().toISOString().split('T')[0];

    let firstEncounterRows = await sql`
      SELECT messages_remaining, last_video_call_at 
      FROM match_first_encounter_messages 
      WHERE match_id = ${matchId} AND user_id = ${uid}
    `;
    
    if (!firstEncounterRows?.length) {
      const initialLimit = getFirstEncounterMessageLimit(userTier);
      await sql`
        INSERT INTO match_first_encounter_messages (match_id, user_id, messages_remaining)
        VALUES (${matchId}, ${uid}, ${initialLimit})
      `;
      firstEncounterRows = [{messages_remaining: initialLimit, last_video_call_at: null}];
    }
    
    let firstEncounterRemaining = firstEncounterRows[0].messages_remaining || 0;
    const hasVideoCalledWith = !!firstEncounterRows[0].last_video_call_at;

    const dailyLimit = getDailyMessageLimit(userTier);
    const dailyCountRows = await sql`
      SELECT messages_sent FROM user_daily_message_counts 
      WHERE user_id = ${uid} AND date = ${today}
    `;
    let dailyMessagesUsed = dailyCountRows?.[0]?.messages_sent || 0;
    let dailyMessagesRemaining = Math.max(0, dailyLimit - dailyMessagesUsed);

    const creditRows = await sql`SELECT credits_remaining FROM user_message_credits WHERE user_id = ${uid}`;
    let creditsRemaining = creditRows?.[0]?.credits_remaining || 0;

    let perMatchDailyRemaining = null;
    const perMatchLimit = getPerMatchDailyLimit(userTier, hasVideoCalledWith);
    if (perMatchLimit !== null) {
      const perMatchCountRows = await sql`
        SELECT messages_sent FROM match_daily_message_counts 
        WHERE match_id = ${matchId} AND user_id = ${uid} AND date = ${today}
      `;
      const perMatchMessagesUsed = perMatchCountRows?.[0]?.messages_sent || 0;
      perMatchDailyRemaining = Math.max(0, perMatchLimit - perMatchMessagesUsed);
    }

    if (perMatchDailyRemaining !== null && perMatchDailyRemaining <= 0) {
      return Response.json({ 
        error: "Per-match daily limit reached. Video call to unlock more messages or try tomorrow!", 
        quotaExceeded: true,
        tier: userTier,
        reason: 'per_match_limit'
      }, { status: 403 });
    }

    let deductionSource = null;
    let remainingAfter = {};

    if (firstEncounterRemaining > 0) {
      deductionSource = 'first_encounter';
      await sql`
        UPDATE match_first_encounter_messages 
        SET messages_remaining = messages_remaining - 1, updated_at = NOW()
        WHERE match_id = ${matchId} AND user_id = ${uid}
      `;
      remainingAfter.firstEncounter = firstEncounterRemaining - 1;
    } else if (dailyMessagesRemaining > 0) {
      deductionSource = 'daily_tier';
      
      await sql`
        INSERT INTO user_daily_message_counts (user_id, date, messages_sent)
        VALUES (${uid}, ${today}, 1)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET messages_sent = user_daily_message_counts.messages_sent + 1, updated_at = NOW()
      `;
      remainingAfter.dailyTier = dailyMessagesRemaining - 1;
    } else if (creditsRemaining > 0) {
      deductionSource = 'credits';
      
      await sql`
        UPDATE user_message_credits 
        SET credits_remaining = credits_remaining - 1, 
            total_spent = total_spent + 1,
            updated_at = NOW()
        WHERE user_id = ${uid}
      `;
      remainingAfter.credits = creditsRemaining - 1;
    } else {
      return Response.json({ 
        error: "No messages remaining", 
        quotaExceeded: true,
        tier: userTier
      }, { status: 403 });
    }

    if (perMatchDailyRemaining !== null) {
      await sql`
        INSERT INTO match_daily_message_counts (match_id, user_id, date, messages_sent)
        VALUES (${matchId}, ${uid}, ${today}, 1)
        ON CONFLICT (match_id, user_id, date)
        DO UPDATE SET messages_sent = match_daily_message_counts.messages_sent + 1, updated_at = NOW()
      `;
      remainingAfter.perMatchDaily = perMatchDailyRemaining - 1;
    }

    const inserted = await sql`
      INSERT INTO messages (match_id, sender_id, body)
      VALUES (${matchId}, ${uid}, ${body.trim()})
      RETURNING id, sender_id, body, created_at
    `;

    await sql`UPDATE matches SET last_chat_at = NOW() WHERE id = ${matchId}`;

    return Response.json({ 
      message: inserted?.[0] || null,
      deductedFrom: deductionSource,
      remaining: remainingAfter
    });
  } catch (err) {
    console.error("POST /api/messages/[matchId] error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

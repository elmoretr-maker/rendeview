import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { 
  getDailyMessageLimit, 
  getFirstEncounterMessageLimit, 
  getPerMatchDailyLimit 
} from "@/utils/membershipTiers";
import { containsExternalContact } from "@/utils/safetyFilters";

/**
 * Chat Safety Filter: Detects phone numbers in ANY format
 * Covers: numerals, spaced, dashed, parentheses, spelled-out, and mixed formats
 * Designed to minimize false positives while catching phone number sharing attempts
 */
function containsPhoneNumber(text) {
  const normalizedText = text.toLowerCase().trim();
  
  // Pattern 1: Standard numeric phone formats
  // Matches: (555) 123-4567, 555-123-4567, 555.123.4567, 555 123 4567, 5551234567, +1-555-123-4567
  const numericPatterns = [
    /\+?\d{1,3}?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,  // Standard formats with optional country code
    /\b\d{10,11}\b/,  // 10 or 11 consecutive digits
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,  // XXX-XXX-XXXX or similar
    /\b\d{3}[-.\s]\d{4}\b/,  // XXX-XXXX (7 digit)
  ];
  
  for (const pattern of numericPatterns) {
    if (pattern.test(normalizedText)) {
      return true;
    }
  }
  
  // Pattern 2: Spelled-out numbers and mixed formats (e.g., "five five five one two three four")
  const spelledNumbers = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'oh': '0'  // Common verbal alternative for zero
  };
  
  // Extract all number-like tokens with their positions using exec
  const numberWords = Object.keys(spelledNumbers).join('|');
  const tokenPattern = new RegExp(`\\d|\\b(?:${numberWords})\\b`, 'gi');
  
  const tokenPositions = [];
  let match;
  while ((match = tokenPattern.exec(normalizedText)) !== null) {
    tokenPositions.push({
      text: match[0],
      index: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  // Check for any consecutive window of 7+ number tokens
  // Phone numbers are 7-11 digits (local to international)
  if (tokenPositions.length >= 7) {
    // Use sliding window to find ANY 7-token sequence within 75 characters
    for (let i = 0; i <= tokenPositions.length - 7; i++) {
      const windowStart = tokenPositions[i];
      const windowEnd = tokenPositions[i + 6];  // 7th token (0-indexed)
      const span = windowEnd.endIndex - windowStart.index;
      
      // If any 7-token window spans ≤75 characters, it's likely a phone number
      // This catches consecutive phone sequences even if there are unrelated numbers earlier
      if (span <= 75) {
        return true;
      }
    }
  }
  
  // Pattern 3: Common phone number context clues with numeric sequences
  const contextPatterns = [
    /\b(?:call|text|phone|number|reach|contact)[\s:]*\d{3}/i,  // "call 555" or "text: 555"
    /\d{3}[\s-]*(?:call|text|phone)/i,  // "555 call me"
  ];
  
  for (const pattern of contextPatterns) {
    if (pattern.test(normalizedText)) {
      return true;
    }
  }
  
  return false;
}

export async function GET(request, { params: { matchId } }) {
  try {
    const uid = await getAuthenticatedUserId(request);
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

    const matchInfo = await sql`
      SELECT user_a_id, user_b_id FROM matches WHERE id = ${matchId}
    `;
    
    const otherId = matchInfo[0].user_a_id === uid ? matchInfo[0].user_b_id : matchInfo[0].user_a_id;
    
    const otherUserRows = await sql`
      SELECT id, name, primary_photo_url, membership_tier, video_call_available, immediate_available, availability_override
      FROM auth_users WHERE id = ${otherId}
    `;
    
    // Check if users have completed a video call together (for instant calling eligibility)
    const videoHistoryRows = await sql`
      SELECT id FROM video_sessions
      WHERE state = 'ended'
        AND ended_at IS NOT NULL
        AND ((caller_id = ${uid} AND callee_id = ${otherId}) OR (caller_id = ${otherId} AND callee_id = ${uid}))
      LIMIT 1
    `;
    const hasVideoHistory = videoHistoryRows.length > 0;
    
    // Get other user with photo fallback
    let otherUser = otherUserRows[0] || null;
    if (otherUser) {
      let photo = otherUser.primary_photo_url || null;
      if (!photo) {
        const media = await sql`
          SELECT url FROM profile_media 
          WHERE user_id = ${otherId} AND type = 'photo' 
          ORDER BY sort_order ASC LIMIT 1`;
        photo = media?.[0]?.url || null;
      }
      
      // Transform photo URL: /objects/... -> /api/objects/...
      if (photo && photo.startsWith('/objects/')) {
        photo = `/api${photo}`;
      }
      
      otherUser = { ...otherUser, photo, hasVideoHistory };
    }

    return Response.json({ 
      messages: rows,
      otherUser
    });
  } catch (err) {
    console.error("GET /api/messages/[matchId] error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request, { params: { matchId } }) {
  try {
    const uid = await getAuthenticatedUserId(request);
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { body } = await request.json();

    if (typeof body !== "string" || body.trim().length === 0) {
      return Response.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    if (body.length > 280) {
      return Response.json({ 
        error: "Message exceeds 280 characters. Please keep messages brief and focused on scheduling your video chat!" 
      }, { status: 400 });
    }

    // Chat Safety Filter: Block messages containing phone numbers or emails
    if (containsExternalContact(body)) {
      return Response.json({ 
        error: "For your safety, please do not share external contact info (emails or phone numbers). Keep conversations on the platform." 
      }, { status: 400 });
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
        SET messages_remaining = COALESCE(messages_remaining, 0) - 1, updated_at = NOW()
        WHERE match_id = ${matchId} AND user_id = ${uid}
      `;
      remainingAfter.firstEncounter = firstEncounterRemaining - 1;
    } else if (dailyMessagesRemaining > 0) {
      deductionSource = 'daily_tier';
      
      await sql`
        INSERT INTO user_daily_message_counts (user_id, date, messages_sent)
        VALUES (${uid}, ${today}, 1)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET messages_sent = COALESCE(user_daily_message_counts.messages_sent, 0) + 1, updated_at = NOW()
      `;
      remainingAfter.dailyTier = dailyMessagesRemaining - 1;
    } else if (creditsRemaining > 0) {
      deductionSource = 'credits';
      
      await sql`
        UPDATE user_message_credits 
        SET credits_remaining = COALESCE(credits_remaining, 0) - 1, 
            total_spent = COALESCE(total_spent, 0) + 1,
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
        DO UPDATE SET messages_sent = COALESCE(match_daily_message_counts.messages_sent, 0) + 1, updated_at = NOW()
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

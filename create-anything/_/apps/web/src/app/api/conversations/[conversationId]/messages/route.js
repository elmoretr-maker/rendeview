import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { getDailyMessageLimit } from "@/utils/membershipTiers";
import { containsExternalContact } from "@/utils/safetyFilters";

export async function GET(request, { params }) {
  try {
    const uid = await getAuthenticatedUserId(request);
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversationId = parseInt(params.conversationId);

    const participantCheck = await sql`
      SELECT conversation_id FROM conversation_participants 
      WHERE conversation_id = ${conversationId} AND user_id = ${uid}
    `;
    
    if (!participantCheck?.length) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const otherParticipantId = await sql`
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = ${conversationId} AND user_id != ${uid}
      LIMIT 1
    `;
    
    if (otherParticipantId?.length) {
      const otherId = otherParticipantId[0].user_id;
      
      const blockCheck = await sql`
        SELECT id FROM blockers 
        WHERE (blocker_id = ${uid} AND blocked_id = ${otherId})
           OR (blocker_id = ${otherId} AND blocked_id = ${uid})
        LIMIT 1
      `;
      
      if (blockCheck?.length) {
        return Response.json({ error: "This conversation is no longer available" }, { status: 403 });
      }
    }

    const rows = await sql`
      SELECT id, sender_id, body, created_at
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `;

    const otherParticipant = await sql`
      SELECT cp.user_id, u.name, u.primary_photo_url, u.membership_tier, u.video_call_available
      FROM conversation_participants cp
      INNER JOIN auth_users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ${conversationId} AND cp.user_id != ${uid}
      LIMIT 1
    `;
    
    let otherUser = otherParticipant[0] || null;
    if (otherUser) {
      let photo = otherUser.primary_photo_url || null;
      if (!photo) {
        const media = await sql`
          SELECT url FROM profile_media 
          WHERE user_id = ${otherUser.user_id} AND type = 'photo' 
          ORDER BY sort_order ASC LIMIT 1
        `;
        photo = media?.[0]?.url || null;
      }
      
      if (photo && photo.startsWith('/objects/')) {
        photo = `/api${photo}`;
      }
      
      otherUser = { 
        id: otherUser.user_id,
        name: otherUser.name,
        photo,
        membership_tier: otherUser.membership_tier,
        video_call_available: otherUser.video_call_available
      };
    }

    await sql`
      UPDATE conversation_participants
      SET last_read_at = NOW()
      WHERE conversation_id = ${conversationId} AND user_id = ${uid}
    `;

    // Get the matchId (legacy_match_id) for this conversation
    const [conversationInfo] = await sql`
      SELECT legacy_match_id FROM conversations WHERE id = ${conversationId}
    `;
    const matchId = conversationInfo?.legacy_match_id || conversationId;

    return Response.json({ 
      messages: rows,
      otherUser,
      matchId
    });
  } catch (err) {
    console.error(`GET /api/conversations/${params.conversationId}/messages error`, err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const uid = await getAuthenticatedUserId(request);
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { body } = await request.json();
    const conversationId = parseInt(params.conversationId);

    if (typeof body !== "string" || body.trim().length === 0) {
      return Response.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    if (body.length > 280) {
      return Response.json({ 
        error: "Message exceeds 280 characters. Please keep messages brief and focused on scheduling your video chat!" 
      }, { status: 400 });
    }

    if (containsExternalContact(body)) {
      return Response.json({ 
        error: "For your safety, please do not share external contact info (emails or phone numbers). Keep conversations on the platform." 
      }, { status: 400 });
    }

    const participantCheck = await sql`
      SELECT conversation_id FROM conversation_participants 
      WHERE conversation_id = ${conversationId} AND user_id = ${uid}
    `;
    
    if (!participantCheck?.length) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const otherParticipantId = await sql`
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = ${conversationId} AND user_id != ${uid}
      LIMIT 1
    `;
    
    if (otherParticipantId?.length) {
      const otherId = otherParticipantId[0].user_id;
      
      const blockCheck = await sql`
        SELECT id FROM blockers 
        WHERE (blocker_id = ${uid} AND blocked_id = ${otherId})
           OR (blocker_id = ${otherId} AND blocked_id = ${uid})
        LIMIT 1
      `;
      
      if (blockCheck?.length) {
        return Response.json({ error: "Cannot send messages to this user" }, { status: 403 });
      }
    }

    const userRows = await sql`SELECT membership_tier FROM auth_users WHERE id = ${uid}`;
    const userTier = userRows?.[0]?.membership_tier || 'free';
    const today = new Date().toISOString().split('T')[0];

    // PROGRESSIVE VIDEO UNLOCK ENFORCEMENT
    // Get or create conversation metadata
    let [metadata] = await sql`
      SELECT started_at, first_video_call_at, last_video_call_at, video_call_count
      FROM conversation_metadata
      WHERE conversation_id = ${conversationId}
    `;

    if (!metadata) {
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
    const daysSinceStart = metadata 
      ? (Date.now() - new Date(metadata.started_at).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    const isDecay = !hasCompletedVideo && daysSinceStart >= 3;

    // Get today's conversation-specific messages
    const [dailyConvMessages] = await sql`
      SELECT messages_sent FROM conversation_daily_messages
      WHERE conversation_id = ${conversationId} AND user_id = ${uid} AND date = ${today}
    `;
    let conversationMessagesToday = dailyConvMessages?.messages_sent || 0;

    // Determine allowed messages based on state
    let messagesAllowed;
    if (isDecay) {
      messagesAllowed = 2; // Decay mode: 2 messages/day
    } else if (hasCompletedVideo) {
      // Post-video: 10 + tier bonus (Free:0, Casual:+25, Dating:+50, Business:+100)
      const tierLimits = { free: 0, casual: 25, dating: 50, business: 100 };
      const bonus = tierLimits[userTier.toLowerCase()] || 0;
      messagesAllowed = 10 + bonus;
    } else {
      messagesAllowed = 10; // Pre-video: 10 messages/day
    }

    // Capture timestamp before transaction for deterministic query
    const insertTimestamp = new Date().toISOString();
    
    // Check if conversation quota exceeded and we need to use credits
    const needsCredit = conversationMessagesToday >= messagesAllowed;
    
    if (needsCredit) {
      // Try to atomically decrement credit (prevents negative balance with WHERE clause)
      const creditDecrement = await sql`
        UPDATE user_message_credits
        SET credits_remaining = COALESCE(credits_remaining, 0) - 1,
            total_spent = COALESCE(total_spent, 0) + 1,
            updated_at = NOW()
        WHERE user_id = ${uid} 
          AND credits_remaining > 0
        RETURNING credits_remaining
      `;

      // If UPDATE didn't affect any rows, user has no credits
      if (!creditDecrement || creditDecrement.length === 0) {
        let errorMessage, reason;
        if (isDecay) {
          errorMessage = "You've reached the 2 messages/day limit with this person. Schedule a video call to unlock more messages!";
          reason = 'decay_limit';
        } else if (hasCompletedVideo) {
          errorMessage = "Daily message limit reached with this person. Purchase credits or wait until tomorrow!";
          reason = 'daily_limit';
        } else {
          errorMessage = "You've sent 10 messages to this person today. Complete a video call to unlock more messages!";
          reason = 'pre_video_limit';
        }

        return Response.json({ 
          error: errorMessage,
          quotaExceeded: true,
          tier: userTier,
          reason,
          conversationMessagesToday,
          messagesAllowed,
          isDecay,
          hasCompletedVideo
        }, { status: 429 });
      }
    }

    // Build transaction queries for message insertion and tracking
    // Credit already decremented above if needed (with concurrency protection)
    const transactionQueries = [
      // Insert the actual message
      sql`
        INSERT INTO messages (conversation_id, sender_id, body, created_at)
        VALUES (${conversationId}, ${uid}, ${body}, ${insertTimestamp})
      `,
      // Track conversation-specific message count
      sql`
        INSERT INTO conversation_daily_messages (conversation_id, user_id, messages_sent, date)
        VALUES (${conversationId}, ${uid}, 1, ${today})
        ON CONFLICT (conversation_id, user_id, date) DO UPDATE SET
          messages_sent = COALESCE(conversation_daily_messages.messages_sent, 0) + 1,
          updated_at = NOW()
      `,
      // Also track in legacy system for backward compatibility
      sql`
        INSERT INTO user_daily_message_counts (user_id, messages_sent, date)
        VALUES (${uid}, 1, ${today})
        ON CONFLICT (user_id, date) DO UPDATE SET
          messages_sent = COALESCE(user_daily_message_counts.messages_sent, 0) + 1,
          updated_at = NOW()
      `,
      // Update conversation timestamp
      sql`
        UPDATE conversations
        SET updated_at = NOW(), last_message_at = NOW()
        WHERE id = ${conversationId}
      `
    ];

    // Execute message insertion and tracking atomically (credit already handled)
    await sql.transaction(transactionQueries);

    // Query for the created message using multiple filters for determinism
    // Race condition risk is minimal (same user, same conv, same timestamp, same body)
    const messageRow = await sql`
      SELECT id, sender_id, body, created_at
      FROM messages
      WHERE conversation_id = ${conversationId} 
        AND sender_id = ${uid}
        AND body = ${body}
        AND created_at = ${insertTimestamp}
      LIMIT 1
    `;

    return Response.json({ message: messageRow[0] }, { status: 201 });
  } catch (err) {
    console.error(`POST /api/conversations/${params.conversationId}/messages error`, err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

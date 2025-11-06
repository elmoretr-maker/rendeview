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

    return Response.json({ 
      messages: rows,
      otherUser
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

    const userRows = await sql`SELECT membership_tier FROM auth_users WHERE id = ${uid}`;
    const userTier = userRows?.[0]?.membership_tier || 'free';
    const today = new Date().toISOString().split('T')[0];

    const dailyLimit = getDailyMessageLimit(userTier);
    const dailyCountRows = await sql`
      SELECT messages_sent FROM user_daily_message_counts 
      WHERE user_id = ${uid} AND date = ${today}
    `;
    let dailyMessagesUsed = dailyCountRows?.[0]?.messages_sent || 0;

    if (dailyMessagesUsed >= dailyLimit) {
      const creditRows = await sql`SELECT credits_remaining FROM user_message_credits WHERE user_id = ${uid}`;
      let creditsRemaining = creditRows?.[0]?.credits_remaining || 0;

      if (creditsRemaining <= 0) {
        return Response.json({ 
          error: "Daily message limit reached. Purchase credits or upgrade your membership!", 
          quotaExceeded: true,
          tier: userTier,
          reason: 'daily_limit'
        }, { status: 429 });
      }

      await sql`
        UPDATE user_message_credits
        SET credits_remaining = credits_remaining - 1,
            total_spent = total_spent + 1,
            updated_at = NOW()
        WHERE user_id = ${uid}
      `;
    } else {
      if (!dailyCountRows?.length) {
        await sql`
          INSERT INTO user_daily_message_counts (user_id, messages_sent, date)
          VALUES (${uid}, 1, ${today})
        `;
      } else {
        await sql`
          UPDATE user_daily_message_counts
          SET messages_sent = messages_sent + 1,
              updated_at = NOW()
          WHERE user_id = ${uid} AND date = ${today}
        `;
      }
    }

    const messageRow = await sql`
      INSERT INTO messages (conversation_id, sender_id, body, created_at)
      VALUES (${conversationId}, ${uid}, ${body}, NOW())
      RETURNING id, sender_id, body, created_at
    `;

    await sql`
      UPDATE conversations
      SET updated_at = NOW(), last_message_at = NOW()
      WHERE id = ${conversationId}
    `;

    return Response.json({ message: messageRow[0] }, { status: 201 });
  } catch (err) {
    console.error(`POST /api/conversations/${params.conversationId}/messages error`, err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

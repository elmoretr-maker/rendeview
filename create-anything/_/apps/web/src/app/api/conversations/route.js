import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const currentUserId = parseInt(session.user.id);

  try {
    const conversations = await sql`
      SELECT DISTINCT ON (c.id)
        c.id as conversation_id,
        c.created_at,
        c.updated_at,
        c.last_message_at,
        other_user.id as other_user_id,
        other_user.name as other_user_name,
        other_user.primary_photo_url as other_user_photo,
        m.body as last_message_body,
        m.sender_id as last_message_sender_id,
        m.created_at as last_message_at,
        COALESCE(
          (
            SELECT COUNT(*)
            FROM messages msg
            WHERE msg.conversation_id = c.id
              AND msg.sender_id != ${currentUserId}
              AND msg.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
          ),
          0
        ) as unread_count
      FROM conversations c
      INNER JOIN conversation_participants cp 
        ON c.id = cp.conversation_id AND cp.user_id = ${currentUserId}
      INNER JOIN conversation_participants other_cp 
        ON c.id = other_cp.conversation_id AND other_cp.user_id != ${currentUserId}
      INNER JOIN auth_users other_user 
        ON other_cp.user_id = other_user.id
      LEFT JOIN LATERAL (
        SELECT body, sender_id, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      LEFT JOIN blockers block_by_me 
        ON block_by_me.blocker_id = ${currentUserId} AND block_by_me.blocked_id = other_user.id
      LEFT JOIN blockers block_by_them 
        ON block_by_them.blocker_id = other_user.id AND block_by_them.blocked_id = ${currentUserId}
      WHERE block_by_me.id IS NULL AND block_by_them.id IS NULL
      ORDER BY c.id, COALESCE(c.last_message_at, c.created_at) DESC
    `;

    return new Response(
      JSON.stringify({ conversations: conversations || [] }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[/api/conversations] Error fetching conversations:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch conversations" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

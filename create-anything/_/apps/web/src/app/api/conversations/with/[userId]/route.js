import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const currentUserId = parseInt(session.user.id);
  const targetUserId = parseInt(params.userId);

  if (currentUserId === targetUserId) {
    return new Response(JSON.stringify({ error: "Cannot create conversation with yourself" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const existingConversation = await sql`
      SELECT c.id as conversation_id
      FROM conversations c
      INNER JOIN conversation_participants cp1 
        ON c.id = cp1.conversation_id AND cp1.user_id = ${currentUserId}
      INNER JOIN conversation_participants cp2 
        ON c.id = cp2.conversation_id AND cp2.user_id = ${targetUserId}
      LIMIT 1
    `;

    if (existingConversation && existingConversation.length > 0) {
      return new Response(
        JSON.stringify({ 
          conversation_id: existingConversation[0].conversation_id,
          created: false 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const newConversation = await sql`
      INSERT INTO conversations (created_at, updated_at)
      VALUES (NOW(), NOW())
      RETURNING id as conversation_id
    `;

    const conversationId = newConversation[0].conversation_id;

    await sql`
      INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
      VALUES 
        (${conversationId}, ${currentUserId}, NOW()),
        (${conversationId}, ${targetUserId}, NOW())
    `;

    return new Response(
      JSON.stringify({ 
        conversation_id: conversationId,
        created: true 
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[/api/conversations/with/${params.userId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: "Failed to get or create conversation" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

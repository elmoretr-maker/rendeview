import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

/**
 * GET /api/notes?targetUserId=123
 * Fetch the current user's private note about a target user
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("targetUserId");

    if (!targetUserId) {
      return Response.json({ error: "targetUserId is required" }, { status: 400 });
    }

    // Fetch the note if it exists
    const [note] = await sql`
      SELECT id, target_user_id, note_content, created_at, updated_at
      FROM user_notes
      WHERE user_id = ${session.user.id} AND target_user_id = ${targetUserId}
    `;

    return Response.json({ 
      note: note || null 
    });
  } catch (err) {
    console.error("GET /api/notes error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/notes
 * Save or update a private note about a target user
 * Body: { targetUserId: number, noteContent: string }
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetUserId, noteContent } = await request.json();

    if (!targetUserId) {
      return Response.json({ error: "targetUserId is required" }, { status: 400 });
    }

    // Allow empty notes (for deletion/clearing)
    const trimmedContent = (noteContent || "").toString().trim();

    // Verify target user exists
    const [targetUser] = await sql`
      SELECT id FROM auth_users WHERE id = ${targetUserId}
    `;

    if (!targetUser) {
      return Response.json({ error: "Target user not found" }, { status: 404 });
    }

    // Upsert the note (insert or update if exists)
    const [note] = await sql`
      INSERT INTO user_notes (user_id, target_user_id, note_content, updated_at)
      VALUES (${session.user.id}, ${targetUserId}, ${trimmedContent}, now())
      ON CONFLICT (user_id, target_user_id)
      DO UPDATE SET 
        note_content = ${trimmedContent},
        updated_at = now()
      RETURNING id, target_user_id, note_content, created_at, updated_at
    `;

    return Response.json({ 
      note,
      success: true 
    });
  } catch (err) {
    console.error("POST /api/notes error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

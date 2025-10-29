import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request, { params: { matchId } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure the user is part of the match
    const uid = session.user.id;
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
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;
    const { body } = await request.json();

    if (typeof body !== "string" || body.trim().length === 0 || body.length > 50) {
      return Response.json({ error: "Message must be 1-50 characters" }, { status: 400 });
    }

    // Ensure the user is part of the match
    const matchRows = await sql`SELECT id FROM matches WHERE id = ${matchId} AND (user_a_id = ${uid} OR user_b_id = ${uid})`;
    if (!matchRows?.length) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const inserted = await sql`
      INSERT INTO messages (match_id, sender_id, body)
      VALUES (${matchId}, ${uid}, ${body.trim()})
      RETURNING id, sender_id, body, created_at`;

    await sql`UPDATE matches SET last_chat_at = now() WHERE id = ${matchId}`;

    return Response.json({ message: inserted?.[0] || null });
  } catch (err) {
    console.error("POST /api/messages/[matchId] error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

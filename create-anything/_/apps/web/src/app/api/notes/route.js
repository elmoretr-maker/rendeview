import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// GET /api/notes?targetId=123 -> returns the caller's private note about target
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;
    const { searchParams } = new URL(request.url);
    const targetIdParam = searchParams.get("targetId");
    const targetId = targetIdParam ? Number(targetIdParam) : null;
    if (!targetId) {
      return Response.json({ error: "targetId required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, author_id, target_id, note, created_at, updated_at
      FROM user_notes
      WHERE author_id = ${uid} AND target_id = ${targetId}
      LIMIT 1`;

    return Response.json({ note: rows?.[0] || null });
  } catch (err) {
    console.error("GET /api/notes error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST { targetId, note } -> upsert caller's private note about target
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;
    const { targetId, note } = await request.json();
    const trimmed = (note || "").toString().trim();
    if (!targetId || trimmed.length === 0) {
      return Response.json({ error: "targetId and note required" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO user_notes (author_id, target_id, note)
      VALUES (${uid}, ${targetId}, ${trimmed})
      ON CONFLICT (author_id, target_id)
      DO UPDATE SET note = EXCLUDED.note, updated_at = now()
      RETURNING id, author_id, target_id, note, created_at, updated_at`;

    return Response.json({ note: rows?.[0] || null });
  } catch (err) {
    console.error("POST /api/notes error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;

    const rows = await sql`
      SELECT b.id, b.blocked_id, u.name, u.image, b.created_at, b.notes
      FROM blockers b
      JOIN auth_users u ON u.id = b.blocked_id
      WHERE b.blocker_id = ${uid}
      ORDER BY b.created_at DESC`;

    return Response.json({ blockers: rows });
  } catch (err) {
    console.error("GET /api/blockers error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;
    const { blockedId } = await request.json();
    if (!blockedId || blockedId === uid) {
      return Response.json({ error: "Invalid user" }, { status: 400 });
    }

    await sql`
      INSERT INTO blockers (blocker_id, blocked_id)
      VALUES (${uid}, ${blockedId})
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING`;

    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/blockers error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;
    const { blockedId, notes } = await request.json();
    if (!blockedId) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    await sql`
      UPDATE blockers 
      SET notes = ${notes || null}
      WHERE blocker_id = ${uid} AND blocked_id = ${blockedId}`;

    return Response.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/blockers error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;
    const { blockedId } = await request.json();
    if (!blockedId) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    await sql`DELETE FROM blockers WHERE blocker_id = ${uid} AND blocked_id = ${blockedId}`;

    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/blockers error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

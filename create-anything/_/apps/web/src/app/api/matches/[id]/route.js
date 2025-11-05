import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request, { params: { id } }) {
  try {
    // Validate that id is numeric - reject static routes like "list", "all", etc.
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;

    const rows = await sql`
      SELECT id, user_a_id, user_b_id FROM matches
      WHERE id = ${numericId} AND (user_a_id = ${uid} OR user_b_id = ${uid})`;
    if (!rows?.length) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const m = rows[0];
    const other_id = m.user_a_id === uid ? m.user_b_id : m.user_a_id;
    const [user] = await sql`SELECT id, name, image FROM auth_users WHERE id = ${other_id}`;
    return Response.json({ match: { id: m.id, other_id, user } });
  } catch (err) {
    console.error("GET /api/matches/[id] error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

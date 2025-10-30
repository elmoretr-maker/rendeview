import { neon } from "@neondatabase/serverless";
import { getUser } from "../utils/auth";

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = user.id;
    const sql = neon(process.env.DATABASE_URL);
    const { matchId } = await request.json();

    if (!matchId) {
      return Response.json({ error: "matchId required" }, { status: 400 });
    }

    const [match] = await sql`
      SELECT id, user_a_id, user_b_id
      FROM matches
      WHERE id = ${matchId} AND (user_a_id = ${uid} OR user_b_id = ${uid})`;

    if (!match) {
      return Response.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.user_a_id === uid) {
      await sql`
        UPDATE matches
        SET viewed_by_user_a = true
        WHERE id = ${matchId}`;
    } else {
      await sql`
        UPDATE matches
        SET viewed_by_user_b = true
        WHERE id = ${matchId}`;
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[/api/matches/mark-viewed] error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

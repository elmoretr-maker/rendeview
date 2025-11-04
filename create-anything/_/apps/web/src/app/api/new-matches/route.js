import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../utils/auth";

export async function GET(request) {
  try {
    const uid = await getAuthenticatedUserId(request);
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT m.id as match_id,
             CASE WHEN m.user_a_id = ${uid} THEN m.user_b_id ELSE m.user_a_id END AS other_id,
             m.created_at, m.last_chat_at,
             m.viewed_by_user_a, m.viewed_by_user_b
      FROM matches m
      WHERE (m.user_a_id = ${uid} OR m.user_b_id = ${uid})
        AND (
          (m.user_a_id = ${uid} AND m.viewed_by_user_a = false)
          OR
          (m.user_b_id = ${uid} AND m.viewed_by_user_b = false)
        )
      ORDER BY m.created_at DESC`;

    const matchesWithUsers = await Promise.all(
      rows.map(async (row) => {
        const [u] = await sql`
          SELECT id, name, primary_photo_url as photo
          FROM auth_users
          WHERE id = ${row.other_id}`;
        return {
          match_id: row.match_id,
          user: u || { id: row.other_id, name: null, photo: null },
          created_at: row.created_at,
          last_chat_at: row.last_chat_at,
        };
      })
    );

    return Response.json({ matches: matchesWithUsers });
  } catch (error) {
    console.error("[/api/matches/new] error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

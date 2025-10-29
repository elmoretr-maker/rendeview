import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;

    // Filter past sessions at the database level to exclude blocked users
    const rows = await sql(
      `
      SELECT vs.*, m.user_a_id, m.user_b_id
      FROM video_sessions vs
      JOIN matches m ON m.id = vs.match_id
      WHERE (m.user_a_id = $1 OR m.user_b_id = $1)
        AND NOT EXISTS (
          SELECT 1 FROM blockers b
          WHERE (
            b.blocker_id = $1
            AND b.blocked_id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
          )
          OR (
            b.blocked_id = $1
            AND b.blocker_id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
          )
        )
      ORDER BY vs.started_at DESC NULLS LAST
      `,
      [uid],
    );

    return Response.json({ sessions: rows });
  } catch (err) {
    console.error("GET /api/video/sessions/past error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

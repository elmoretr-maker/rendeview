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
      SELECT l.liker_id AS user_id, l.created_at
      FROM likes l
      WHERE l.liked_id = ${uid}
      ORDER BY l.created_at DESC
      LIMIT 50`;

    const likers = [];
    for (const r of rows) {
      const [u] = await sql`SELECT id, name, image, immediate_available FROM auth_users WHERE id = ${r.user_id}`;
      const [pm] = await sql`SELECT url FROM profile_media WHERE user_id = ${r.user_id} AND type = 'photo' ORDER BY sort_order ASC LIMIT 1`;
      likers.push({ user: { ...u, photo: pm?.url || null }, liked_at: r.created_at });
    }

    return Response.json({ likers });
  } catch (err) {
    console.error("GET /api/matches/likers error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

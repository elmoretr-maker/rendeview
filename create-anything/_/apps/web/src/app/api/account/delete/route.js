import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;

    // Delete user-related data in a transaction
    await sql.transaction([
      sql`DELETE FROM messages WHERE match_id IN (SELECT id FROM matches WHERE user_a_id = ${uid} OR user_b_id = ${uid})`,
      sql`DELETE FROM video_sessions WHERE caller_id = ${uid} OR callee_id = ${uid}`,
      sql`DELETE FROM schedule_proposals WHERE proposer_id = ${uid} OR match_id IN (SELECT id FROM matches WHERE user_a_id = ${uid} OR user_b_id = ${uid})`,
      sql`DELETE FROM matches WHERE user_a_id = ${uid} OR user_b_id = ${uid}`,
      sql`DELETE FROM likes WHERE liker_id = ${uid} OR liked_id = ${uid}`,
      sql`DELETE FROM blockers WHERE blocker_id = ${uid} OR blocked_id = ${uid}`,
      sql`DELETE FROM profile_media WHERE user_id = ${uid}`,
    ]);

    // Finally delete auth user (this will cascade sessions/accounts)
    await sql`DELETE FROM auth_users WHERE id = ${uid}`;

    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/account/delete error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

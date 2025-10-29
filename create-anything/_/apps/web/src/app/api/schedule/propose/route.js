import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const uid = session.user.id;
    const { matchId, start, end } = await request.json();
    if (!matchId || !start || !end)
      return Response.json({ error: "Invalid request" }, { status: 400 });

    // Membership restriction: casual tier cannot schedule video chats
    const [me] =
      await sql`SELECT membership_tier FROM auth_users WHERE id = ${uid}`;
    const tier = (me?.membership_tier || "casual").toLowerCase();
    if (tier === "casual") {
      return Response.json(
        {
          error:
            "Upgrade to Active User to unlock video chat and start connecting!",
        },
        { status: 403 },
      );
    }

    // ensure match belongs to user
    const match =
      await sql`SELECT id FROM matches WHERE id = ${matchId} AND (user_a_id = ${uid} OR user_b_id = ${uid})`;
    if (!match?.length)
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const [row] = await sql`
      INSERT INTO schedule_proposals (match_id, proposer_id, proposed_start, proposed_end)
      VALUES (${matchId}, ${uid}, ${start}, ${end})
      RETURNING id, match_id, proposer_id, proposed_start, proposed_end, status, created_at`;
    return Response.json({ proposal: row });
  } catch (err) {
    console.error("POST /api/schedule/propose error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

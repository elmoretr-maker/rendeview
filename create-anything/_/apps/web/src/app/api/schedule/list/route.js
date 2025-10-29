import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;

    // Get all schedule proposals for matches where user is involved
    const rows = await sql`
      SELECT sp.*, 
             m.user_a_id, m.user_b_id,
             proposer.name as proposer_name, proposer.image as proposer_image,
             receiver.name as receiver_name, receiver.image as receiver_image
      FROM schedule_proposals sp
      JOIN matches m ON m.id = sp.match_id
      LEFT JOIN auth_users proposer ON proposer.id = sp.proposer_id
      LEFT JOIN auth_users receiver ON receiver.id = CASE 
        WHEN m.user_a_id = sp.proposer_id THEN m.user_b_id 
        ELSE m.user_a_id 
      END
      WHERE (m.user_a_id = ${uid} OR m.user_b_id = ${uid})
      ORDER BY sp.created_at DESC`;

    const proposals = rows.map((r) => ({
      id: r.id,
      match_id: r.match_id,
      proposer_id: r.proposer_id,
      proposed_start: r.proposed_start,
      proposed_end: r.proposed_end,
      status: r.status,
      substitute_note: r.substitute_note,
      created_at: r.created_at,
      is_proposer: r.proposer_id === uid,
      other_user: {
        id: r.proposer_id === uid ? 
          (r.user_a_id === uid ? r.user_b_id : r.user_a_id) : 
          r.proposer_id,
        name: r.proposer_id === uid ? r.receiver_name : r.proposer_name,
        image: r.proposer_id === uid ? r.receiver_image : r.proposer_image,
      },
    }));

    return Response.json({ proposals });
  } catch (err) {
    console.error("GET /api/schedule/list error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

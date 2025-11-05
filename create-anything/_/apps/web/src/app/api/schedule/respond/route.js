import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const uid = session.user.id;
    const { proposalId, action, counterDateTime } = await request.json();
    if (!proposalId || !action) return Response.json({ error: "Invalid request" }, { status: 400 });

    const proposals = await sql`SELECT sp.*, m.user_a_id, m.user_b_id FROM schedule_proposals sp JOIN matches m ON m.id = sp.match_id WHERE sp.id = ${proposalId}`;
    const p = proposals?.[0];
    if (!p) return Response.json({ error: "Not found" }, { status: 404 });
    const otherId = p.user_a_id === uid ? p.user_b_id : p.user_a_id;
    if (p.proposer_id === uid) return Response.json({ error: "Cannot respond to your own proposal" }, { status: 400 });

    let newStatus = null;
    if (action === "accept") newStatus = "accepted";
    if (action === "decline") newStatus = "declined";
    if (action === "substitute") newStatus = "substituted";
    if (!newStatus) return Response.json({ error: "Invalid action" }, { status: 400 });

    // For counter-proposals, decline the original and create a new proposal
    if (action === "substitute" && counterDateTime?.start && counterDateTime?.end) {
      // Decline the original proposal
      await sql`
        UPDATE schedule_proposals
        SET status = 'declined'
        WHERE id = ${proposalId}`;

      // Create new counter-proposal from the responder
      const [newProposal] = await sql`
        INSERT INTO schedule_proposals (match_id, proposer_id, proposed_start, proposed_end, status)
        VALUES (${p.match_id}, ${uid}, ${counterDateTime.start}, ${counterDateTime.end}, 'pending')
        RETURNING id, match_id, proposer_id, proposed_start, proposed_end, status, created_at`;

      return Response.json({ 
        proposal: newProposal,
        message: "Counter-proposal sent successfully"
      });
    }

    // For accept/decline, just update the original proposal
    const [row] = await sql`
      UPDATE schedule_proposals
      SET status = ${newStatus}
      WHERE id = ${proposalId}
      RETURNING id, match_id, proposer_id, proposed_start, proposed_end, status, created_at`;

    return Response.json({ proposal: row });
  } catch (err) {
    console.error("POST /api/schedule/respond error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";

export async function GET(req) {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Auto-expire old invitations first
    await sql`
      UPDATE call_invitations
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at < NOW()
    `;

    // Get pending INCOMING invitation for this user (callee)
    const [incomingInvitation] = await sql`
      SELECT 
        ci.id,
        ci.caller_id,
        ci.callee_id,
        ci.match_id,
        ci.status,
        ci.created_at,
        ci.expires_at,
        u.name as caller_name,
        u.photo as caller_photo
      FROM call_invitations ci
      JOIN auth_users u ON u.id = ci.caller_id
      WHERE ci.callee_id = ${userId}
        AND ci.status = 'pending'
        AND ci.expires_at > NOW()
      ORDER BY ci.created_at DESC
      LIMIT 1
    `;

    // Get OUTGOING invitation status (caller checking if accepted)
    const [outgoingInvitation] = await sql`
      SELECT 
        ci.id,
        ci.caller_id,
        ci.callee_id,
        ci.match_id,
        ci.status,
        ci.room_url,
        ci.responded_at,
        ci.decline_reason,
        u.name as callee_name
      FROM call_invitations ci
      JOIN auth_users u ON u.id = ci.callee_id
      WHERE ci.caller_id = ${userId}
        AND ci.status IN ('accepted', 'declined')
        AND ci.responded_at > NOW() - INTERVAL '30 seconds'
      ORDER BY ci.responded_at DESC
      LIMIT 1
    `;

    if (incomingInvitation) {
      // Calculate time remaining for incoming call
      const expiresAt = new Date(incomingInvitation.expires_at);
      const now = new Date();
      const secondsRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

      return Response.json({
        incomingInvitation: {
          ...incomingInvitation,
          secondsRemaining,
        },
        outgoingInvitation: null,
      });
    }

    if (outgoingInvitation) {
      return Response.json({
        incomingInvitation: null,
        outgoingInvitation: {
          ...outgoingInvitation,
        },
      });
    }

    return Response.json({ 
      incomingInvitation: null,
      outgoingInvitation: null 
    });
  } catch (error) {
    console.error("[VIDEO INVITATION POLL]", error);
    return Response.json(
      { error: "Failed to poll invitations" },
      { status: 500 }
    );
  }
}

import sql from "@/app/api/utils/sql";

export async function POST(req, { params }) {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationId } = await params;
    const userId = session.user.id;

    // Cancel invitation (only caller can cancel)
    const [updated] = await sql`
      UPDATE call_invitations
      SET status = 'cancelled'
      WHERE id = ${invitationId}
        AND caller_id = ${userId}
        AND status = 'pending'
      RETURNING id
    `;

    if (!updated) {
      return Response.json(
        { error: "Invitation not found or cannot be cancelled" },
        { status: 404 }
      );
    }

    return Response.json({ message: "Invitation cancelled" });
  } catch (error) {
    console.error("[VIDEO INVITATION CANCEL]", error);
    return Response.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}

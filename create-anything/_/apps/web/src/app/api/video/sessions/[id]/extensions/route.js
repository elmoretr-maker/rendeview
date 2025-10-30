import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

const EXTENSION_COST_CENTS = 800;
const EXTENSION_SECONDS = 600;
const REQUEST_EXPIRY_SECONDS = 60;

export async function POST(request, context) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = context.params.id;
    if (!sessionId) {
      return Response.json({ error: "Session ID required" }, { status: 400 });
    }

    const userId = Number(session.user.id);

    const [videoSession] = await sql`
      SELECT 
        vs.*,
        m.user_a_id,
        m.user_b_id
      FROM video_sessions vs
      JOIN matches m ON m.id = vs.match_id
      WHERE vs.id = ${sessionId}
    `;

    if (!videoSession) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const isParticipant =
      userId === Number(videoSession.user_a_id) ||
      userId === Number(videoSession.user_b_id);

    if (!isParticipant) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (videoSession.state === "ended") {
      return Response.json(
        { error: "Session has ended" },
        { status: 400 }
      );
    }

    const otherUserId =
      userId === Number(videoSession.user_a_id)
        ? Number(videoSession.user_b_id)
        : Number(videoSession.user_a_id);

    const [existing] = await sql`
      SELECT id
      FROM video_session_extensions
      WHERE video_session_id = ${sessionId}
        AND status IN ('pending_acceptance', 'awaiting_payment', 'payment_processing')
        AND (expires_at IS NULL OR expires_at > NOW())
    `;

    if (existing) {
      return Response.json(
        { error: "An extension request is already pending" },
        { status: 409 }
      );
    }

    const expiresAt = new Date(Date.now() + REQUEST_EXPIRY_SECONDS * 1000);

    const [newExtension] = await sql`
      INSERT INTO video_session_extensions (
        video_session_id,
        initiator_id,
        responder_id,
        status,
        amount_cents,
        extension_seconds,
        expires_at
      ) VALUES (
        ${sessionId},
        ${userId},
        ${otherUserId},
        'pending_acceptance',
        ${EXTENSION_COST_CENTS},
        ${EXTENSION_SECONDS},
        ${expiresAt.toISOString()}
      ) RETURNING *
    `;

    return Response.json(
      {
        extension: {
          id: newExtension.id,
          initiatorId: newExtension.initiator_id,
          responderId: newExtension.responder_id,
          status: newExtension.status,
          amountCents: newExtension.amount_cents,
          extensionSeconds: newExtension.extension_seconds,
          expiresAt: newExtension.expires_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("/api/video/sessions/[id]/extensions POST error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

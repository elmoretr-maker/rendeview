import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request, context) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = context.params.id;
    if (!sessionId) {
      return Response.json({ error: "Session ID required" }, { status: 400 });
    }

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

    const userId = Number(session.user.id);
    const isParticipant =
      userId === Number(videoSession.user_a_id) ||
      userId === Number(videoSession.user_b_id);

    if (!isParticipant) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const otherUserId =
      userId === Number(videoSession.user_a_id)
        ? Number(videoSession.user_b_id)
        : Number(videoSession.user_a_id);

    const extensions = await sql`
      SELECT *
      FROM video_session_extensions
      WHERE video_session_id = ${sessionId}
        AND status IN ('pending_acceptance', 'awaiting_payment', 'payment_processing')
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
    `;

    const baseDuration = videoSession.base_duration_seconds || 0;
    const extendedSeconds = videoSession.extended_seconds_total || 0;
    const totalDuration = baseDuration + extendedSeconds;

    let remainingSeconds = 0;
    let endsAt = null;

    if (videoSession.started_at) {
      const startTime = new Date(videoSession.started_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      remainingSeconds = Math.max(0, totalDuration - elapsed);
      endsAt = new Date(startTime + totalDuration * 1000).toISOString();
    }

    const isInGracePeriod =
      videoSession.state === "grace_period" &&
      videoSession.grace_expires_at &&
      new Date(videoSession.grace_expires_at) > new Date();

    return Response.json({
      session: {
        id: videoSession.id,
        matchId: videoSession.match_id,
        state: videoSession.state,
        baseDurationSeconds: baseDuration,
        extendedSecondsTotal: extendedSeconds,
        totalDurationSeconds: totalDuration,
        remainingSeconds,
        startedAt: videoSession.started_at,
        endsAt,
        graceExpiresAt: videoSession.grace_expires_at,
        isInGracePeriod,
      },
      pendingExtensions: extensions.map((ext) => ({
        id: ext.id,
        initiatorId: ext.initiator_id,
        responderId: ext.responder_id,
        status: ext.status,
        amountCents: ext.amount_cents,
        extensionSeconds: ext.extension_seconds,
        expiresAt: ext.expires_at,
        createdAt: ext.created_at,
        isInitiator: ext.initiator_id === userId,
        isResponder: ext.responder_id === userId,
      })),
      otherUserId,
    });
  } catch (err) {
    console.error("/api/video/sessions/[id] error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = context.params.id;
    if (!sessionId) {
      return Response.json({ error: "Session ID required" }, { status: 400 });
    }

    const { state } = await request.json();
    if (!state) {
      return Response.json({ error: "State required" }, { status: 400 });
    }

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

    const userId = Number(session.user.id);
    const isParticipant =
      userId === Number(videoSession.user_a_id) ||
      userId === Number(videoSession.user_b_id);

    if (!isParticipant) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await sql`
      UPDATE video_sessions 
      SET state = ${state}, 
          ended_at = CASE WHEN ${state} = 'ended' THEN NOW() ELSE ended_at END
      WHERE id = ${sessionId}
    `;

    return Response.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/video/sessions/[id] error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

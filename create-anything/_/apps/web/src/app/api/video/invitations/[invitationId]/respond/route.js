import { sql } from "@/server/storage.ts";

export async function POST(req, { params }) {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationId } = await params;
    const { action, declineReason } = await req.json();

    if (!["accept", "decline"].includes(action)) {
      return Response.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Get invitation details
    const [invitation] = await sql`
      SELECT * FROM call_invitations
      WHERE id = ${invitationId}
        AND callee_id = ${userId}
        AND status = 'pending'
    `;

    if (!invitation) {
      return Response.json(
        { error: "Invitation not found or already responded" },
        { status: 404 }
      );
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      await sql`
        UPDATE call_invitations
        SET status = 'expired'
        WHERE id = ${invitationId}
      `;
      return Response.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    if (action === "accept") {
      // Create video room directly (don't rely on internal fetch)
      const matchId = invitation.match_id;
      
      // Import room creation logic directly
      const apiKey = process.env.DAILY_API_KEY;
      if (!apiKey) {
        return Response.json({ error: "Daily API key not configured" }, { status: 500 });
      }

      // Get caller and callee details for session creation
      const callerId = invitation.caller_id;
      const calleeId = invitation.callee_id;
      const me = calleeId; // Current user is the callee

      // Get tier limits
      const [callerUser] = await sql`SELECT membership_tier FROM auth_users WHERE id = ${callerId}`;
      const [calleeUser] = await sql`SELECT membership_tier FROM auth_users WHERE id = ${calleeId}`;
      
      const callerTier = (callerUser?.membership_tier || "free").toLowerCase();
      const calleeTier = (calleeUser?.membership_tier || "free").toLowerCase();
      
      const getTierLimits = (tier) => {
        const limits = {
          free: { chatMinutes: 5 },
          casual: { chatMinutes: 15 },
          dating: { chatMinutes: 25 },
          business: { chatMinutes: 45 }
        };
        return limits[tier] || limits.free;
      };

      const callerLimits = getTierLimits(callerTier);
      const calleeLimits = getTierLimits(calleeTier);
      const baseDurationSeconds = Math.min(callerLimits.chatMinutes, calleeLimits.chatMinutes) * 60;

      // Create video session
      const insertRows = await sql`
        INSERT INTO video_sessions (match_id, caller_id, callee_id, started_at, second_date, base_duration_seconds, state)
        VALUES (${matchId}, ${callerId}, ${calleeId}, NOW(), false, ${baseDurationSeconds}, 'active')
        RETURNING id
      `;
      const vidSessionId = insertRows?.[0]?.id;

      if (!vidSessionId) {
        return Response.json({ error: "Could not create session" }, { status: 500 });
      }

      // Create Daily room
      const roomName = `rv-${matchId}-${Date.now()}`;
      const createRes = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "private",
          properties: {
            enable_screenshare: true,
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
          },
        }),
      });

      if (!createRes.ok) {
        const t = await createRes.json().catch(() => ({}));
        return Response.json(
          { error: "Failed to create Daily room", details: t },
          { status: 502 }
        );
      }

      const roomData = await createRes.json();
      const room_url = roomData?.url || `https://${process.env.DAILY_DOMAIN_NAME}/${roomName}`;

      await sql`UPDATE video_sessions SET room_url = ${room_url} WHERE id = ${vidSessionId}`;

      // Update invitation with room details
      await sql`
        UPDATE call_invitations
        SET 
          status = 'accepted',
          responded_at = NOW(),
          room_url = ${room_url},
          session_id = ${vidSessionId}
        WHERE id = ${invitationId}
      `;

      return Response.json({
        message: "Call accepted",
        room_url,
        matchId,
      });
    } else {
      // Decline
      await sql`
        UPDATE call_invitations
        SET 
          status = 'declined',
          responded_at = NOW(),
          decline_reason = ${declineReason || "No reason provided"}
        WHERE id = ${invitationId}
      `;

      // Send system message to caller notifying them of the decline
      const reason = declineReason?.trim() || "They are not available right now";
      const systemMessage = `📵 Your video call invitation was declined. Reason: "${reason}"`;
      
      // Get conversation ID from match
      const [conversation] = await sql`
        SELECT id FROM conversations WHERE legacy_match_id = ${invitation.match_id}
        LIMIT 1
      `;

      if (conversation) {
        await sql`
          INSERT INTO messages (conversation_id, sender_id, body, is_system_message, created_at)
          VALUES (${conversation.id}, ${userId}, ${systemMessage}, true, NOW())
        `;
      }

      return Response.json({
        message: "Call declined",
      });
    }
  } catch (error) {
    console.error("[VIDEO INVITATION RESPOND]", error);
    return Response.json(
      { error: "Failed to respond to invitation" },
      { status: 500 }
    );
  }
}

import sql from "@/app/api/utils/sql";

export async function POST(req) {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId } = await req.json();
    if (!matchId) {
      return Response.json({ error: "matchId is required" }, { status: 400 });
    }

    const callerId = session.user.id;

    // Get match details
    const [match] = await sql`
      SELECT user_a_id, user_b_id FROM matches WHERE id = ${matchId}
    `;

    if (!match) {
      return Response.json({ error: "Match not found" }, { status: 404 });
    }

    // Determine callee
    const calleeId =
      Number(match.user_a_id) === callerId
        ? Number(match.user_b_id)
        : Number(match.user_a_id);

    if (![Number(match.user_a_id), Number(match.user_b_id)].includes(callerId)) {
      return Response.json({ error: "Not authorized for this match" }, { status: 403 });
    }

    // ✨ NEW: Check video history - only allow instant calls if users have completed a video call before
    const [videoHistory] = await sql`
      SELECT id FROM video_sessions
      WHERE state = 'ended'
        AND ended_at IS NOT NULL
        AND ((caller_id = ${callerId} AND callee_id = ${calleeId}) OR (caller_id = ${calleeId} AND callee_id = ${callerId}))
      LIMIT 1
    `;

    if (!videoHistory) {
      return Response.json(
        { 
          error: "Please schedule your first video call before using instant calling",
          requiresSchedule: true,
          calleeId: calleeId
        },
        { status: 403 }
      );
    }

    // Check for existing pending invitation
    const [existing] = await sql`
      SELECT id FROM call_invitations
      WHERE (caller_id = ${callerId} OR callee_id = ${callerId})
        AND status = 'pending'
        AND expires_at > NOW()
    `;

    if (existing) {
      return Response.json(
        { error: "You already have a pending call invitation" },
        { status: 400 }
      );
    }

    // Check caller's tier limits and cooldowns (reuse existing logic from room creation)
    const [callerUser] = await sql`
      SELECT 
        membership_tier, 
        video_meetings_count,
        last_video_call_at,
        first_video_call_at,
        created_at
      FROM auth_users 
      WHERE id = ${callerId}
    `;

    const tier = (callerUser?.membership_tier || "free").toLowerCase();
    const firstCallDate = callerUser?.first_video_call_at;
    const lastCallDate = callerUser?.last_video_call_at;
    const accountCreated = new Date(callerUser?.created_at);

    // Check free tier video trial (2 weeks from first call)
    if (tier === "free" && firstCallDate) {
      const trialStart = new Date(firstCallDate);
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + 14);
      const now = new Date();
      
      if (now > trialEnd) {
        return Response.json(
          {
            error: "Your 2-week free video trial has expired. Upgrade to continue video dating!",
            upgradeRequired: true,
          },
          { status: 403 }
        );
      }
    }

    // Check daily call limit for free tier
    const freeMeetingLimit = 3;
    if (tier === "free") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastCallDate) {
        const lastCall = new Date(lastCallDate);
        const isToday = lastCall >= today;

        if (isToday) {
          const currentMeetings = callerUser?.video_meetings_count || 0;
          
          if (currentMeetings >= freeMeetingLimit) {
            // Calculate time until next call
            const nextDay = new Date(today);
            nextDay.setDate(nextDay.getDate() + 1);
            const secondsUntilAvailable = Math.floor((nextDay - Date.now()) / 1000);

            return Response.json(
              {
                error: `Free tier allows ${freeMeetingLimit} video meetings per day. Upgrade for unlimited calls!`,
                isLimitExceeded: true,
                currentMeetings,
                maxMeetings: freeMeetingLimit,
                secondsUntilAvailable,
                nextAvailableAt: nextDay.toISOString(),
              },
              { status: 429 }
            );
          }
        }
      }
    }

    // Create invitation (expires in 60 seconds)
    const [invitation] = await sql`
      INSERT INTO call_invitations (
        caller_id, 
        callee_id, 
        match_id, 
        status,
        expires_at
      )
      VALUES (
        ${callerId},
        ${calleeId},
        ${matchId},
        'pending',
        NOW() + INTERVAL '60 seconds'
      )
      ON CONFLICT (caller_id, callee_id, status)
      DO UPDATE SET
        created_at = NOW(),
        expires_at = NOW() + INTERVAL '60 seconds'
      RETURNING id, caller_id, callee_id, match_id, created_at, expires_at
    `;

    // Get caller info for notification
    const [callerInfo] = await sql`
      SELECT name, photo FROM auth_users WHERE id = ${callerId}
    `;

    return Response.json({
      invitation: {
        ...invitation,
        caller_name: callerInfo?.name,
        caller_photo: callerInfo?.photo,
      },
    });
  } catch (error) {
    console.error("[VIDEO INVITATION CREATE]", error);
    return Response.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

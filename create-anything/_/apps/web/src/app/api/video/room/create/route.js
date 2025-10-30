import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { getTierLimits } from "@/utils/membershipTiers";

// Creates a Daily.co room for a scheduled/initiated call and stores the room_url
// Env required: DAILY_API_KEY, DAILY_DOMAIN_NAME (domain is optional; API returns full url)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check membership tier and meeting limits
    const [meRow] =
      await sql`SELECT membership_tier, video_meetings_count, last_video_meeting_at FROM auth_users WHERE id = ${session.user.id}`;
    const myTier = (meRow?.membership_tier || "free").toLowerCase();
    let meetingCount = meRow?.video_meetings_count || 0;
    const lastMeetingDate = meRow?.last_video_meeting_at;

    // Free tier: 3 meeting cap
    if (myTier === "free") {
      const now = new Date();
      const lastDate = lastMeetingDate ? new Date(lastMeetingDate) : null;
      const isSameDay = lastDate && 
        lastDate.getFullYear() === now.getFullYear() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getDate() === now.getDate();
      
      if (!isSameDay) {
        await sql`UPDATE auth_users SET video_meetings_count = 0, last_video_meeting_at = ${now.toISOString()} WHERE id = ${session.user.id}`;
        meetingCount = 0;
      } else if (meetingCount >= 3) {
        return Response.json(
          {
            error: "Free tier allows 3 video meetings per day. Upgrade for unlimited calls!",
          },
          { status: 403 },
        );
      }
    }

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "DAILY_API_KEY not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { matchId, videoSessionId } = body || {};
    if (!matchId) {
      return Response.json({ error: "matchId is required" }, { status: 400 });
    }

    // Verify user belongs to match and determine participants
    const matchRows = await sql(
      "SELECT id, user_a_id, user_b_id FROM matches WHERE id = $1",
      [matchId],
    );
    const match = matchRows?.[0];
    if (!match) {
      return Response.json({ error: "Match not found" }, { status: 404 });
    }
    const me = Number(session.user.id);
    if (me !== Number(match.user_a_id) && me !== Number(match.user_b_id)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const otherId =
      me === Number(match.user_a_id)
        ? Number(match.user_b_id)
        : Number(match.user_a_id);

    // Get other user's tier to calculate session time limit
    const [otherUserRow] = await sql`
      SELECT membership_tier FROM auth_users WHERE id = ${otherId}
    `;
    const otherTier = (otherUserRow?.membership_tier || "free").toLowerCase();

    // Calculate base duration as minimum of both users' tier limits
    const myLimits = getTierLimits(myTier);
    const otherLimits = getTierLimits(otherTier);
    const baseDurationSeconds = Math.min(myLimits.chatMinutes, otherLimits.chatMinutes) * 60;

    // Ensure a video_sessions row exists (use provided or create new)
    let vidSessionId = videoSessionId;
    if (!vidSessionId) {
      const insertRows = await sql(
        "INSERT INTO video_sessions (match_id, caller_id, callee_id, started_at, second_date, base_duration_seconds, state) VALUES ($1,$2,$3, now(), false, $4, 'active') RETURNING id",
        [matchId, me, otherId, baseDurationSeconds],
      );
      vidSessionId = insertRows?.[0]?.id;
    }
    if (!vidSessionId) {
      return Response.json(
        { error: "Could not create session" },
        { status: 500 },
      );
    }

    // Create Daily room
    const name = `rv-${matchId}-${Date.now()}`;
    const createRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name,
        privacy: "private",
        properties: {
          enable_screenshare: true,
          exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
        },
      }),
    });
    if (!createRes.ok) {
      const t = await createRes.json().catch(() => ({}));
      return Response.json(
        { error: "Failed to create Daily room", details: t },
        { status: 502 },
      );
    }
    const roomData = await createRes.json();
    const room_url = roomData?.url;
    const room_name = roomData?.name || name;

    if (!room_url) {
      const domain = process.env.DAILY_DOMAIN_NAME;
      if (!domain) {
        return Response.json(
          { error: "Daily domain missing and API did not return url" },
          { status: 500 },
        );
      }
      // Fallback if API did not include url for some reason
      // eslint-disable-next-line
      roomData.url = `https://${domain}/${room_name}`;
    }

    await sql("UPDATE video_sessions SET room_url = $1 WHERE id = $2", [
      roomData.url,
      vidSessionId,
    ]);

    // Increment meeting count for free tier users
    let isFinalFreeMeeting = false;
    if (myTier === "free") {
      // This will be their 3rd meeting after increment
      isFinalFreeMeeting = (meetingCount + 1) === 3;
      await sql`UPDATE auth_users SET video_meetings_count = video_meetings_count + 1 WHERE id = ${session.user.id}`;
    }

    return Response.json(
      { 
        video_session_id: vidSessionId, 
        room_url: roomData.url, 
        room_name,
        is_final_free_meeting: isFinalFreeMeeting,
        user_tier: myTier
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("/api/video/room/create error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

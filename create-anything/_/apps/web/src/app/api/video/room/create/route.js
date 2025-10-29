import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Creates a Daily.co room for a scheduled/initiated call and stores the room_url
// Env required: DAILY_API_KEY, DAILY_DOMAIN_NAME (domain is optional; API returns full url)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Restrict casual tier from initiating calls
    const [meRow] =
      await sql`SELECT membership_tier FROM auth_users WHERE id = ${session.user.id}`;
    const myTier = (meRow?.membership_tier || "casual").toLowerCase();
    if (myTier === "casual") {
      return Response.json(
        {
          error:
            "Upgrade to Active User to unlock video chat and start connecting!",
        },
        { status: 403 },
      );
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

    // Ensure a video_sessions row exists (use provided or create new)
    let vidSessionId = videoSessionId;
    if (!vidSessionId) {
      const insertRows = await sql(
        "INSERT INTO video_sessions (match_id, caller_id, callee_id, started_at, second_date) VALUES ($1,$2,$3, now(), false) RETURNING id",
        [matchId, me, otherId],
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

    return Response.json(
      { video_session_id: vidSessionId, room_url: roomData.url, room_name },
      { status: 200 },
    );
  } catch (err) {
    console.error("/api/video/room/create error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

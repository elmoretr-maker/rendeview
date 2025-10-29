import { auth } from "@/auth";

// Generates a Daily.co meeting token for a given room
// Env required: DAILY_API_KEY
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "DAILY_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    let { room_name, room_url } = body || {};

    if (!room_name && room_url) {
      try {
        const u = new URL(room_url);
        room_name = u.pathname.replace(/^\//, "");
      } catch (e) {
        // ignore URL parse error
      }
    }

    if (!room_name) {
      return Response.json({ error: "room_name or valid room_url is required" }, { status: 400 });
    }

    const userName = session.user?.name || `user-${session.user?.id}`;

    const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name,
          user_name: userName,
          is_owner: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60, // valid for 1 hour
        },
      }),
    });

    if (!tokenRes.ok) {
      const t = await tokenRes.json().catch(() => ({}));
      return Response.json(
        { error: "Failed to generate meeting token", details: t },
        { status: 502 }
      );
    }

    const tokenData = await tokenRes.json();
    return Response.json({ token: tokenData?.token }, { status: 200 });
  } catch (err) {
    console.error("/api/video/token/generate error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

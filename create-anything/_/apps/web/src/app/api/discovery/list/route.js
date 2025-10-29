import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    // Require authentication for discovery to avoid anonymous browsing
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build candidate list excluding:
    // - self
    // - users the current user has blocked (discarded)
    // - users who have blocked the current user
    // - users the current user has already liked
    const q = `
      SELECT u.id, u.name, u.image, u.immediate_available, u.typical_availability, u.primary_photo_url
      FROM auth_users u
      WHERE u.id <> $1
        AND NOT EXISTS (
          SELECT 1 FROM blockers b WHERE b.blocker_id = $1 AND b.blocked_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM blockers b2 WHERE b2.blocked_id = $1 AND b2.blocker_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM likes l WHERE l.liker_id = $1 AND l.liked_id = u.id
        )
      ORDER BY u.id DESC
      LIMIT 20`;

    const candidates = await sql(q, [userId]);

    // Attach primary photo with fallback to first media photo
    const result = [];
    for (const c of candidates) {
      let photo = c.primary_photo_url || null;
      if (!photo) {
        const media = await sql(
          "SELECT url FROM profile_media WHERE user_id = $1 AND type = 'photo' ORDER BY sort_order ASC LIMIT 1",
          [c.id],
        );
        photo = media?.[0]?.url || null;
      }
      result.push({
        id: c.id,
        name: c.name,
        image: c.image,
        immediate_available: c.immediate_available,
        typical_availability: c.typical_availability,
        photo,
      });
    }

    return Response.json({ profiles: result });
  } catch (err) {
    console.error("GET /api/discovery/list error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

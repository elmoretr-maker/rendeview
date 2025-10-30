import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId, updateLastActive } from "@/app/api/utils/auth";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    // Require authentication for discovery to avoid anonymous browsing
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Track user activity
    await updateLastActive(userId);

    // Build candidate list excluding:
    // - self
    // - users the current user has blocked (discarded)
    // - users who have blocked the current user
    // - users the current user has already liked
    // SMART PRIORITIZATION:
    // 1. Users who liked you (highest priority)
    // 2. Active users (online/recently active)
    // 3. Everyone else
    const q = `
      SELECT u.id, u.name, u.image, u.immediate_available, u.typical_availability, 
             u.primary_photo_url, u.bio, u.membership_tier, u.last_active, u.interests,
             CASE WHEN l.liker_id IS NOT NULL THEN 1 ELSE 0 END as liked_you,
             CASE WHEN u.immediate_available = true THEN 1
                  WHEN u.last_active > NOW() - INTERVAL '1 day' THEN 2
                  ELSE 3 END as activity_priority
      FROM auth_users u
      LEFT JOIN likes l ON l.liker_id = u.id AND l.liked_id = $1
      WHERE u.id <> $1
        AND NOT EXISTS (
          SELECT 1 FROM blockers b WHERE b.blocker_id = $1 AND b.blocked_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM blockers b2 WHERE b2.blocked_id = $1 AND b2.blocker_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM likes l2 WHERE l2.liker_id = $1 AND l2.liked_id = u.id
        )
      ORDER BY liked_you DESC, activity_priority ASC, u.id DESC
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
        membership_tier: c.membership_tier,
        bio: c.bio,
        photo,
        liked_you: c.liked_you === 1,
        interests: c.interests || [],
        last_active: c.last_active,
      });
    }

    return Response.json({ profiles: result });
  } catch (err) {
    console.error("GET /api/discovery/list error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

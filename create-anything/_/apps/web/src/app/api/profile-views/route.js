import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId, updateLastActive } from "@/app/api/utils/auth";

/**
 * POST - Track a profile view
 */
export async function POST(request) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Track user activity
    await updateLastActive(userId);

    const { viewedId } = await request.json();

    if (!viewedId || viewedId === userId) {
      return Response.json({ error: "Invalid profile view" }, { status: 400 });
    }

    // Record the profile view
    await sql`
      INSERT INTO profile_views (viewer_id, viewed_id, viewed_at)
      VALUES (${userId}, ${viewedId}, NOW())`;

    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/profile-views error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * GET - Get users who viewed your profile (reverse discovery)
 */
export async function GET(request) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Track user activity
    await updateLastActive(userId);

    // Get recent profile viewers (last 7 days, unique viewers)
    const viewers = await sql`
      SELECT DISTINCT ON (pv.viewer_id) 
             pv.viewer_id, pv.viewed_at,
             u.id, u.name, u.image, u.immediate_available, 
             u.bio, u.membership_tier, u.primary_photo_url
      FROM profile_views pv
      JOIN auth_users u ON u.id = pv.viewer_id
      WHERE pv.viewed_id = ${userId}
        AND pv.viewed_at > NOW() - INTERVAL '7 days'
      ORDER BY pv.viewer_id, pv.viewed_at DESC
      LIMIT 50`;

    const result = [];
    for (const viewer of viewers) {
      let photo = viewer.primary_photo_url || null;
      if (!photo) {
        const media = await sql`
          SELECT url FROM profile_media 
          WHERE user_id = ${viewer.viewer_id} AND type = 'photo' 
          ORDER BY sort_order ASC LIMIT 1`;
        photo = media?.[0]?.url || null;
      }

      result.push({
        user: {
          id: viewer.viewer_id,
          name: viewer.name,
          image: viewer.image,
          immediate_available: viewer.immediate_available,
          bio: viewer.bio,
          membership_tier: viewer.membership_tier,
          photo,
        },
        viewed_at: viewer.viewed_at,
      });
    }

    return Response.json({ viewers: result });
  } catch (err) {
    console.error("GET /api/profile-views error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

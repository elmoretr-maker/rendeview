import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";

export async function GET(request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await sql`SELECT role FROM auth_users WHERE id = ${userId} LIMIT 1`;
    if (!user?.[0] || user[0].role !== 'admin') {
      return Response.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const users = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.membership_tier,
        u.primary_photo_url,
        u.consent_accepted,
        u.created_at,
        u.video_meetings_count,
        u.block_count,
        u.moderation_status,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pm.id,
              'type', pm.type,
              'url', pm.url,
              'sort_order', pm.sort_order
            ) ORDER BY pm.sort_order ASC, pm.id ASC
          ) FILTER (WHERE pm.id IS NOT NULL),
          '[]'::json
        ) as media
      FROM auth_users u
      LEFT JOIN profile_media pm ON u.id = pm.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    return Response.json({ users });
  } catch (err) {
    console.error("GET /api/admin/users-with-photos error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

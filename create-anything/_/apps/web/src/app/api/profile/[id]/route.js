import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number(params?.id);
    if (!Number.isInteger(userId)) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }
    const rows = await sql`
      SELECT id, name, image, immediate_available, availability_override, timezone, typical_availability,
             membership_tier, primary_photo_url
      FROM auth_users WHERE id = ${userId} LIMIT 1`;
    if (!rows?.[0]) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const media = await sql`
      SELECT id, type, url, sort_order FROM profile_media WHERE user_id = ${userId}
      ORDER BY sort_order ASC, id ASC`;

    return Response.json({ user: rows[0], media });
  } catch (err) {
    console.error("GET /api/profile/[id] error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

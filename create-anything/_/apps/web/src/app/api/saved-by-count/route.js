import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const result = await sql`
      SELECT COUNT(*) as count 
      FROM saved_profiles 
      WHERE saved_user_id = ${userId}
    `;

    const count = parseInt(result[0]?.count || 0);

    return Response.json({ count });
  } catch (err) {
    console.error("GET /api/saved-by-count error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

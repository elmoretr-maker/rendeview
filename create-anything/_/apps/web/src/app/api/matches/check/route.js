import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";

export async function GET(request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get("userId");

    if (!targetUserId) {
      return Response.json({ error: "userId parameter required" }, { status: 400 });
    }

    const targetId = Number(targetUserId);
    if (isNaN(targetId)) {
      return Response.json({ error: "Invalid userId" }, { status: 400 });
    }

    const a = Math.min(userId, targetId);
    const b = Math.max(userId, targetId);

    const match = await sql`
      SELECT id FROM matches 
      WHERE user_a_id = ${a} AND user_b_id = ${b}
      LIMIT 1
    `;

    return Response.json({ 
      isMatched: match.length > 0,
      matchId: match.length > 0 ? match[0].id : null
    });

  } catch (error) {
    console.error("Match check error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

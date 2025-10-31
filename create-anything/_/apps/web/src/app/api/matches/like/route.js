import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { checkRateLimit } from "@/app/api/utils/rateLimit";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    
    // Rate limiting: 100 likes per hour per user
    const rateCheck = await checkRateLimit(userId, '/api/matches/like', 100, 60);
    if (!rateCheck.allowed) {
      console.warn(`[RATE_LIMIT] User ${userId} exceeded like limit`);
      return Response.json(
        { 
          error: "You're liking too fast! Please slow down and try again later.",
          retryAfter: rateCheck.resetAt
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateCheck.resetAt.toISOString()
          }
        }
      );
    }
    
    const { likedId } = await request.json();
    if (!likedId || likedId === userId) {
      return Response.json({ error: "Invalid like" }, { status: 400 });
    }

    // Add like (ignore duplicates)
    await sql`
      INSERT INTO likes (liker_id, liked_id)
      VALUES (${userId}, ${likedId})
      ON CONFLICT (liker_id, liked_id) DO NOTHING`;

    // Check if mutual
    const mutual = await sql`
      SELECT 1 FROM likes WHERE liker_id = ${likedId} AND liked_id = ${userId} LIMIT 1`;

    let matched = false;
    if (mutual.length) {
      matched = true;
      const a = Math.min(userId, likedId);
      const b = Math.max(userId, likedId);
      // Create match if not exists using ordered pair
      await sql`
        INSERT INTO matches (user_a_id, user_b_id)
        VALUES (${a}, ${b})
        ON CONFLICT (user_a_id, user_b_id) DO NOTHING`;
    }

    return Response.json({ ok: true, matched });
  } catch (err) {
    console.error("POST /api/matches/like error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";

console.log('🔥🔥🔥 [ROUTE MODULE LOADED] /api/matches/list/route.js loaded at', new Date().toISOString());

export async function GET(request) {
  console.log('[/api/matches/list] === REQUEST RECEIVED ===');
  console.log('[/api/matches/list] Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const uid = await getAuthenticatedUserId(request);
    console.log('[/api/matches/list] Authenticated user ID:', uid);
    
    if (!uid) {
      console.log('[/api/matches/list] ❌ RETURNING 401 - No user ID');
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await sql`
      SELECT m.id as match_id,
             CASE WHEN m.user_a_id = ${uid} THEN m.user_b_id ELSE m.user_a_id END AS other_id,
             m.created_at, m.last_chat_at
      FROM matches m
      WHERE (m.user_a_id = ${uid} OR m.user_b_id = ${uid})
        AND (
          (m.user_a_id = ${uid} AND m.viewed_by_user_a = true)
          OR
          (m.user_b_id = ${uid} AND m.viewed_by_user_b = true)
        )
      ORDER BY COALESCE(m.last_chat_at, m.created_at) DESC`;

    const matches = [];
    for (const r of rows) {
      const [u] = await sql`SELECT id, name, image, immediate_available FROM auth_users WHERE id = ${r.other_id}`;
      const [pm] = await sql`SELECT url FROM profile_media WHERE user_id = ${r.other_id} AND type = 'photo' ORDER BY sort_order ASC LIMIT 1`;
      matches.push({ match_id: r.match_id, user: { ...u, photo: pm?.url || null }, created_at: r.created_at, last_chat_at: r.last_chat_at });
    }

    return Response.json({ matches });
  } catch (err) {
    console.error("GET /api/matches/list error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

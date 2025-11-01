import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId, updateLastActive } from "@/app/api/utils/auth";
import { calculateCompatibility } from "@/utils/calculateCompatibility";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await updateLastActive(userId);

    // Get current user's profile with preferences for matching
    const [currentUser] = await sql`
      SELECT interests, membership_tier, relationship_goals, smoking, drinking, exercise
      FROM auth_users 
      WHERE id = ${userId}`;

    // Check if we already have picks for today
    const today = new Date().toISOString().split('T')[0];
    const existingPicks = await sql`
      SELECT dp.picked_user_id, dp.compatibility_score,
             u.id, u.name, u.image, u.immediate_available, u.bio, 
             u.membership_tier, u.primary_photo_url, u.interests,
             u.relationship_goals, u.smoking, u.drinking, u.exercise
      FROM daily_picks dp
      JOIN auth_users u ON u.id = dp.picked_user_id
      WHERE dp.user_id = ${userId}
        AND dp.pick_date = ${today}
      ORDER BY dp.compatibility_score DESC
      LIMIT 10`;

    if (existingPicks.length > 0) {
      // Return existing picks for today
      const picks = [];
      for (const pick of existingPicks) {
        let photo = pick.primary_photo_url || null;
        if (!photo) {
          const media = await sql`
            SELECT url FROM profile_media 
            WHERE user_id = ${pick.picked_user_id} AND type = 'photo' 
            ORDER BY sort_order ASC LIMIT 1`;
          photo = media?.[0]?.url || null;
        }
        
        picks.push({
          id: pick.picked_user_id,
          name: pick.name,
          image: pick.image,
          immediate_available: pick.immediate_available,
          bio: pick.bio,
          membership_tier: pick.membership_tier,
          photo,
          interests: pick.interests || [],
          compatibility_score: parseFloat(pick.compatibility_score),
        });
      }
      return Response.json({ picks, generated: false });
    }

    // Generate new picks for today
    // Get candidates (excluding blocked, liked, matched users)
    const candidates = await sql`
      SELECT u.id, u.name, u.image, u.immediate_available, u.typical_availability,
             u.primary_photo_url, u.bio, u.membership_tier, u.last_active, u.interests,
             u.relationship_goals, u.smoking, u.drinking, u.exercise
      FROM auth_users u
      WHERE u.id <> ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM blockers b WHERE b.blocker_id = ${userId} AND b.blocked_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM blockers b2 WHERE b2.blocked_id = ${userId} AND b2.blocker_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM likes l WHERE l.liker_id = ${userId} AND l.liked_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM matches m 
          WHERE (m.user_a_id = ${userId} AND m.user_b_id = u.id)
             OR (m.user_b_id = ${userId} AND m.user_a_id = u.id)
        )
      ORDER BY RANDOM()
      LIMIT 50`;

    // Calculate compatibility scores
    const scoredCandidates = candidates.map(candidate => ({
      ...candidate,
      compatibility_score: calculateCompatibility(currentUser, candidate),
    }));

    // Sort by score and take top 10
    const topPicks = scoredCandidates
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, 10);

    // Save picks to database
    for (const pick of topPicks) {
      await sql`
        INSERT INTO daily_picks (user_id, picked_user_id, pick_date, compatibility_score)
        VALUES (${userId}, ${pick.id}, ${today}, ${pick.compatibility_score})
        ON CONFLICT (user_id, picked_user_id, pick_date) DO NOTHING`;
    }

    // Fetch photos and format response
    const picks = [];
    for (const pick of topPicks) {
      let photo = pick.primary_photo_url || null;
      if (!photo) {
        const media = await sql`
          SELECT url FROM profile_media 
          WHERE user_id = ${pick.id} AND type = 'photo' 
          ORDER BY sort_order ASC LIMIT 1`;
        photo = media?.[0]?.url || null;
      }
      
      picks.push({
        id: pick.id,
        name: pick.name,
        image: pick.image,
        immediate_available: pick.immediate_available,
        bio: pick.bio,
        membership_tier: pick.membership_tier,
        photo,
        interests: pick.interests || [],
        compatibility_score: pick.compatibility_score,
      });
    }

    return Response.json({ picks, generated: true });
  } catch (err) {
    console.error("GET /api/daily-picks error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

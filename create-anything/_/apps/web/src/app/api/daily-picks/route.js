import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId, updateLastActive } from "@/app/api/utils/auth";

/**
 * Enhanced compatibility score calculation between two users
 * Factors: mutual interests (weighted), activity, membership tier, preferences
 * Score range: 0.0 to 1.0
 */
function calculateCompatibility(user, candidate) {
  let score = 0.3; // Base score (reduced from 0.5 to allow more room for compatibility boosts)
  
  // INTERESTS MATCHING (max +0.35 boost)
  const userInterests = user.interests || [];
  const candidateInterests = candidate.interests || [];
  const mutualInterests = userInterests.filter(i => candidateInterests.includes(i));
  
  if (mutualInterests.length > 0) {
    // Progressive scoring: 1 shared = +0.05, 2 = +0.12, 3 = +0.20, 4 = +0.27, 5+ = +0.35
    let interestScore = 0;
    if (mutualInterests.length === 1) interestScore = 0.05;
    else if (mutualInterests.length === 2) interestScore = 0.12;
    else if (mutualInterests.length === 3) interestScore = 0.20;
    else if (mutualInterests.length === 4) interestScore = 0.27;
    else interestScore = 0.35; // 5+
    
    score += interestScore;
    
    // Bonus if they share 3+ interests (deep compatibility)
    const deepCompatibilityBonus = mutualInterests.length >= 3 ? 0.05 : 0;
    score += deepCompatibilityBonus;
  }
  
  // RELATIONSHIP GOALS COMPATIBILITY (max +0.15)
  if (user.relationship_goals && candidate.relationship_goals) {
    // Exact match on relationship goals is important
    if (user.relationship_goals === candidate.relationship_goals) {
      score += 0.15;
    } else if (
      // Compatible goals (e.g., "Long-term relationship" and "Marriage" are compatible)
      (user.relationship_goals === 'Long-term relationship' && candidate.relationship_goals === 'Marriage') ||
      (user.relationship_goals === 'Marriage' && candidate.relationship_goals === 'Long-term relationship')
    ) {
      score += 0.10;
    }
  }
  
  // LIFESTYLE COMPATIBILITY (max +0.10)
  let lifestyleScore = 0;
  
  // Smoking compatibility
  if (user.smoking && candidate.smoking) {
    const nonSmoker = ['Never', 'Prefer not to say'];
    const userNonSmoker = nonSmoker.includes(user.smoking);
    const candidateNonSmoker = nonSmoker.includes(candidate.smoking);
    if (userNonSmoker === candidateNonSmoker) {
      lifestyleScore += 0.04;
    }
  }
  
  // Drinking compatibility
  if (user.drinking && candidate.drinking) {
    if (user.drinking === candidate.drinking) {
      lifestyleScore += 0.03;
    }
  }
  
  // Exercise compatibility
  if (user.exercise && candidate.exercise) {
    const userActive = ['3-4 times/week', '5+ times/week', 'Daily'].includes(user.exercise);
    const candidateActive = ['3-4 times/week', '5+ times/week', 'Daily'].includes(candidate.exercise);
    if (userActive === candidateActive) {
      lifestyleScore += 0.03;
    }
  }
  
  score += lifestyleScore;
  
  // ACTIVITY BOOST (max +0.15)
  if (candidate.immediate_available) {
    score += 0.15; // Online now
  } else if (candidate.last_active && 
             new Date(candidate.last_active) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    score += 0.10; // Active in last 24 hours
  } else if (candidate.last_active && 
             new Date(candidate.last_active) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    score += 0.05; // Active in last week
  }
  
  // MEMBERSHIP TIER SIMILARITY (+0.05)
  if (user.membership_tier === candidate.membership_tier) {
    score += 0.05;
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

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

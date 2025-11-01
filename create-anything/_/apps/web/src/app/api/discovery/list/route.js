import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId, updateLastActive } from "@/app/api/utils/auth";

/**
 * Calculate compatibility score between two users
 * Same algorithm used in daily-picks for consistency
 */
function calculateCompatibility(user, candidate) {
  let score = 0.3; // Base score
  
  // INTERESTS MATCHING (max +0.40)
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
    if (user.relationship_goals === candidate.relationship_goals) {
      score += 0.15;
    } else if (
      (user.relationship_goals === 'Long-term relationship' && candidate.relationship_goals === 'Marriage') ||
      (user.relationship_goals === 'Marriage' && candidate.relationship_goals === 'Long-term relationship')
    ) {
      score += 0.10;
    }
  }
  
  // LIFESTYLE COMPATIBILITY (max +0.10)
  let lifestyleScore = 0;
  
  if (user.smoking && candidate.smoking) {
    const nonSmoker = ['Never', 'Prefer not to say'];
    const userNonSmoker = nonSmoker.includes(user.smoking);
    const candidateNonSmoker = nonSmoker.includes(candidate.smoking);
    if (userNonSmoker === candidateNonSmoker) {
      lifestyleScore += 0.04;
    }
  }
  
  if (user.drinking && candidate.drinking) {
    if (user.drinking === candidate.drinking) {
      lifestyleScore += 0.03;
    }
  }
  
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
    score += 0.15;
  } else if (candidate.last_active && 
             new Date(candidate.last_active) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    score += 0.10;
  } else if (candidate.last_active && 
             new Date(candidate.last_active) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    score += 0.05;
  }
  
  // MEMBERSHIP TIER SIMILARITY (+0.05)
  if (user.membership_tier === candidate.membership_tier) {
    score += 0.05;
  }
  
  return Math.min(score, 1.0);
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    // Require authentication for discovery to avoid anonymous browsing
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Track user activity
    await updateLastActive(userId);

    // Get current user's profile for compatibility calculation
    const [currentUser] = await sql`
      SELECT interests, membership_tier, relationship_goals, smoking, drinking, exercise
      FROM auth_users 
      WHERE id = ${userId}`;

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
             u.relationship_goals, u.smoking, u.drinking, u.exercise,
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

    // Attach primary photo and calculate compatibility scores
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
      
      // Calculate compatibility score
      const compatibilityScore = calculateCompatibility(currentUser, c);
      
      // Find mutual interests
      const userInterests = currentUser?.interests || [];
      const candidateInterests = c.interests || [];
      const mutualInterests = userInterests.filter(i => candidateInterests.includes(i));
      
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
        interests: candidateInterests,
        mutual_interests: mutualInterests,
        compatibility_score: compatibilityScore,
        relationship_goals: c.relationship_goals,
        last_active: c.last_active,
      });
    }

    return Response.json({ profiles: result });
  } catch (err) {
    console.error("GET /api/discovery/list error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

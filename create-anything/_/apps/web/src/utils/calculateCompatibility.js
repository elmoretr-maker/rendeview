/**
 * Enhanced compatibility score calculation between two users
 * 
 * This is the single source of truth for matching algorithm.
 * Used by: Discovery API, Daily Picks API
 * 
 * Factors considered:
 * - Mutual interests (progressive scoring, max +0.40)
 * - Relationship goals alignment (max +0.15)
 * - Lifestyle compatibility: smoking, drinking, exercise (max +0.10)
 * - Activity level/recency (max +0.15)
 * - Membership tier similarity (+0.05)
 * 
 * Score range: 0.3 (base) to 1.0 (perfect match)
 * 
 * @param {Object} user - Current user's profile data
 * @param {Array} user.interests - User's interests array
 * @param {string} user.membership_tier - User's membership tier
 * @param {string} user.relationship_goals - User's relationship goals
 * @param {string} user.smoking - User's smoking preference
 * @param {string} user.drinking - User's drinking preference
 * @param {string} user.exercise - User's exercise frequency
 * 
 * @param {Object} candidate - Candidate user's profile data (same structure as user)
 * @param {boolean} candidate.immediate_available - Whether candidate is online now
 * @param {Date|string} candidate.last_active - Candidate's last active timestamp
 * 
 * @returns {number} Compatibility score between 0.3 and 1.0
 */
export function calculateCompatibility(user, candidate) {
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
      score += 0.15; // Exact match
    } else if (
      // Compatible goals (e.g., "Long-term relationship" and "Marriage" are compatible)
      (user.relationship_goals === 'Long-term relationship' && candidate.relationship_goals === 'Marriage') ||
      (user.relationship_goals === 'Marriage' && candidate.relationship_goals === 'Long-term relationship')
    ) {
      score += 0.10; // Compatible match
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

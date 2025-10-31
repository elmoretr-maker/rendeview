import sql from "./sql";

/**
 * Rate limiting utility for API endpoints
 * Tracks requests per user per endpoint in a sliding window
 * 
 * @param {number} userId - The user ID making the request
 * @param {string} endpoint - The endpoint being accessed (e.g., '/api/video/room/create')
 * @param {number} maxRequests - Maximum number of requests allowed in the window
 * @param {number} windowMinutes - Time window in minutes
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
 */
export async function checkRateLimit(userId, endpoint, maxRequests, windowMinutes) {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  try {
    // Clean up expired rate limit entries (older than the window)
    await sql`
      DELETE FROM rate_limits 
      WHERE window_start < ${windowStart.toISOString()}
    `;
    
    // Get current request count for this user/endpoint in the window
    const [current] = await sql`
      SELECT COUNT(*) as count
      FROM rate_limits
      WHERE user_id = ${userId}
      AND endpoint = ${endpoint}
      AND window_start >= ${windowStart.toISOString()}
    `;
    
    const currentCount = parseInt(current?.count || 0);
    
    if (currentCount >= maxRequests) {
      // Rate limit exceeded
      const [oldest] = await sql`
        SELECT window_start
        FROM rate_limits
        WHERE user_id = ${userId}
        AND endpoint = ${endpoint}
        AND window_start >= ${windowStart.toISOString()}
        ORDER BY window_start ASC
        LIMIT 1
      `;
      
      const resetAt = oldest?.window_start 
        ? new Date(new Date(oldest.window_start).getTime() + windowMinutes * 60 * 1000)
        : new Date(Date.now() + windowMinutes * 60 * 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        current: currentCount,
        limit: maxRequests
      };
    }
    
    // Record this request
    await sql`
      INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
      VALUES (${userId}, ${endpoint}, ${1}, ${new Date().toISOString()})
    `;
    
    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetAt: new Date(Date.now() + windowMinutes * 60 * 1000),
      current: currentCount + 1,
      limit: maxRequests
    };
  } catch (err) {
    console.error(`[RATE_LIMIT] Error checking rate limit for user ${userId} on ${endpoint}:`, err);
    // On error, allow the request (fail open) to avoid blocking legitimate traffic
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(Date.now() + windowMinutes * 60 * 1000),
      error: true
    };
  }
}

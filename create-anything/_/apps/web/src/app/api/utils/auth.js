import { auth } from "@/auth";
import sql from "./sql";

/**
 * Get authenticated user ID with QA bypass support
 * 
 * QA_BYPASS: When process.env.QA_BYPASS_AUTH === 'true', 
 * returns user ID 1 (admin) for testing without authentication
 * 
 * @returns {Promise<number|null>} User ID or null if not authenticated
 */
export async function getAuthenticatedUserId() {
  // QA_BYPASS: Check for testing bypass
  if (process.env.QA_BYPASS_AUTH === 'true') {
    console.log('[QA_BYPASS] Authentication bypassed - using admin user ID 1');
    return 1;
  }
  
  // Normal authentication flow
  const session = await auth();
  return session?.user?.id || null;
}

/**
 * Require authentication for an API route
 * Returns user ID if authenticated, or returns a 401 Response if not
 * 
 * @returns {Promise<number|Response>} User ID or 401 Response
 */
export async function requireAuth() {
  const userId = await getAuthenticatedUserId();
  
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  return userId;
}

/**
 * Update user's last_active timestamp for activity tracking
 * Call this in API routes to track user activity
 * 
 * @param {number} userId - The user ID to update
 */
export async function updateLastActive(userId) {
  if (!userId) return;
  
  try {
    await sql`UPDATE auth_users SET last_active = NOW() WHERE id = ${userId}`;
  } catch (err) {
    console.error('[updateLastActive] Failed to update last_active:', err);
    // Don't throw - activity tracking shouldn't break the request
  }
}

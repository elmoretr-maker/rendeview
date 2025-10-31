/**
 * Central Configuration File
 * All magic numbers, limits, fees, and thresholds should be defined here
 * to avoid hardcoded values scattered throughout the codebase.
 */

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

export const RATE_LIMITS = {
  // Video room creation: 10 requests per hour
  VIDEO_ROOM_CREATION: {
    maxRequests: 10,
    windowMinutes: 60,
    endpoint: '/api/video/room/create'
  },
  
  // User blocking: 20 requests per hour
  BLOCK_USER: {
    maxRequests: 20,
    windowMinutes: 60,
    endpoint: '/api/blockers'
  },
  
  // Profile likes: 100 requests per hour
  PROFILE_LIKES: {
    maxRequests: 100,
    windowMinutes: 60,
    endpoint: '/api/matches/like'
  }
};

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export const CACHE_DURATIONS = {
  // Object storage cache: 1 hour (in seconds)
  OBJECT_STORAGE: 3600,
  
  // Idempotency key expiration: 24 hours (in milliseconds)
  IDEMPOTENCY_KEY: 24 * 60 * 60 * 1000,
  
  // Session timeout: 30 minutes (in milliseconds)
  SESSION_TIMEOUT: 30 * 60 * 1000,
  
  // Session warning: 5 minutes before timeout (in milliseconds)
  SESSION_WARNING: 5 * 60 * 1000
};

// ============================================================================
// PAYMENT & PRICING CONFIGURATION
// ============================================================================

export const PRICING = {
  // Membership tiers (in cents)
  TIERS: {
    FREE: 0,
    CASUAL: 999,    // $9.99
    DATING: 2999,   // $29.99
    BUSINESS: 4999  // $49.99
  },
  
  // Call extension pricing (in cents)
  EXTENSION: {
    AMOUNT: 800,      // $8.00
    DURATION: 10      // 10 minutes
  },
  
  // Second date fee (in cents)
  SECOND_DATE_FEE: 1000  // $10.00
};

// ============================================================================
// VIDEO CALL CONFIGURATION
// ============================================================================

export const VIDEO_CALL = {
  // Base call durations by tier (in minutes)
  DURATIONS: {
    FREE: 5,
    CASUAL: 15,
    DATING: 25,
    BUSINESS: 45
  },
  
  // Extension duration (in minutes)
  EXTENSION_DURATION: 10,
  
  // Grace period after time expires (in seconds)
  GRACE_PERIOD: 60,
  
  // Auto-end warning threshold (in seconds)
  WARNING_THRESHOLD: 60
};

// ============================================================================
// MEDIA UPLOAD LIMITS
// ============================================================================

export const MEDIA_LIMITS = {
  // Photo limits by tier
  PHOTOS: {
    FREE: 2,
    CASUAL: 6,
    DATING: 10,
    BUSINESS: 20
  },
  
  // Video limits by tier
  VIDEOS: {
    FREE: 1,
    CASUAL: 3,
    DATING: 1,
    BUSINESS: 1
  },
  
  // Video duration limits by tier (in seconds)
  VIDEO_DURATION: {
    FREE: 15,
    CASUAL: 30,
    DATING: 60,
    BUSINESS: 300  // 5 minutes
  },
  
  // File size limits (in bytes)
  MAX_PHOTO_SIZE: 5 * 1024 * 1024,    // 5 MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024    // 50 MB
};

// ============================================================================
// DAILY LIMITS
// ============================================================================

export const DAILY_LIMITS = {
  // Maximum meetings per day by tier
  MEETINGS: {
    FREE: 3,
    CASUAL: Infinity,
    DATING: Infinity,
    BUSINESS: Infinity
  },
  
  // Maximum likes per day
  MAX_LIKES_PER_DAY: 200,
  
  // Maximum messages per match per day
  MAX_MESSAGES_PER_MATCH: 500
};

// ============================================================================
// SAFETY & MODERATION
// ============================================================================

export const SAFETY = {
  // Strike threshold before account suspension
  MAX_STRIKES: 4,
  
  // Maximum blocks before flagging for admin review
  MAX_BLOCKS_THRESHOLD: 10,
  
  // Report cooldown period (in hours)
  REPORT_COOLDOWN: 24
};

// ============================================================================
// PAGINATION & DISPLAY
// ============================================================================

export const PAGINATION = {
  // Default page size for lists
  DEFAULT_PAGE_SIZE: 20,
  
  // Maximum page size
  MAX_PAGE_SIZE: 100,
  
  // Discovery cards per fetch
  DISCOVERY_BATCH_SIZE: 10,
  
  // Messages per page in chat
  MESSAGES_PER_PAGE: 50
};

// ============================================================================
// TIMEOUT & RETRY CONFIGURATION
// ============================================================================

export const TIMEOUTS = {
  // API request timeout (in milliseconds)
  API_REQUEST: 30000,  // 30 seconds
  
  // File upload timeout (in milliseconds)
  FILE_UPLOAD: 120000,  // 2 minutes
  
  // Video call connection timeout (in milliseconds)
  VIDEO_CALL_CONNECTION: 15000,  // 15 seconds
  
  // Retry attempts for failed requests
  MAX_RETRY_ATTEMPTS: 3,
  
  // Retry delay (in milliseconds)
  RETRY_DELAY: 1000  // 1 second
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get rate limit configuration for an endpoint
 * @param {string} endpoint - The endpoint path
 * @returns {object|null} Rate limit config or null if not found
 */
export function getRateLimitConfig(endpoint) {
  const configs = Object.values(RATE_LIMITS);
  return configs.find(config => config.endpoint === endpoint) || null;
}

/**
 * Get tier-specific media limits
 * @param {string} tier - Membership tier (free, casual, dating, business)
 * @returns {object} Media limits for the tier
 */
export function getMediaLimitsForTier(tier) {
  const normalizedTier = tier?.toUpperCase() || 'FREE';
  return {
    photos: MEDIA_LIMITS.PHOTOS[normalizedTier] || MEDIA_LIMITS.PHOTOS.FREE,
    videos: MEDIA_LIMITS.VIDEOS[normalizedTier] || MEDIA_LIMITS.VIDEOS.FREE,
    videoDuration: MEDIA_LIMITS.VIDEO_DURATION[normalizedTier] || MEDIA_LIMITS.VIDEO_DURATION.FREE
  };
}

/**
 * Get tier-specific call duration
 * @param {string} tier - Membership tier (free, casual, dating, business)
 * @returns {number} Call duration in minutes
 */
export function getCallDurationForTier(tier) {
  const normalizedTier = tier?.toUpperCase() || 'FREE';
  return VIDEO_CALL.DURATIONS[normalizedTier] || VIDEO_CALL.DURATIONS.FREE;
}

/**
 * Check if a tier has unlimited daily meetings
 * @param {string} tier - Membership tier (free, casual, dating, business)
 * @returns {boolean}
 */
export function hasUnlimitedMeetings(tier) {
  const normalizedTier = tier?.toUpperCase() || 'FREE';
  return DAILY_LIMITS.MEETINGS[normalizedTier] === Infinity;
}

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
// USER INTERESTS & HOBBIES CONFIGURATION
// ============================================================================

export const INTERESTS_CONFIG = {
  // Minimum interests required
  MIN_REQUIRED: 3,
  
  // Maximum interests allowed
  MAX_ALLOWED: 7,
  
  // Predefined interests/hobbies list
  OPTIONS: [
    // Sports & Fitness
    'Running', 'Yoga', 'Gym', 'Swimming', 'Cycling', 'Hiking', 'Rock Climbing',
    'Dance', 'Martial Arts', 'Tennis', 'Golf', 'Basketball', 'Soccer', 'Volleyball',
    
    // Arts & Creativity
    'Photography', 'Painting', 'Drawing', 'Music', 'Singing', 'Playing Instrument',
    'Writing', 'Poetry', 'Film & Movies', 'Theater', 'Sculpting', 'Crafts',
    
    // Food & Drink
    'Cooking', 'Baking', 'Coffee', 'Wine Tasting', 'Craft Beer', 'Foodie',
    'Vegan Cooking', 'BBQ & Grilling', 'Restaurant Hopping',
    
    // Entertainment & Media
    'Gaming', 'Board Games', 'Video Games', 'Podcasts', 'Reading', 'Comics & Manga',
    'Anime', 'Streaming', 'Stand-up Comedy', 'Karaoke',
    
    // Outdoors & Adventure
    'Camping', 'Kayaking', 'Surfing', 'Skiing', 'Snowboarding', 'Fishing',
    'Road Trips', 'Beach', 'Mountain Climbing', 'Nature Walks',
    
    // Social & Nightlife
    'Live Music', 'Concerts', 'Festivals', 'Clubbing', 'Wine Bars', 'Karaoke',
    'Trivia Nights', 'Networking Events',
    
    // Intellectual & Learning
    'Tech & Startups', 'Science', 'Philosophy', 'Politics', 'Investing',
    'Languages', 'History', 'Astronomy', 'Psychology', 'Self-improvement',
    
    // Lifestyle
    'Travel', 'Fashion', 'Interior Design', 'Gardening', 'Meditation',
    'Astrology', 'Volunteering', 'Pets & Animals', 'DIY Projects',
    'Sustainable Living', 'Minimalism',
    
    // Professional
    'Entrepreneurship', 'Public Speaking', 'Networking', 'Career Development',
    
    // Miscellaneous
    'Thrift Shopping', 'Vintage Collecting', 'Cars & Motorcycles', 'Sneakers',
    'Home Brewing', 'Crossword Puzzles', 'Chess', 'Magic Tricks'
  ].sort() // Alphabetically sorted for easy browsing
};

// ============================================================================
// USER PREFERENCES & MATCHING CONFIGURATION
// ============================================================================

export const PREFERENCE_OPTIONS = {
  // Gender Identity
  GENDER: [
    'Man',
    'Woman',
    'Non-binary',
    'Genderqueer',
    'Genderfluid',
    'Agender',
    'Prefer not to say'
  ],
  
  // Sexual Orientation
  SEXUAL_ORIENTATION: [
    'Straight',
    'Gay',
    'Lesbian',
    'Bisexual',
    'Pansexual',
    'Asexual',
    'Demisexual',
    'Queer',
    'Questioning',
    'Prefer not to say'
  ],
  
  // Looking For (Gender Preferences)
  LOOKING_FOR: [
    'Men',
    'Women',
    'Non-binary people',
    'Everyone'
  ],
  
  // Body Type
  BODY_TYPE: [
    'Slim',
    'Athletic',
    'Average',
    'Curvy',
    'Muscular',
    'A few extra pounds',
    'Plus size',
    'Prefer not to say'
  ],
  
  // Height ranges (in cm for international compatibility)
  HEIGHT_RANGES: [
    'Under 150cm (4\'11")',
    '150-160cm (4\'11"-5\'3")',
    '160-170cm (5\'3"-5\'7")',
    '170-180cm (5\'7"-5\'11")',
    '180-190cm (5\'11"-6\'3")',
    '190-200cm (6\'3"-6\'7")',
    'Over 200cm (6\'7")',
    'Prefer not to say'
  ],
  
  // Education Level
  EDUCATION: [
    'High school',
    'Some college',
    'Associate degree',
    'Bachelor\'s degree',
    'Master\'s degree',
    'Doctorate/PhD',
    'Trade school',
    'Prefer not to say'
  ],
  
  // Relationship Goals
  RELATIONSHIP_GOALS: [
    'Casual dating',
    'Long-term relationship',
    'Marriage',
    'Friendship',
    'Networking',
    'Not sure yet',
    'Prefer not to say'
  ],
  
  // Drinking Habits
  DRINKING: [
    'Never',
    'Rarely',
    'Socially',
    'Regularly',
    'Prefer not to say'
  ],
  
  // Smoking Habits
  SMOKING: [
    'Never',
    'Rarely',
    'Socially',
    'Regularly',
    'Trying to quit',
    'Prefer not to say'
  ],
  
  // Exercise Frequency
  EXERCISE: [
    'Never',
    'Rarely',
    '1-2 times/week',
    '3-4 times/week',
    '5+ times/week',
    'Daily',
    'Prefer not to say'
  ],
  
  // Religion
  RELIGION: [
    'Agnostic',
    'Atheist',
    'Buddhist',
    'Catholic',
    'Christian',
    'Hindu',
    'Jewish',
    'Muslim',
    'Spiritual',
    'Other',
    'Prefer not to say'
  ],
  
  // Children Preferences
  CHILDREN: [
    'Have children',
    'Don\'t have, want someday',
    'Don\'t have, don\'t want',
    'Don\'t have, open to it',
    'Prefer not to say'
  ],
  
  // Pets
  PETS: [
    'Dog(s)',
    'Cat(s)',
    'Both dogs and cats',
    'Other pets',
    'No pets',
    'Want pets',
    'Allergic to pets',
    'Prefer not to say'
  ]
};

// Preference field importance weights for matching algorithm
export const PREFERENCE_WEIGHTS = {
  GENDER_MATCH: 1.0,           // Must match
  ORIENTATION_MATCH: 1.0,      // Must match
  INTERESTS_SHARED: 0.3,       // Up to 30% boost
  RELATIONSHIP_GOALS: 0.2,     // 20% boost if aligned
  BODY_TYPE_PREFERENCE: 0.1,   // 10% boost
  EDUCATION_SIMILAR: 0.05,     // 5% boost
  LIFESTYLE_COMPATIBLE: 0.15,  // 15% boost (drinking, smoking, exercise)
  CHILDREN_COMPATIBLE: 0.1,    // 10% boost
  PETS_COMPATIBLE: 0.05,       // 5% boost
  HEIGHT_PREFERENCE: 0.05      // 5% boost
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

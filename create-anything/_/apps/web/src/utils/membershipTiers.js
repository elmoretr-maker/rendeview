// Membership tier constants and helper functions

export const MEMBERSHIP_TIERS = {
  FREE: 'free',
  CASUAL: 'casual',
  DATING: 'dating',
  BUSINESS: 'business'
};

export const TIER_LIMITS = {
  [MEMBERSHIP_TIERS.FREE]: {
    photos: 2,
    videos: 1,
    videoMaxDuration: 15, // seconds
    chatMinutes: 5,
    maxMeetings: 3,
    price: 'Free',
    priceMonthly: 0
  },
  [MEMBERSHIP_TIERS.CASUAL]: {
    photos: 6,
    videos: 3,
    videoMaxDuration: 30, // seconds
    chatMinutes: 15,
    maxMeetings: Infinity,
    price: '$9.99/mo',
    priceMonthly: 9.99
  },
  [MEMBERSHIP_TIERS.DATING]: {
    photos: 10,
    videos: 1,
    videoMaxDuration: 60, // seconds
    chatMinutes: 25,
    maxMeetings: Infinity,
    price: '$29.99/mo',
    priceMonthly: 29.99
  },
  [MEMBERSHIP_TIERS.BUSINESS]: {
    photos: 20,
    videos: 1,
    videoMaxDuration: 300, // seconds (5 minutes)
    chatMinutes: 45,
    maxMeetings: Infinity,
    price: '$49.99/mo',
    priceMonthly: 49.99
  }
};

// Extension pricing
export const EXTENSION_PRICING = {
  costPer10Minutes: 8.00,
  durationMinutes: 10
};

/**
 * Get tier limits for a given membership tier
 * @param {string} tier - The membership tier
 * @returns {object} The limits for that tier
 */
export function getTierLimits(tier) {
  const normalizedTier = tier?.toLowerCase() || MEMBERSHIP_TIERS.FREE;
  return TIER_LIMITS[normalizedTier] || TIER_LIMITS[MEMBERSHIP_TIERS.FREE];
}

/**
 * Calculate the maximum session duration for a video call based on both users' tiers
 * Returns the duration in minutes from the user with the lowest tier
 * @param {string} user1Tier - First user's tier
 * @param {string} user2Tier - Second user's tier
 * @returns {number} Maximum session duration in minutes
 */
export function calculateSessionDuration(user1Tier, user2Tier) {
  const user1Limits = getTierLimits(user1Tier);
  const user2Limits = getTierLimits(user2Tier);
  
  return Math.min(user1Limits.chatMinutes, user2Limits.chatMinutes);
}

/**
 * Check if a user can upload more photos
 * @param {string} tier - User's membership tier
 * @param {number} currentCount - Current number of photos
 * @returns {boolean} Whether user can upload more
 */
export function canUploadMorePhotos(tier, currentCount) {
  const limits = getTierLimits(tier);
  return currentCount < limits.photos;
}

/**
 * Check if a user can upload more videos
 * @param {string} tier - User's membership tier
 * @param {number} currentCount - Current number of videos
 * @returns {boolean} Whether user can upload more
 */
export function canUploadMoreVideos(tier, currentCount) {
  const limits = getTierLimits(tier);
  return currentCount < limits.videos;
}

/**
 * Check if a user can start a new video meeting
 * @param {string} tier - User's membership tier
 * @param {number} meetingCount - Number of meetings completed
 * @returns {boolean} Whether user can start a new meeting
 */
export function canStartNewMeeting(tier, meetingCount) {
  const limits = getTierLimits(tier);
  return meetingCount < limits.maxMeetings;
}

/**
 * Get the maximum video duration for a tier
 * @param {string} tier - User's membership tier
 * @returns {number} Max duration in seconds
 */
export function getMaxVideoDuration(tier) {
  const limits = getTierLimits(tier);
  return limits.videoMaxDuration;
}

/**
 * Format duration in seconds to a human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted string (e.g., "1:30")
 */
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get remaining photo slots for a user
 * @param {string} tier - User's membership tier
 * @param {number} currentCount - Current number of photos
 * @returns {number} Number of remaining slots
 */
export function getRemainingPhotoSlots(tier, currentCount) {
  const limits = getTierLimits(tier);
  return Math.max(0, limits.photos - currentCount);
}

/**
 * Get remaining video slots for a user
 * @param {string} tier - User's membership tier
 * @param {number} currentCount - Current number of videos
 * @returns {number} Number of remaining slots
 */
export function getRemainingVideoSlots(tier, currentCount) {
  const limits = getTierLimits(tier);
  return Math.max(0, limits.videos - currentCount);
}

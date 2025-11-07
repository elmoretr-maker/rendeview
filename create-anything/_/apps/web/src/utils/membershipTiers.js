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
    videoTrialDays: 14, // 2-week free trial for video features from first call
    dailyMessages: 15,
    perPersonMessagesBeforeVideo: 10, // 10 messages/day per person before first video
    bonusMessagesAfterVideo: 0, // No bonus for free tier
    perMatchDailyMessages: null,
    firstEncounterMessages: 10
  },
  [MEMBERSHIP_TIERS.CASUAL]: {
    photos: 6,
    videos: 1,
    videoMaxDuration: 30, // seconds
    chatMinutes: 15,
    maxMeetings: Infinity,
    dailyMessages: 24,
    perPersonMessagesBeforeVideo: 10, // 10 messages/day per person before first video
    bonusMessagesAfterVideo: 25, // +25 daily messages after completing video call
    perMatchDailyMessages: null,
    firstEncounterMessages: 10
  },
  [MEMBERSHIP_TIERS.DATING]: {
    photos: 10,
    videos: 2,
    videoMaxDuration: 60, // seconds
    chatMinutes: 25,
    maxMeetings: Infinity,
    dailyMessages: 50,
    perPersonMessagesBeforeVideo: 10, // 10 messages/day per person before first video
    bonusMessagesAfterVideo: 50, // +50 daily messages after completing video call
    perMatchDailyMessages: null,
    firstEncounterMessages: 10
  },
  [MEMBERSHIP_TIERS.BUSINESS]: {
    photos: 20,
    videos: 2,
    videoMaxDuration: 60, // seconds (1 minute)
    chatMinutes: 45,
    maxMeetings: Infinity,
    dailyMessages: 500,
    perPersonMessagesBeforeVideo: 10, // 10 messages/day per person before first video
    bonusMessagesAfterVideo: 100, // +100 daily messages after completing video call
    perMatchDailyMessages: 50,
    perMatchDailyMessagesAfterVideo: 75,
    firstEncounterMessages: 10,
    // Premium Business Features
    priorityPlacement: true,           // Appear higher in discovery
    videoVerifiedBadge: true,          // Special verified badge after video calls
    advancedFilters: true,             // Filter by interests, location radius, etc.
    readReceipts: true,                // See when messages are read
    schedulingAssistant: true,         // Smart scheduling suggestions
    profileBoostsPerWeek: 1,           // Weekly profile boost
    dailyPicks: 10,                    // Curated matches daily
    rewindLimit: 5,                    // Undo passes per day
    unlimitedLikes: true,              // No daily like limit
    incognitoMode: true                // Browse invisibly
  }
};

// Extension pricing
export const EXTENSION_PRICING = {
  costPer10Minutes: 8.00,
  durationMinutes: 10
};

// Video messaging (short video clips sent in chat)
export const VIDEO_MESSAGE_PRICING = {
  FREE_VIDEOS_PER_DAY: {
    [MEMBERSHIP_TIERS.FREE]: 3,
    [MEMBERSHIP_TIERS.CASUAL]: 10,
    [MEMBERSHIP_TIERS.DATING]: 25,
    [MEMBERSHIP_TIERS.BUSINESS]: 50
  },
  MAX_DURATION_SECONDS: {
    [MEMBERSHIP_TIERS.FREE]: 10,
    [MEMBERSHIP_TIERS.CASUAL]: 15,
    [MEMBERSHIP_TIERS.DATING]: 30,
    [MEMBERSHIP_TIERS.BUSINESS]: 60
  },
  // Pricing for video messages beyond daily limit
  BUNDLES: {
    SMALL: {
      videos: 10,
      price: '$2.99',
      priceInCents: 299,
      perVideoCost: 0.299
    },
    MEDIUM: {
      videos: 30,
      price: '$6.99',
      priceInCents: 699,
      perVideoCost: 0.233,
      label: 'Popular'
    },
    LARGE: {
      videos: 100,
      price: '$14.99',
      priceInCents: 1499,
      perVideoCost: 0.15,
      label: 'Best Value'
    }
  }
};

// Smart prompt thresholds
export const SMART_PROMPT_CONFIG = {
  LONG_MESSAGE_CHAR_THRESHOLD: 280, // Show "Looks like you have a lot to say..." after 280 chars
  MESSAGE_COUNT_WARNING_THRESHOLD: 8, // Show "Getting to know each other? Schedule video!" at message 8
  MESSAGE_COUNT_HARD_LIMIT: 10, // Hard stop at 10 messages/day per person before video
  NO_VIDEO_DECAY_DAYS: 3, // After 3 days without video, decay to 2 messages/day
  DECAYED_MESSAGE_LIMIT: 2 // Messages allowed after decay period
};

// Message credit pricing (2x penalty until 3 video calls with different people)
export const MESSAGE_CREDIT_PRICING = {
  // BEFORE 3 video calls with different people (2x penalty pricing)
  BEFORE_VIDEO_THRESHOLD: {
    PACK_SMALL: {
      credits: 20,
      price: '$1.99',
      priceInCents: 199,
      perMessageCost: 0.0995 // ~$0.10/msg
    },
    PACK_MEDIUM: {
      credits: 50,
      price: '$4.99',
      priceInCents: 499,
      perMessageCost: 0.0998 // ~$0.10/msg
    },
    PACK_LARGE: {
      credits: 100,
      price: '$9.99',
      priceInCents: 999,
      perMessageCost: 0.0999, // ~$0.10/msg
      label: 'Most Popular'
    }
  },
  // AFTER 3 video calls with different people (discounted pricing - reward)
  AFTER_VIDEO_THRESHOLD: {
    PACK_SMALL: {
      credits: 60,
      price: '$1.99',
      priceInCents: 199,
      perMessageCost: 0.0332, // ~$0.03/msg
      label: 'Quick Chat'
    },
    PACK_MEDIUM: {
      credits: 200,
      price: '$4.99',
      priceInCents: 499,
      perMessageCost: 0.025, // ~$0.025/msg
      label: 'Popular'
    },
    PACK_LARGE: {
      credits: 500,
      price: '$9.99',
      priceInCents: 999,
      perMessageCost: 0.02, // ~$0.02/msg
      label: 'Best Value'
    }
  },
  VIDEO_CALL_THRESHOLD: 3 // Complete video calls with 3 different people to unlock discounted pricing
};

// Premium features unlocked after video call (Business tier)
export const POST_VIDEO_PREMIUM_FEATURES = {
  PHOTO_SHARING: 'photo_sharing',
  VOICE_MESSAGES: 'voice_messages',
  GIF_REACTIONS: 'gif_reactions',
  READ_RECEIPTS: 'read_receipts',
  VIDEO_VERIFIED_BADGE: 'video_verified_badge'
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

/**
 * Get daily message limit for a tier
 * @param {string} tier - User's membership tier
 * @returns {number} Daily message limit
 */
export function getDailyMessageLimit(tier) {
  const limits = getTierLimits(tier);
  return limits.dailyMessages || 0;
}

/**
 * Get per-match daily message limit for a tier (Business tier only)
 * @param {string} tier - User's membership tier
 * @param {boolean} hasVideoCalledWith - Whether user has video called with this match
 * @returns {number|null} Per-match daily limit, or null if not applicable
 */
export function getPerMatchDailyLimit(tier, hasVideoCalledWith = false) {
  const limits = getTierLimits(tier);
  if (!limits.perMatchDailyMessages) {
    return null; // Not Business tier
  }
  
  return hasVideoCalledWith && limits.perMatchDailyMessagesAfterVideo
    ? limits.perMatchDailyMessagesAfterVideo
    : limits.perMatchDailyMessages;
}

/**
 * Get first-encounter message limit (applies to all tiers)
 * @param {string} tier - User's membership tier
 * @returns {number} First-encounter message limit
 */
export function getFirstEncounterMessageLimit(tier) {
  const limits = getTierLimits(tier);
  return limits.firstEncounterMessages || 10;
}

/**
 * Check if a user has premium messaging features unlocked with a match
 * (Requires Business tier + completed video call)
 * @param {string} tier - User's membership tier
 * @param {boolean} hasVideoCalledWith - Whether user has video called with this match
 * @returns {boolean} Whether premium features are unlocked
 */
export function hasPremiumMessagingFeatures(tier, hasVideoCalledWith) {
  return tier === MEMBERSHIP_TIERS.BUSINESS && hasVideoCalledWith;
}

/**
 * Build dynamic tier display data using database pricing + TIER_LIMITS features
 * This is the SINGLE SOURCE OF TRUTH for displaying membership tiers
 * @param {object} dbPricing - Pricing data from /api/admin/settings (pricing object from database)
 * @returns {Array} Array of tier objects with pricing from DB and features from TIER_LIMITS
 */
export function buildDynamicTiers(dbPricing) {
  const formatPrice = (cents) => {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(2)}/mo`;
  };

  return [
    {
      key: MEMBERSHIP_TIERS.FREE,
      title: "Free",
      price: formatPrice(0),
      priceCents: 0,
      photos: TIER_LIMITS.free.photos,
      videos: TIER_LIMITS.free.videos,
      videoDuration: TIER_LIMITS.free.videoMaxDuration,
      chatMinutes: TIER_LIMITS.free.chatMinutes,
      maxMeetings: TIER_LIMITS.free.maxMeetings,
      videoTrialDays: TIER_LIMITS.free.videoTrialDays,
      dailyMessages: TIER_LIMITS.free.dailyMessages,
      desc: "2-week video trial, then upgrade to continue",
      highlight: false,
    },
    {
      key: MEMBERSHIP_TIERS.CASUAL,
      title: "Casual",
      price: formatPrice(dbPricing?.tiers?.casual?.price_cents || 999),
      priceCents: dbPricing?.tiers?.casual?.price_cents || 999,
      photos: TIER_LIMITS.casual.photos,
      videos: TIER_LIMITS.casual.videos,
      videoDuration: TIER_LIMITS.casual.videoMaxDuration,
      chatMinutes: dbPricing?.tiers?.casual?.minutes || TIER_LIMITS.casual.chatMinutes,
      maxMeetings: TIER_LIMITS.casual.maxMeetings,
      dailyMessages: TIER_LIMITS.casual.dailyMessages,
      desc: "Expand your profile & chat time",
      highlight: true,
    },
    {
      key: MEMBERSHIP_TIERS.DATING,
      title: "Dating",
      price: formatPrice(dbPricing?.tiers?.dating?.price_cents || 2999),
      priceCents: dbPricing?.tiers?.dating?.price_cents || 2999,
      photos: TIER_LIMITS.dating.photos,
      videos: TIER_LIMITS.dating.videos,
      videoDuration: TIER_LIMITS.dating.videoMaxDuration,
      chatMinutes: dbPricing?.tiers?.dating?.minutes || TIER_LIMITS.dating.chatMinutes,
      maxMeetings: TIER_LIMITS.dating.maxMeetings,
      dailyMessages: TIER_LIMITS.dating.dailyMessages,
      desc: "Priority matching & longer chats",
      highlight: false,
    },
    {
      key: MEMBERSHIP_TIERS.BUSINESS,
      title: "Business",
      price: formatPrice(dbPricing?.tiers?.business?.price_cents || 4999),
      priceCents: dbPricing?.tiers?.business?.price_cents || 4999,
      photos: TIER_LIMITS.business.photos,
      videos: TIER_LIMITS.business.videos,
      videoDuration: TIER_LIMITS.business.videoMaxDuration,
      chatMinutes: dbPricing?.tiers?.business?.minutes || TIER_LIMITS.business.chatMinutes,
      maxMeetings: TIER_LIMITS.business.maxMeetings,
      dailyMessages: TIER_LIMITS.business.dailyMessages,
      perMatchDailyMessages: TIER_LIMITS.business.perMatchDailyMessages,
      perMatchDailyMessagesAfterVideo: TIER_LIMITS.business.perMatchDailyMessagesAfterVideo,
      desc: "Maximum exposure & unlimited features",
      highlight: false,
    },
  ];
}

/**
 * Build dynamic extension pricing from database
 * @param {object} dbPricing - Pricing data from /api/admin/settings
 * @returns {object} Extension pricing data
 */
export function buildDynamicExtensions(dbPricing) {
  const extensionData = dbPricing?.extensions?.[0];
  return {
    costPer10Minutes: extensionData?.cents ? extensionData.cents / 100 : EXTENSION_PRICING.costPer10Minutes,
    durationMinutes: extensionData?.minutes || EXTENSION_PRICING.durationMinutes,
    formattedPrice: extensionData?.cents ? `$${(extensionData.cents / 100).toFixed(2)}` : '$8.00',
  };
}

/**
 * Get message credit pricing based on user's video call completion count
 * @param {number} uniqueVideoCallCount - Number of completed video calls with different people
 * @returns {object} Message credit pricing (before or after threshold)
 */
export function getMessageCreditPricing(uniqueVideoCallCount) {
  const hasMetThreshold = uniqueVideoCallCount >= MESSAGE_CREDIT_PRICING.VIDEO_CALL_THRESHOLD;
  return hasMetThreshold 
    ? MESSAGE_CREDIT_PRICING.AFTER_VIDEO_THRESHOLD 
    : MESSAGE_CREDIT_PRICING.BEFORE_VIDEO_THRESHOLD;
}

/**
 * Get video message limits for a tier
 * @param {string} tier - User's membership tier
 * @returns {object} Video message limits { freePerDay, maxDuration }
 */
export function getVideoMessageLimits(tier) {
  const normalizedTier = tier?.toLowerCase() || MEMBERSHIP_TIERS.FREE;
  return {
    freePerDay: VIDEO_MESSAGE_PRICING.FREE_VIDEOS_PER_DAY[normalizedTier] || 3,
    maxDuration: VIDEO_MESSAGE_PRICING.MAX_DURATION_SECONDS[normalizedTier] || 10
  };
}

/**
 * Get per-person message limit before video call
 * @param {string} tier - User's membership tier
 * @returns {number} Messages allowed per person before first video
 */
export function getPerPersonMessageLimit(tier) {
  const limits = getTierLimits(tier);
  return limits.perPersonMessagesBeforeVideo || SMART_PROMPT_CONFIG.MESSAGE_COUNT_HARD_LIMIT;
}

/**
 * Get bonus messages after completing video call
 * @param {string} tier - User's membership tier
 * @returns {number} Bonus daily messages granted after video call
 */
export function getBonusMessagesAfterVideo(tier) {
  const limits = getTierLimits(tier);
  return limits.bonusMessagesAfterVideo || 0;
}

/**
 * Calculate effective daily message limit including video bonuses
 * @param {string} tier - User's membership tier
 * @param {number} completedVideoCalls - Number of video calls completed today
 * @returns {number} Total daily message limit
 */
export function getEffectiveDailyMessageLimit(tier, completedVideoCalls = 0) {
  const limits = getTierLimits(tier);
  const baseLimit = limits.dailyMessages || 15;
  const bonusPerCall = limits.bonusMessagesAfterVideo || 0;
  const totalBonus = bonusPerCall * Math.min(completedVideoCalls, 3); // Cap bonus at 3 calls
  return baseLimit + totalBonus;
}

/**
 * Check if message should trigger "long message" smart prompt
 * @param {string} messageText - The message being typed
 * @returns {boolean} Whether to show the prompt
 */
export function shouldShowLongMessagePrompt(messageText) {
  return messageText.length >= SMART_PROMPT_CONFIG.LONG_MESSAGE_CHAR_THRESHOLD;
}

/**
 * Check if message count should trigger warning prompt
 * @param {number} messageCount - Current message count with person
 * @returns {boolean} Whether to show warning
 */
export function shouldShowMessageCountWarning(messageCount) {
  return messageCount >= SMART_PROMPT_CONFIG.MESSAGE_COUNT_WARNING_THRESHOLD;
}

/**
 * Check if conversation should be in decay mode (no video after 3 days)
 * @param {Date} conversationStartDate - When conversation started
 * @param {boolean} hasHadVideoCall - Whether they've had a video call
 * @returns {boolean} Whether conversation is in decay mode
 */
export function isConversationInDecayMode(conversationStartDate, hasHadVideoCall) {
  if (hasHadVideoCall) return false;
  const daysSinceStart = (Date.now() - new Date(conversationStartDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceStart >= SMART_PROMPT_CONFIG.NO_VIDEO_DECAY_DAYS;
}

/**
 * Get message limit for decayed conversation
 * @returns {number} Message limit for decayed conversations
 */
export function getDecayedMessageLimit() {
  return SMART_PROMPT_CONFIG.DECAYED_MESSAGE_LIMIT;
}

// Membership tier constants and helper functions
// This is a mobile version that mirrors the web version for consistency

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
    videoMaxDuration: 15,
    chatMinutes: 5,
    maxMeetings: 3,
    videoTrialDays: 14, // 2-week free trial for video features from first call
    dailyMessages: 15,
    perMatchDailyMessages: null,
    firstEncounterMessages: 10
  },
  [MEMBERSHIP_TIERS.CASUAL]: {
    photos: 6,
    videos: 1,
    videoMaxDuration: 30,
    chatMinutes: 15,
    maxMeetings: Infinity,
    dailyMessages: 24,
    perMatchDailyMessages: null,
    firstEncounterMessages: 10
  },
  [MEMBERSHIP_TIERS.DATING]: {
    photos: 10,
    videos: 2,
    videoMaxDuration: 60,
    chatMinutes: 25,
    maxMeetings: Infinity,
    dailyMessages: 50,
    perMatchDailyMessages: null,
    firstEncounterMessages: 10
  },
  [MEMBERSHIP_TIERS.BUSINESS]: {
    photos: 20,
    videos: 2,
    videoMaxDuration: 60,
    chatMinutes: 45,
    maxMeetings: Infinity,
    dailyMessages: 500,
    perMatchDailyMessages: 50,
    perMatchDailyMessagesAfterVideo: 75,
    firstEncounterMessages: 10
  }
};

export function getTierLimits(tier) {
  const normalizedTier = tier?.toLowerCase() || MEMBERSHIP_TIERS.FREE;
  return TIER_LIMITS[normalizedTier] || TIER_LIMITS[MEMBERSHIP_TIERS.FREE];
}

export function formatMeetingsDisplay(maxMeetings) {
  if (maxMeetings === Infinity) {
    return 'Unlimited meetings';
  }
  return `${maxMeetings} meeting${maxMeetings === 1 ? '' : 's'}/day`;
}

export function formatMessagesDisplay(dailyMessages, perMatchMessages = null) {
  if (dailyMessages >= 500) {
    return 'Unlimited messages';
  }
  if (perMatchMessages) {
    return `${perMatchMessages} msgs/match/day`;
  }
  return `${dailyMessages} messages/day`;
}

/**
 * Build dynamic tier display data using database pricing + TIER_LIMITS features
 * This is the SINGLE SOURCE OF TRUTH for displaying membership tiers on mobile
 * @param {object} dbPricing - Pricing data from /api/admin/settings (pricing object from database)
 * @returns {Array} Array of tier objects with pricing from DB and features from TIER_LIMITS
 */
export function buildDynamicTiers(dbPricing) {
  const formatPrice = (cents) => {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(2)}/mo`;
  };

  const buildDesc = (tier, photos, videos, chatMinutes) => {
    if (tier === 'free') {
      return `2-week video trial, then upgrade to continue`;
    }
    return `${photos} photos, ${videos} video${videos !== 1 ? 's' : ''}, ${chatMinutes}min calls`;
  };

  const casual = {
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
  };

  const dating = {
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
  };

  const business = {
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
      desc: buildDesc('free', TIER_LIMITS.free.photos, TIER_LIMITS.free.videos, TIER_LIMITS.free.chatMinutes),
      highlight: false,
    },
    {
      ...casual,
      desc: buildDesc('casual', casual.photos, casual.videos, casual.chatMinutes),
      highlight: false,
    },
    {
      ...dating,
      desc: buildDesc('dating', dating.photos, dating.videos, dating.chatMinutes),
      highlight: true,
    },
    {
      ...business,
      desc: buildDesc('business', business.photos, business.videos, business.chatMinutes),
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
    costPer10Minutes: extensionData?.cents ? extensionData.cents / 100 : 8.00,
    durationMinutes: extensionData?.minutes || 10,
    formattedPrice: extensionData?.cents ? `$${(extensionData.cents / 100).toFixed(2)}` : '$8.00',
  };
}

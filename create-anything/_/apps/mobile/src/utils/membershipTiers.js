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
    price: 'Free',
    priceMonthly: 0,
    dailyMessages: 15,
    perMatchDailyMessages: null,
    firstEncounterMessages: 10
  },
  [MEMBERSHIP_TIERS.CASUAL]: {
    photos: 6,
    videos: 3,
    videoMaxDuration: 30,
    chatMinutes: 15,
    maxMeetings: Infinity,
    price: '$9.99/mo',
    priceMonthly: 9.99,
    dailyMessages: 24,
    perMatchDailyMessages: null,
    firstEncounterMessages: 10
  },
  [MEMBERSHIP_TIERS.DATING]: {
    photos: 10,
    videos: 1,
    videoMaxDuration: 60,
    chatMinutes: 25,
    maxMeetings: Infinity,
    price: '$29.99/mo',
    priceMonthly: 29.99,
    dailyMessages: 50,
    perMatchDailyMessages: null,
    firstEncounterMessages: 10
  },
  [MEMBERSHIP_TIERS.BUSINESS]: {
    photos: 20,
    videos: 1,
    videoMaxDuration: 60,
    chatMinutes: 45,
    maxMeetings: Infinity,
    price: '$49.99/mo',
    priceMonthly: 49.99,
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

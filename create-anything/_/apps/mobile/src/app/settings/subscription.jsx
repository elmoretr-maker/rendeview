import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: "#7c3aed",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
  accent: "#00BFA6",
  gray50: "#F9F9F9",
  gray600: "#6B7280",
};

const STYLES = {
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
};

const TIERS = [
  {
    key: "free",
    title: "Free",
    price: "Free",
    photos: 2,
    videos: 1,
    videoDuration: 15,
    chatMinutes: 5,
    maxMeetings: 3,
    dailyMessages: 15,
    desc: "Get started with basic features",
  },
  {
    key: "casual",
    title: "Casual",
    price: "$9.99/mo",
    photos: 6,
    videos: 3,
    videoDuration: 30,
    chatMinutes: 15,
    maxMeetings: Infinity,
    dailyMessages: 24,
    desc: "Expand your profile & chat time",
  },
  {
    key: "dating",
    title: "Dating",
    price: "$29.99/mo",
    photos: 10,
    videos: 1,
    videoDuration: 60,
    chatMinutes: 25,
    maxMeetings: Infinity,
    dailyMessages: 50,
    desc: "Priority matching & longer chats",
  },
  {
    key: "business",
    title: "Business",
    price: "$49.99/mo",
    photos: 20,
    videos: 1,
    videoDuration: 60,
    chatMinutes: 45,
    maxMeetings: Infinity,
    dailyMessages: 500,
    perMatchDailyMessages: 50,
    perMatchDailyMessagesAfterVideo: 75,
    desc: "Maximum exposure & unlimited features",
  },
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState(null);
  const [error, setError] = useState(null);
  const [scheduledTier, setScheduledTier] = useState(null);
  const [tierChangeAt, setTierChangeAt] = useState(null);
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (mounted) {
          setCurrentTier(data?.user?.membership_tier || "free");
          setScheduledTier(data?.user?.scheduled_tier || null);
          setTierChangeAt(data?.user?.tier_change_at || null);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setError("Failed to load subscription info");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const upgradeTier = useCallback(
    async (key) => {
      try {
        setLoading(true);
        setError(null);

        if (key === "free") {
          Alert.alert("Free Plan", "You're already on the Free plan");
          return;
        }

        const redirectURL = `${process.env.EXPO_PUBLIC_BASE_URL}/settings/subscription`;
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "subscription",
            tier: key,
            redirectURL,
          }),
        });

        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t?.error || "Could not start checkout");
        }

        const { url } = await res.json();
        if (url) {
          router.push({ pathname: "/stripe", params: { checkoutUrl: url } });
        } else {
          throw new Error("Missing checkout url");
        }
      } catch (e) {
        console.error(e);
        setError(e.message);
        Alert.alert("Upgrade", e.message);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const cancelScheduledDowngrade = useCallback(async () => {
    try {
      Alert.alert(
        "Cancel Downgrade",
        "Cancel your scheduled downgrade? You will continue on your current plan and will be charged at renewal.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              try {
                setLoading(true);
                setError(null);

                const res = await fetch("/api/payments/cancel-downgrade", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) {
                  const t = await res.json().catch(() => ({}));
                  throw new Error(t?.error || "Could not cancel downgrade");
                }

                const data = await res.json();
                Alert.alert("Success", data.message || "Scheduled downgrade cancelled successfully");
                setScheduledTier(null);
                setTierChangeAt(null);
                
                // Reload profile data
                const profileRes = await fetch("/api/profile");
                if (profileRes.ok) {
                  const profileData = await profileRes.json();
                  setCurrentTier(profileData?.user?.membership_tier || "free");
                  setScheduledTier(profileData?.user?.scheduled_tier || null);
                  setTierChangeAt(profileData?.user?.tier_change_at || null);
                }
              } catch (e) {
                console.error(e);
                setError(e.message);
                Alert.alert("Error", e.message);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  const downgradeTier = useCallback(
    async (key) => {
      if (key === currentTier) {
        Alert.alert("Current Plan", "You're already on this plan");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const tierName = TIERS.find((t) => t.key === key)?.title;

        Alert.alert(
          "Confirm Downgrade",
          `Are you sure you want to downgrade to the ${tierName} plan? The change will take effect at the end of your current billing cycle. You'll keep your current benefits until then.`,
          [
            { text: "Cancel", style: "cancel", onPress: () => setLoading(false) },
            {
              text: "Downgrade",
              style: "destructive",
              onPress: async () => {
                try {
                  const res = await fetch("/api/payments/downgrade", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tier: key }),
                  });

                  if (!res.ok) {
                    const t = await res.json().catch(() => ({}));
                    throw new Error(t?.error || "Could not downgrade");
                  }

                  const data = await res.json();
                  Alert.alert("Success", data.message || "Downgrade scheduled successfully");
                  setScheduledTier(data.scheduledTier);
                  setTierChangeAt(data.tierChangeAt);
                  router.push("/settings/subscription");
                } catch (e) {
                  console.error(e);
                  setError(e.message);
                  Alert.alert("Error", e.message);
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
      } catch (e) {
        console.error(e);
        setError(e.message);
        Alert.alert("Error", e.message);
        setLoading(false);
      }
    },
    [currentTier, router],
  );

  const getTierRank = (tierKey) => {
    const ranks = { free: 0, casual: 1, dating: 2, business: 3 };
    return ranks[tierKey] || 0;
  };

  const currentTierRank = getTierRank(currentTier);
  const currentTierData = TIERS.find((t) => t.key === currentTier);

  return (
    <View
      style={{ flex: 1, backgroundColor: COLORS.lightGray, paddingTop: insets.top }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: COLORS.white,
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={{ marginRight: 4 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Ionicons name="diamond" size={28} color={COLORS.primary} />
          <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}>
            Subscription
          </Text>
        </View>
        <Text style={{ marginLeft: 60, color: COLORS.text, opacity: 0.7, fontFamily: "Inter_400Regular" }}>
          Manage your membership plan
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Current Plan */}
        {currentTier && currentTierData && (
          <View
            style={{
              backgroundColor: COLORS.white,
              padding: 20,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: COLORS.primary,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: COLORS.text,
                    opacity: 0.7,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  Current Plan
                </Text>
                <Text
                  style={{ fontSize: 24, fontWeight: "700", color: COLORS.primary, fontFamily: "Inter_700Bold" }}
                >
                  {currentTierData.title}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: COLORS.lightGray,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                <Text
                  style={{ fontWeight: "700", fontSize: 14, color: COLORS.accent, fontFamily: "Inter_700Bold" }}
                >
                  Active
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={{ color: COLORS.text, marginBottom: 4, fontFamily: "Inter_400Regular" }}>
                ✓ {currentTierData.photos} Profile Photos
              </Text>
              <Text style={{ color: COLORS.text, marginBottom: 4, fontFamily: "Inter_400Regular" }}>
                ✓ {currentTierData.videos} Video{currentTierData.videos !== 1 ? "s" : ""} (
                {currentTierData.videoDuration}s max each)
              </Text>
              <Text style={{ color: COLORS.text, marginBottom: 4, fontFamily: "Inter_400Regular" }}>
                ✓ {currentTierData.chatMinutes} Minutes Video Chat
              </Text>
              {currentTierData.maxMeetings !== undefined &&
                currentTierData.maxMeetings !== Infinity && (
                  <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}>
                    ✓ {currentTierData.maxMeetings} Meeting Limit
                  </Text>
                )}
            </View>
          </View>
        )}

        {/* Scheduled Downgrade Alert */}
        {scheduledTier && tierChangeAt && (
          <View
            style={{
              backgroundColor: "#FFF7ED",
              padding: 20,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: "#FB923C",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#FED7AA",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="time-outline" size={24} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_700Bold" }}>
                  Scheduled Downgrade
                </Text>
                <Text style={{ fontSize: 13, color: "#9A3412", marginTop: 2, fontFamily: "Inter_400Regular" }}>
                  Your plan will change on {new Date(tierChangeAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: "#FFEDD5",
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#9A3412", marginBottom: 6, fontFamily: "Inter_600SemiBold" }}>
                Current: {TIERS.find(t => t.key === currentTier)?.title}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#9A3412", fontFamily: "Inter_600SemiBold" }}>
                Scheduled: {TIERS.find(t => t.key === scheduledTier)?.title}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: "#9A3412", lineHeight: 20, fontFamily: "Inter_400Regular" }}>
              You will retain your current {TIERS.find(t => t.key === currentTier)?.title} benefits until {new Date(tierChangeAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </Text>
            <Pressable
              onPress={cancelScheduledDowngrade}
              disabled={loading}
              style={{
                marginTop: 16,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: "#FFFFFF",
                borderWidth: 2,
                borderColor: "#FB923C",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "700", color: "#EA580C", fontFamily: "Inter_700Bold" }}>
                {loading ? "Cancelling..." : "Cancel Scheduled Downgrade"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Available Plans */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: COLORS.text,
            marginBottom: 12,
            fontFamily: "Inter_700Bold",
          }}
        >
          {currentTier === "free" ? "Upgrade Your Plan" : "Available Plans"}
        </Text>

        {TIERS.map((t) => {
          const isCurrent = t.key === currentTier;
          const isDowngrade = getTierRank(t.key) < currentTierRank;
          const isUpgrade = getTierRank(t.key) > currentTierRank;

          return (
            <View
              key={t.key}
              style={[
                STYLES.card,
                {
                  backgroundColor: isCurrent ? "#F3E8FF" : COLORS.white,
                  borderWidth: 2,
                  borderColor: isCurrent ? COLORS.primary : "#E5E7EB",
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}
                >
                  {t.title}
                </Text>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: COLORS.primary, fontFamily: "Inter_700Bold" }}
                >
                  {t.price}
                </Text>
              </View>

              <Text
                style={{
                  color: COLORS.text,
                  opacity: 0.8,
                  marginBottom: 8,
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                }}
              >
                {t.desc}
              </Text>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: COLORS.text, fontSize: 13, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
                  • {t.photos} Profile Photos
                </Text>
                <Text style={{ color: COLORS.text, fontSize: 13, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
                  • {t.videos} Profile Video{t.videos !== 1 ? "s" : ""} ({t.videoDuration}s max each)
                </Text>
                <Text style={{ color: COLORS.text, fontSize: 13, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
                  • {t.chatMinutes} Min Video Calls
                </Text>
                {t.maxMeetings !== undefined && t.maxMeetings !== Infinity ? (
                  <Text style={{ color: COLORS.text, fontSize: 13, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
                    • {t.maxMeetings} Video Meetings/Day
                  </Text>
                ) : (
                  <Text style={{ color: COLORS.text, fontSize: 13, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
                    • Unlimited Video Meetings
                  </Text>
                )}
                <Text style={{ color: COLORS.text, fontSize: 13, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
                  • {t.dailyMessages} Messages/Day
                </Text>
                {t.perMatchDailyMessages && (
                  <Text style={{ color: COLORS.text, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                    • {t.perMatchDailyMessages}/{t.perMatchDailyMessagesAfterVideo || t.perMatchDailyMessages} Messages/Match/Day{t.perMatchDailyMessagesAfterVideo ? ' (after video)' : ''}
                  </Text>
                )}
              </View>

              {isCurrent ? (
                <View
                  style={{
                    paddingVertical: 10,
                    alignItems: "center",
                    backgroundColor: COLORS.lightGray,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{ fontWeight: "700", fontSize: 14, color: COLORS.text, fontFamily: "Inter_700Bold" }}
                  >
                    Current Plan
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => isDowngrade ? downgradeTier(t.key) : upgradeTier(t.key)}
                  disabled={loading}
                  style={[
                    STYLES.button,
                    loading && { opacity: 0.5 },
                  ]}
                >
                  <Text style={STYLES.buttonText}>
                    {loading
                      ? "Please wait..."
                      : isDowngrade
                        ? `Downgrade to ${t.title}`
                        : isUpgrade
                          ? `Upgrade to ${t.title}`
                          : `Switch to ${t.title}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Additional Services & Fees */}
        <View
          style={{
            backgroundColor: COLORS.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 12, fontFamily: "Inter_700Bold" }}
          >
            Additional Services & Fees
          </Text>

          {/* Call Extensions */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.primary, fontFamily: "Inter_600SemiBold" }}>
                Video Call Extensions
              </Text>
              <View style={{ backgroundColor: "#10B981", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" }}>$8.00</Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.text,
                opacity: 0.7,
                marginBottom: 8,
                fontFamily: "Inter_400Regular",
              }}
            >
              Running out of time during an important conversation? Extend any video call by 10 minutes for $8.00. Purchase extensions directly during a call when your timer shows less than 1 minute remaining.
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
              • Extensions purchased during active calls
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
              • "Extend Call" button appears at 1 min remaining
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
              • Multiple extensions allowed per call
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, fontFamily: "Inter_400Regular" }}>
              • Available on all tiers
            </Text>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 16 }} />

          {/* Message Credits */}
          <View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.primary, marginBottom: 8, fontFamily: "Inter_600SemiBold" }}>
              Message Credit Packs
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.text,
                opacity: 0.7,
                marginBottom: 12,
                fontFamily: "Inter_400Regular",
              }}
            >
              Need more messages beyond your daily limit? Purchase message credits to keep the conversation going. Credits never expire.
            </Text>

            {/* Credit Packs */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 10, color: COLORS.gray600, marginBottom: 4, fontFamily: "Inter_400Regular" }}>Small Pack</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" }}>10 Messages</Text>
                <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>$1.99</Text>
              </View>
              <View style={{ flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 10, color: COLORS.gray600, marginBottom: 4, fontFamily: "Inter_400Regular" }}>Medium Pack</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" }}>20 Messages</Text>
                <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>$3.99</Text>
              </View>
              <View style={{ flex: 1, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: "#F5F3FF", borderRadius: 8, padding: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, color: COLORS.gray600, fontFamily: "Inter_400Regular" }}>Large Pack</Text>
                  <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 8, color: "#FFF", fontFamily: "Inter_600SemiBold" }}>BEST</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" }}>50 Messages</Text>
                <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>$7.99</Text>
              </View>
            </View>

            <Text style={{ fontSize: 11, color: COLORS.gray600, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
              • Credits used when daily limit reached
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
              • Purchase from chat screen when needed
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, marginBottom: 2, fontFamily: "Inter_400Regular" }}>
              • Credits never expire, roll over indefinitely
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, fontFamily: "Inter_400Regular" }}>
              • Use with any tier
            </Text>
          </View>
        </View>

        {/* How Messaging Works */}
        <View
          style={{
            backgroundColor: COLORS.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12, fontFamily: "Inter_700Bold" }}
          >
            How Messaging Works
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.primary, marginBottom: 8, fontFamily: "Inter_600SemiBold" }}>
            Message Deduction Priority:
          </Text>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>1. First Encounter Messages (10 free)</Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, fontFamily: "Inter_400Regular" }}>Get to know each new match with 10 complimentary messages</Text>
          </View>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>2. Daily Tier Limit</Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, fontFamily: "Inter_400Regular" }}>Use your tier's daily allowance (15-500 messages)</Text>
          </View>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>3. Message Credits</Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, fontFamily: "Inter_400Regular" }}>Purchased credits used after daily limit exhausted</Text>
          </View>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>4. Per-Match Limit (Business Only)</Text>
            <Text style={{ fontSize: 11, color: COLORS.gray600, fontFamily: "Inter_400Regular" }}>50 messages/match/day (increases to 75 after video call)</Text>
          </View>

          <View style={{ backgroundColor: "#F5F3FF", padding: 12, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 4, fontFamily: "Inter_600SemiBold" }}>Example Scenario:</Text>
            <Text style={{ fontSize: 11, color: COLORS.text, fontFamily: "Inter_400Regular" }}>
              Free tier user matches → 10 first encounter messages → Uses those → 15 daily messages → Uses all → 
              Buy credit pack → Continue messaging → Tomorrow resets to 15 new messages
            </Text>
          </View>
        </View>

        {/* Upgrade Benefits */}
        <View
          style={{
            backgroundColor: COLORS.primary,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontSize: 18, fontWeight: "700", color: "#FFF", marginBottom: 12, fontFamily: "Inter_700Bold" }}
          >
            Why Upgrade?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View style={{ width: "48%" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFF", marginBottom: 4, fontFamily: "Inter_600SemiBold" }}>
                📸 More Photos & Videos
              </Text>
              <Text style={{ fontSize: 11, color: "#FFF", opacity: 0.9, fontFamily: "Inter_400Regular" }}>
                Up to 20 photos to showcase yourself
              </Text>
            </View>
            <View style={{ width: "48%" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFF", marginBottom: 4, fontFamily: "Inter_600SemiBold" }}>
                ⏱️ Longer Video Calls
              </Text>
              <Text style={{ fontSize: 11, color: "#FFF", opacity: 0.9, fontFamily: "Inter_400Regular" }}>
                Chat for up to 45 minutes
              </Text>
            </View>
            <View style={{ width: "48%" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFF", marginBottom: 4, fontFamily: "Inter_600SemiBold" }}>
                🎯 Unlimited Meetings
              </Text>
              <Text style={{ fontSize: 11, color: "#FFF", opacity: 0.9, fontFamily: "Inter_400Regular" }}>
                No daily video meeting limits
              </Text>
            </View>
            <View style={{ width: "48%" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFF", marginBottom: 4, fontFamily: "Inter_600SemiBold" }}>
                💬 More Messages
              </Text>
              <Text style={{ fontSize: 11, color: "#FFF", opacity: 0.9, fontFamily: "Inter_400Regular" }}>
                Send up to 500 messages daily
              </Text>
            </View>
          </View>
        </View>

        {error && (
          <View
            style={{
              padding: 12,
              backgroundColor: "#FEE2E2",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#B91C1C", fontFamily: "Inter_400Regular" }}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {loading && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: insets.bottom + 12,
            alignItems: "center",
          }}
        >
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}
    </View>
  );
}

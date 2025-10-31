import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
  accent: "#00BFA6",
};

const TIERS = [
  {
    key: "free",
    title: "Free",
    price: "Free",
    photos: 3,
    videos: 1,
    videoDuration: 15,
    chatMinutes: 5,
    maxMeetings: 3,
    desc: "Get started with basic features",
  },
  {
    key: "casual",
    title: "Casual",
    price: "$14.99/mo",
    photos: 5,
    videos: 1,
    videoDuration: 30,
    chatMinutes: 15,
    desc: "Expand your profile & chat time",
  },
  {
    key: "dating",
    title: "Dating",
    price: "$29.99/mo",
    photos: 8,
    videos: 2,
    videoDuration: 60,
    chatMinutes: 30,
    desc: "Priority matching & longer chats",
  },
  {
    key: "business",
    title: "Business",
    price: "$49.99/mo",
    photos: 10,
    videos: 3,
    videoDuration: 300,
    chatMinutes: 60,
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="diamond" size={28} color={COLORS.primary} />
          <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.text }}>
            Subscription
          </Text>
        </View>
        <Text style={{ marginTop: 4, color: COLORS.text, opacity: 0.7 }}>
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
                  }}
                >
                  Current Plan
                </Text>
                <Text
                  style={{ fontSize: 24, fontWeight: "700", color: COLORS.primary }}
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
                  style={{ fontWeight: "700", fontSize: 14, color: COLORS.accent }}
                >
                  Active
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={{ color: COLORS.text, marginBottom: 4 }}>
                ✓ {currentTierData.photos} Profile Photos
              </Text>
              <Text style={{ color: COLORS.text, marginBottom: 4 }}>
                ✓ {currentTierData.videos} Video{currentTierData.videos !== 1 ? "s" : ""} (
                {currentTierData.videoDuration}s max each)
              </Text>
              <Text style={{ color: COLORS.text, marginBottom: 4 }}>
                ✓ {currentTierData.chatMinutes} Minutes Video Chat
              </Text>
              {currentTierData.maxMeetings !== undefined &&
                currentTierData.maxMeetings !== Infinity && (
                  <Text style={{ color: COLORS.text }}>
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
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#EA580C" }}>
                  Scheduled Downgrade
                </Text>
                <Text style={{ fontSize: 13, color: "#9A3412", marginTop: 2 }}>
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
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#9A3412", marginBottom: 6 }}>
                Current: {TIERS.find(t => t.key === currentTier)?.title}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#9A3412" }}>
                Scheduled: {TIERS.find(t => t.key === scheduledTier)?.title}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: "#9A3412", lineHeight: 20 }}>
              You will retain your current {TIERS.find(t => t.key === currentTier)?.title} benefits until {new Date(tierChangeAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </Text>
          </View>
        )}

        {/* Available Plans */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: COLORS.text,
            marginBottom: 12,
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
              style={{
                backgroundColor: isCurrent ? "#F9F5FF" : COLORS.white,
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: isCurrent ? COLORS.primary : "#E5E7EB",
              }}
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
                  style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}
                >
                  {t.title}
                </Text>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: COLORS.primary }}
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
                }}
              >
                {t.desc}
              </Text>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: COLORS.text, fontSize: 13, marginBottom: 2 }}>
                  • {t.photos} Profile Photos
                </Text>
                <Text style={{ color: COLORS.text, fontSize: 13, marginBottom: 2 }}>
                  • {t.videos} Video{t.videos !== 1 ? "s" : ""} ({t.videoDuration}s max
                  each)
                </Text>
                <Text style={{ color: COLORS.text, fontSize: 13, marginBottom: 2 }}>
                  • {t.chatMinutes} Minutes Video Chat
                </Text>
                {t.maxMeetings !== undefined && t.maxMeetings !== Infinity && (
                  <Text style={{ color: COLORS.text, fontSize: 13 }}>
                    • {t.maxMeetings} Meeting Limit
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
                    style={{ fontWeight: "700", fontSize: 14, color: COLORS.text }}
                  >
                    Current Plan
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => isDowngrade ? downgradeTier(t.key) : upgradeTier(t.key)}
                  disabled={loading}
                  style={{
                    backgroundColor: COLORS.primary,
                    paddingVertical: 10,
                    borderRadius: 8,
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
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

        {/* Call Extensions */}
        <View
          style={{
            backgroundColor: COLORS.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}
          >
            Call Extensions
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.text,
              opacity: 0.7,
              marginBottom: 8,
            }}
          >
            Extend any video call beyond your tier's limit
          </Text>
          <Text style={{ fontWeight: "700", color: COLORS.accent }}>
            • $8.00 for 10 minutes
          </Text>
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
            <Text style={{ color: "#B91C1C" }}>{error}</Text>
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

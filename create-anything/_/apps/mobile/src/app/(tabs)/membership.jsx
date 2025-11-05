import React, { useCallback, useEffect, useState, useMemo } from "react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { TIER_LIMITS, MEMBERSHIP_TIERS, getTierLimits, formatMeetingsDisplay, formatMessagesDisplay } from "@/utils/membershipTiers";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
};

function buildTierDisplay(tierKey, limits, dbPricing) {
  const name = tierKey.charAt(0).toUpperCase() + tierKey.slice(1);
  
  let priceCents = 0;
  let chatMinutes = limits.chatMinutes;
  
  if (tierKey !== 'free' && dbPricing?.tiers?.[tierKey]) {
    priceCents = dbPricing.tiers[tierKey].price_cents || 0;
    chatMinutes = dbPricing.tiers[tierKey].minutes || limits.chatMinutes;
  }
  
  const priceDisplay = priceCents === 0 ? "$0" : `$${(priceCents / 100).toFixed(2)}`;
  const period = priceCents === 0 ? "forever" : "/month";
  
  const photoVideoText = limits.videos > 1 
    ? `${limits.photos} photos + ${limits.videos} videos`
    : `${limits.photos} photos + ${limits.videos} video`;
  
  const meetingsText = formatMeetingsDisplay(limits.maxMeetings);
  const messagesText = formatMessagesDisplay(limits.dailyMessages, limits.perMatchDailyMessages);
  const videoCallText = `${chatMinutes}-min video calls`;
  
  const matchingTier = tierKey === MEMBERSHIP_TIERS.BUSINESS 
    ? "VIP matching" 
    : tierKey === MEMBERSHIP_TIERS.DATING 
    ? "Priority matching" 
    : tierKey === MEMBERSHIP_TIERS.CASUAL
    ? "Smart matching"
    : "Basic matching";
  
  return {
    name,
    price: priceDisplay,
    period,
    popular: tierKey === MEMBERSHIP_TIERS.DATING,
    features: [
      meetingsText,
      photoVideoText,
      videoCallText,
      messagesText,
      matchingTier,
    ],
  };
}

export default function Membership() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { data: userData, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to load user data");
      return res.json();
    },
  });

  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load pricing");
      const data = await res.json();
      return data?.settings?.pricing || null;
    },
  });

  const currentTier = userData?.membership_tier || "free";

  const TIERS = useMemo(() => ({
    [MEMBERSHIP_TIERS.FREE]: buildTierDisplay(MEMBERSHIP_TIERS.FREE, TIER_LIMITS[MEMBERSHIP_TIERS.FREE], pricingData),
    [MEMBERSHIP_TIERS.CASUAL]: buildTierDisplay(MEMBERSHIP_TIERS.CASUAL, TIER_LIMITS[MEMBERSHIP_TIERS.CASUAL], pricingData),
    [MEMBERSHIP_TIERS.DATING]: buildTierDisplay(MEMBERSHIP_TIERS.DATING, TIER_LIMITS[MEMBERSHIP_TIERS.DATING], pricingData),
    [MEMBERSHIP_TIERS.BUSINESS]: buildTierDisplay(MEMBERSHIP_TIERS.BUSINESS, TIER_LIMITS[MEMBERSHIP_TIERS.BUSINESS], pricingData),
  }), [pricingData]);

  const upgradeMutation = useMutation({
    mutationFn: async (tier) => {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error("Failed to create checkout");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        router.push(`/stripe?url=${encodeURIComponent(data.url)}`);
      }
    },
    onError: () => {
      Alert.alert("Error", "Could not start upgrade process");
    },
  });

  const handleUpgrade = (tier) => {
    if (tier === "free") {
      Alert.alert("Info", "You're already on the Free tier");
      return;
    }
    upgradeMutation.mutate(tier);
  };

  if (isLoading || pricingLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          paddingTop: insets.top,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        {pricingLoading && !isLoading && (
          <Text style={{ marginTop: 12, color: COLORS.text, fontFamily: "Inter_400Regular" }}>
            Loading pricing...
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Ionicons name="diamond" size={28} color={COLORS.primary} />
          <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}>
            Membership
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: "#666", marginBottom: 24, fontFamily: "Inter_400Regular" }}>
          Your current tier: <Text style={{ fontWeight: "700", color: COLORS.primary, fontFamily: "Inter_700Bold" }}>{TIERS[currentTier].name}</Text>
        </Text>

        {Object.entries(TIERS).map(([key, tier]) => (
          <View
            key={key}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: tier.popular ? COLORS.secondary : "#E5E7EB",
              position: "relative",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            {tier.popular && (
              <View
                style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: [{ translateX: -40 }],
                  backgroundColor: COLORS.secondary,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" }}>
                  MOST POPULAR
                </Text>
              </View>
            )}

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}>
                {tier.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "700", color: COLORS.primary, fontFamily: "Inter_700Bold" }}>
                  {tier.price}
                </Text>
                <Text style={{ fontSize: 14, color: "#666", marginLeft: 4, fontFamily: "Inter_400Regular" }}>
                  {tier.period}
                </Text>
              </View>
            </View>

            <View style={{ gap: 8, marginBottom: 16 }}>
              {tier.features.map((feature, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                  <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: "Inter_400Regular" }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {currentTier === key ? (
              <View
                style={{
                  backgroundColor: COLORS.primary + "20",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: COLORS.primary, fontWeight: "700", fontFamily: "Inter_700Bold" }}>
                  Current Plan
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => handleUpgrade(key)}
                disabled={upgradeMutation.isPending}
                style={{
                  backgroundColor: tier.popular ? COLORS.secondary : COLORS.primary,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: upgradeMutation.isPending ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" }}>
                  {key === "free" ? "Downgrade" : "Upgrade to " + tier.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <View style={{ marginTop: 16, paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: "#999", textAlign: "center", fontFamily: "Inter_400Regular" }}>
            Need help? Contact support from Profile → Settings
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

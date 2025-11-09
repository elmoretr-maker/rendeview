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
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { buildDynamicTiers, buildDynamicExtensions } from "@/utils/membershipTiers";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
  accent: "#00BFA6",
};

function MembershipScreenContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [error, setError] = useState(null);
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const totalSteps = 4;
  const stepIndex = 3;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Failed to load pricing");
        const data = await res.json();
        if (mounted) {
          setPricing(data?.settings?.pricing || null);
          setLoadingPricing(false);
        }
      } catch (e) {
        console.error("Failed to load pricing:", e);
        if (mounted) {
          setLoadingPricing(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const tiers = useMemo(() => buildDynamicTiers(pricing), [pricing]);
  const extensions = useMemo(() => buildDynamicExtensions(pricing), [pricing]);

  const chooseTier = useCallback(
    async (key) => {
      try {
        setLoading(true);
        setError(null);
        if (key === "free") {
          const res = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membership_tier: "free" }),
          });
          if (!res.ok) throw new Error("Failed to set tier");
          router.replace("/onboarding/profile");
          return;
        }
        // Paid tiers -> Stripe Checkout via backend
        const redirectURL = process.env.EXPO_PUBLIC_BASE_URL;
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
        Alert.alert("Payment", e.message);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: COLORS.white, paddingTop: insets.top }}
    >
      {/* Progress bar */}
      <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
        <View
          style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 999 }}
        >
          <View
            style={{
              height: 6,
              width: progressPct,
              backgroundColor: COLORS.primary,
              borderRadius: 999,
            }}
          />
        </View>
        <Text style={{ marginTop: 6, color: COLORS.text, opacity: 0.7, fontFamily: "Inter_400Regular" }}>
          Step {stepIndex} of {totalSteps}
        </Text>
      </View>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.push("/onboarding/consent")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#6B7280" />
        <Text style={{ marginLeft: 8, color: "#6B7280", fontSize: 16, fontFamily: "Inter_400Regular" }}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: COLORS.text,
            marginBottom: 8,
            fontFamily: "Inter_700Bold",
          }}
        >
          Choose your plan
        </Text>
        <Text style={{ color: COLORS.text, opacity: 0.7, marginBottom: 16, fontFamily: "Inter_400Regular" }}>
          Select a membership to unlock features. You can upgrade anytime.
        </Text>

        {loadingPricing ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.text, fontFamily: "Inter_400Regular" }}>
              Loading pricing...
            </Text>
          </View>
        ) : (
          <>
        {tiers.map((t) => (
          <View
            key={t.key}
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              backgroundColor: t.highlight ? "#F9F5FF" : COLORS.white,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}
              >
                {t.title}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: COLORS.primary,
                  fontFamily: "Inter_700Bold",
                }}
              >
                {t.price}
              </Text>
            </View>
            <Text style={{ color: COLORS.text, opacity: 0.8, marginTop: 6, fontFamily: "Inter_400Regular" }}>
              {t.desc}
            </Text>
            <TouchableOpacity
              onPress={() => chooseTier(t.key)}
              disabled={loading}
              style={{
                backgroundColor: COLORS.primary,
                paddingVertical: 12,
                borderRadius: 10,
                marginTop: 12,
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  color: COLORS.white,
                  textAlign: "center",
                  fontWeight: "700",
                  fontFamily: "Inter_700Bold",
                }}
              >
                {loading
                  ? "Please wait..."
                  : t.key === "free"
                    ? "Continue with Free"
                    : `Choose ${t.title}`}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View
          style={{
            marginTop: 8,
            padding: 16,
            borderRadius: 12,
            backgroundColor: COLORS.lightGray,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: COLORS.text,
              marginBottom: 8,
              fontFamily: "Inter_700Bold",
            }}
          >
            Call extensions
          </Text>
          <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}>
            • {extensions.formattedPrice} for {extensions.durationMinutes} minutes
          </Text>
        </View>

        {pricing?.second_date_cents != null && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: COLORS.accent, fontWeight: "700", fontFamily: "Inter_700Bold" }}>
              Second Date Fee: ${(pricing.second_date_cents / 100).toFixed(2)}{" "}
              USD
            </Text>
          </View>
        )}
        </>
        )}

        {error ? (
          <Text style={{ color: "#B91C1C", marginTop: 8, fontFamily: "Inter_400Regular" }}>{error}</Text>
        ) : null}
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
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

export default function MembershipScreen() {
  return (
    <OnboardingGuard allowUnauthenticated={true}>
      <MembershipScreenContent />
    </OnboardingGuard>
  );
}

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
    desc: "Browse, see & send likes (3 photos, 1 video)",
    highlight: false,
  },
  {
    key: "casual",
    title: "Casual",
    price: "$14.99/mo",
    desc: "More media uploads (5 photos, 1 video)",
    highlight: false,
  },
  {
    key: "dating",
    title: "Dating",
    price: "$29.99/mo",
    desc: "Priority matching & extended video (8 photos, 2 videos)",
    highlight: true,
  },
  {
    key: "business",
    title: "Business",
    price: "$49.99/mo",
    desc: "Max exposure & tools (10 photos, 3 videos)",
    highlight: false,
  },
];

export default function MembershipScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState(null);

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
        if (mounted) setPricing(data?.settings?.pricing || null);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
        <Text style={{ marginTop: 6, color: COLORS.text, opacity: 0.7 }}>
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
        <Text style={{ marginLeft: 8, color: "#6B7280", fontSize: 16 }}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: COLORS.text,
            marginBottom: 8,
          }}
        >
          Choose your plan
        </Text>
        <Text style={{ color: COLORS.text, opacity: 0.7, marginBottom: 16 }}>
          Select a membership to unlock features. You can upgrade anytime.
        </Text>

        {TIERS.map((t) => (
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
                style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}
              >
                {t.title}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: COLORS.primary,
                }}
              >
                {t.price}
              </Text>
            </View>
            <Text style={{ color: COLORS.text, opacity: 0.8, marginTop: 6 }}>
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
            }}
          >
            Call extensions
          </Text>
          <Text style={{ color: COLORS.text, marginBottom: 4 }}>
            • $5 for 5 minutes
          </Text>
          <Text style={{ color: COLORS.text, marginBottom: 4 }}>
            • $10 for 15 minutes
          </Text>
          <Text style={{ color: COLORS.text }}>• $20 for 30 minutes</Text>
        </View>

        {pricing?.second_date_cents != null && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: COLORS.accent, fontWeight: "700" }}>
              Second Date Fee: ${(pricing.second_date_cents / 100).toFixed(2)}{" "}
              USD
            </Text>
          </View>
        )}

        {error ? (
          <Text style={{ color: "#B91C1C", marginTop: 8 }}>{error}</Text>
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

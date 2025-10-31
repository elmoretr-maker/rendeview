import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";

function ConsentContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [saving, setSaving] = useState(false);
  const returnTo =
    typeof params.returnTo === "string" && params.returnTo.length > 0
      ? decodeURIComponent(params.returnTo)
      : "/onboarding/membership";

  const totalSteps = 4;
  const stepIndex = 2;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const queryClient = useQueryClient();

  const accept = useCallback(async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_accepted: true }),
      });
      if (!res.ok) {
        throw new Error(
          `When updating consent, the response was [${res.status}] ${res.statusText}`,
        );
      }
      try {
        await queryClient.invalidateQueries({ queryKey: ["profile-consent"] });
      } catch (e) {
        console.error("Failed to invalidate profile-consent query", e);
      }
      router.replace(returnTo);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save consent");
    } finally {
      setSaving(false);
    }
  }, [router, returnTo, queryClient]);

  const decline = useCallback(() => {
    router.push(
      `/onboarding/data-consent-required?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }, [router, returnTo]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        paddingTop: insets.top,
        paddingHorizontal: 24,
        justifyContent: "center",
      }}
    >
      {/* Progress bar */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 24,
          right: 24,
        }}
      >
        <View
          style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 999 }}
        >
          <View
            style={{
              height: 6,
              width: progressPct,
              backgroundColor: "#5B3BAF",
              borderRadius: 999,
            }}
          />
        </View>
        <Text style={{ marginTop: 6, color: "#2C3E50", opacity: 0.7 }}>
          Step {stepIndex} of {totalSteps}
        </Text>
      </View>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.push("/onboarding/welcome")}
        style={{
          position: "absolute",
          top: insets.top + 50,
          left: 24,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#6B7280" />
        <Text style={{ marginLeft: 8, color: "#6B7280", fontSize: 16 }}>Back</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
        Data Consent
      </Text>
      <Text style={{ color: "#6B6B6B", marginBottom: 24 }}>
        We use your location and interests to ensure perfect matches and
        reliable scheduling. By consenting, you unlock all features for a
        superior dating experience.
      </Text>

      <TouchableOpacity
        onPress={accept}
        disabled={saving}
        style={{
          backgroundColor: "#00BFA6",
          paddingVertical: 14,
          borderRadius: 12,
          marginBottom: 12,
          opacity: saving ? 0.6 : 1,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "#FFFFFF",
            fontWeight: "600",
            fontSize: 16,
          }}
        >
          {saving ? "Saving..." : "Accept & Continue"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={decline}
        style={{
          backgroundColor: "#F3F4F6",
          paddingVertical: 14,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "#111827",
            fontWeight: "600",
            fontSize: 16,
          }}
        >
          Decline
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Consent() {
  return (
    <OnboardingGuard>
      <ConsentContent />
    </OnboardingGuard>
  );
}

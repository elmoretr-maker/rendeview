import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Alert, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: "#7c3aed",
  teal: "#00BFA6",
  white: "#FFFFFF",
  gray50: "#F9F9F9",
  gray600: "#6B7280",
  text: "#2C3E50",
};

const STYLES = {
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
    backgroundColor: COLORS.teal,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
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
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
};

function ConsentContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [saving, setSaving] = useState(false);
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
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
        backgroundColor: COLORS.gray50,
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
        onPress={() => router.push("/onboarding/welcome")}
        style={{
          position: "absolute",
          top: insets.top + 50,
          left: 24,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.gray600} />
        <Text style={{ marginLeft: 8, color: COLORS.gray600, fontSize: 16, fontFamily: "Inter_400Regular" }}>Back</Text>
      </TouchableOpacity>

      {/* Card Container */}
      <View style={STYLES.card}>
        <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12, color: COLORS.text, fontFamily: "Inter_700Bold" }}>
          Data Consent
        </Text>
        <Text style={{ color: COLORS.gray600, marginBottom: 24, lineHeight: 22, fontFamily: "Inter_400Regular" }}>
          We use your location and interests to ensure perfect matches and
          reliable scheduling. By consenting, you unlock all features for a
          superior dating experience.
        </Text>

        <TouchableOpacity
          onPress={accept}
          disabled={saving}
          style={[
            STYLES.button,
            { marginBottom: 12 },
            saving && { opacity: 0.6 }
          ]}
        >
          <Text style={STYLES.buttonText}>
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
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Decline
          </Text>
        </TouchableOpacity>
      </View>
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

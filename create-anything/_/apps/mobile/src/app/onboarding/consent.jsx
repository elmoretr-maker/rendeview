import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";

const COLORS = {
  primary: "#9333ea",
  white: "#ffffff",
  text: "#374151",
  textMuted: "#6b7280",
  gradientStart: "#f3e8ff",
  gradientMid: "#ffffff",
  gradientEnd: "#dbeafe",
  progressBg: "#e5e7eb",
};

const consentPoints = [
  {
    icon: "location",
    title: "Location Services",
    description: "Find matches near you for real meetups.",
  },
  {
    icon: "heart",
    title: "Interest Matching",
    description: "Connect with people who share your passions.",
  },
  {
    icon: "shield-checkmark",
    title: "Privacy Protected",
    description: "Your data is encrypted and never sold.",
  },
];

export default function Consent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const returnTo =
    typeof params.returnTo === "string" && params.returnTo.length > 0
      ? decodeURIComponent(params.returnTo)
      : "/onboarding/membership";

  const totalSteps = 3;
  const stepIndex = 1;

  const accept = useCallback(() => {
    // Navigate directly to membership for unauthenticated flow
    // Consent will be persisted after account creation
    router.replace(returnTo);
  }, [router, returnTo]);

  const decline = useCallback(() => {
    router.replace("/welcome");
  }, [router]);

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${(stepIndex / totalSteps) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.stepText}>Step {stepIndex} of {totalSteps}</Text>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/welcome")}
      >
        <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.pageHeader}>Data Consent</Text>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: "https://ucarecdn.com/7e6175a0-5279-4da8-8e24-c6a129f1821f/-/format/auto/" }}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.description}>
            We use your location and interests to ensure perfect matches and reliable scheduling. By consenting, you unlock all features for a superior dating experience.
          </Text>

          {consentPoints.map((point, index) => (
            <View key={index} style={styles.pointItem}>
              <Ionicons name={point.icon} size={24} color={COLORS.primary} />
              <View style={styles.pointContent}>
                <Text style={styles.pointTitle}>{point.title}</Text>
                <Text style={styles.pointDescription}>{point.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={accept}
          disabled={saving || !mounted}
          style={[styles.acceptButton, (saving || !mounted) && { opacity: 0.6 }]}
        >
          <Text style={styles.acceptButtonText}>
            {saving ? "Saving..." : "Accept & Continue"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={decline}
          disabled={!mounted}
          style={styles.declineButton}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  progressBg: {
    height: 6,
    backgroundColor: COLORS.progressBg,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
  stepText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  pageHeader: {
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  pointItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  pointContent: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  pointDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  declineButton: {
    borderWidth: 2,
    borderColor: COLORS.progressBg,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  declineButtonText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: "600",
  },
});

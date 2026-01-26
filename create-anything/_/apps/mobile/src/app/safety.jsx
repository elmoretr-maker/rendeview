import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

const COLORS = {
  primary: "#9333ea",
  text: "#6b7280",
  textDark: "#374151",
  white: "#ffffff",
  gradientStart: "#f3e8ff",
  gradientMid: "#ffffff",
  gradientEnd: "#dbeafe",
};

const safetyFeatures = [
  {
    icon: "shield-checkmark",
    title: "Advanced Verification",
    description: "Multi-step verification process ensures all users are who they claim to be.",
  },
  {
    icon: "eye",
    title: "Video-First Approach",
    description: "See your match in real-time before meeting in person, eliminating catfishing.",
  },
  {
    icon: "person-circle",
    title: "Profile Review",
    description: "Our team reviews profiles to ensure community guidelines are followed.",
  },
  {
    icon: "warning",
    title: "Report & Block",
    description: "Easy-to-use reporting and blocking features to keep you safe.",
  },
];

export default function Safety() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.pageHeader}>Safety</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image
            source={{ uri: "https://ucarecdn.com/7e6175a0-5279-4da8-8e24-c6a129f1821f/-/format/auto/" }}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.subtitle}>We take your security seriously</Text>
        </View>

        <View style={styles.featuresList}>
          {safetyFeatures.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <Ionicons name={feature.icon} size={28} color={COLORS.primary} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  pageHeader: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 8,
  },
  featuresList: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
});

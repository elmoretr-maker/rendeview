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

const corePillars = [
  {
    icon: "checkmark-circle",
    title: "Authenticity",
    description: "Built-in verification through mandatory video introductions.",
  },
  {
    icon: "people",
    title: "Inclusivity",
    description: "A welcoming community for all types of authentic relationships.",
  },
  {
    icon: "flash",
    title: "Efficiency",
    description: "Skip weeks of 'small talk' and get straight to a real connection.",
  },
];

export default function About() {
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

      <Text style={styles.pageHeader}>About</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image
            source={{ uri: "https://ucarecdn.com/7e6175a0-5279-4da8-8e24-c6a129f1821f/-/format/auto/" }}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.cardText}>
            Redefining modern dating by replacing static profiles with real human energy. Our mission is to end 'swipe fatigue' through authentic, video-first interactions.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>The Vision</Text>
          <Text style={styles.cardText}>
            Rende-View was built for users who value their time. We believe you can't feel a 'spark' from a text box; you feel it through a look, a laugh, and a real-time conversation.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Core Pillars</Text>
          {corePillars.map((pillar, index) => (
            <View key={index} style={styles.pillarItem}>
              <Ionicons name={pillar.icon} size={24} color={COLORS.primary} />
              <View style={styles.pillarContent}>
                <Text style={styles.pillarTitle}>{pillar.title}</Text>
                <Text style={styles.pillarDescription}>{pillar.description}</Text>
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
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  pillarItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 12,
  },
  pillarContent: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  pillarDescription: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
});

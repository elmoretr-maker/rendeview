import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

const COLORS = {
  primary: "#9333ea",
  pink: "#ec4899",
  text: "#6b7280",
  textDark: "#374151",
  white: "#ffffff",
  gradientStart: "#f3e8ff",
  gradientMid: "#ffffff",
  gradientEnd: "#dbeafe",
};

const stories = [
  {
    names: "Sarah & Michael",
    location: "New York, NY",
    story: "We matched on Rende-View and had our first video call that same night. The conversation flowed so naturally - we talked for 3 hours! Now we're engaged.",
  },
  {
    names: "Emma & James",
    location: "Los Angeles, CA",
    story: "After years of disappointing first dates, Rende-View was a game-changer. Seeing James on video before meeting in person gave me so much confidence. Best decision ever!",
  },
  {
    names: "David & Lisa",
    location: "Chicago, IL",
    story: "The video-first approach eliminated all the awkwardness. We knew we had chemistry before we even met for coffee. Two years later, we're still going strong.",
  },
];

export default function SuccessStories() {
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

      <Text style={styles.pageHeader}>Success Stories</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image
            source={{ uri: "https://ucarecdn.com/7e6175a0-5279-4da8-8e24-c6a129f1821f/-/format/auto/" }}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.subtitle}>Real couples who found love on Rende-View</Text>
        </View>

        <View style={styles.storiesList}>
          {stories.map((story, index) => (
            <View key={index} style={styles.storyCard}>
              <View style={styles.storyHeader}>
                <Ionicons name="heart" size={20} color={COLORS.pink} />
                <Text style={styles.storyNames}>{story.names}</Text>
              </View>
              <Text style={styles.storyLocation}>{story.location}</Text>
              <Text style={styles.storyText}>"{story.story}"</Text>
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
  storiesList: {
    gap: 20,
  },
  storyCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  storyNames: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  storyLocation: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 12,
  },
  storyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    fontStyle: "italic",
  },
});

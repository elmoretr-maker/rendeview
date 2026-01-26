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
          <Text style={styles.cardTitle}>Video-First Dating</Text>
          <Text style={styles.cardText}>
            Rende-View is the premier video-first dating platform designed to help you make authentic connections. 
            We believe that real chemistry can only be discovered face-to-face, which is why we prioritize video 
            interactions over endless text messaging.
          </Text>
          <Text style={styles.cardText}>
            Our mission is simple: help you date smarter, not harder. No more catfishing, no more wasted time 
            on people who look nothing like their photos. With Rende-View, you know exactly who you're meeting 
            before you ever leave your home.
          </Text>
          <Text style={styles.cardText}>
            Join thousands of singles who are tired of the traditional dating app experience and are ready 
            for something more authentic.
          </Text>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 12,
  },
});

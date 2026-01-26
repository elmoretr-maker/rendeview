import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/utils/auth/useAuth";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#9333ea",
  primaryLight: "#a855f7",
  text: "#6b7280",
  textDark: "#374151",
  white: "#ffffff",
  gradientStart: "#f3e8ff",
  gradientMid: "#ffffff",
  gradientEnd: "#dbeafe",
};

const navLinks = [
  { label: "About", path: "/about" },
  { label: "Safety", path: "/safety" },
  { label: "Success Stories", path: "/success-stories" },
];

const valueProps = [
  {
    icon: "checkmark-circle",
    title: "Video-First Dating",
    description: "The only dating app where you see who you're really meeting. Built for authentic introductions and real-time conversations.",
  },
  {
    icon: "shield-checkmark",
    title: "Safety First",
    description: "Advanced verification and safety features to protect your time and ensure a secure experience.",
  },
  {
    icon: "heart",
    title: "Meaningful Connections",
    description: "Quality matches based on compatibility and genuine connections.",
  },
  {
    icon: "people",
    title: "Inclusive Community",
    description: "A welcoming space for everyone to find authentic relationships.",
  },
];

function WelcomeContent() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, isReady, auth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (auth) {
      router.replace("/");
    }
  }, [isReady, auth, router]);

  const handleSignIn = () => {
    signIn();
  };

  const handleJoinNow = () => {
    router.push("/onboarding/consent");
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StatusBar style="dark" />
      
      {/* Navbar */}
      <View style={styles.navbar}>
        <View style={styles.navLogo}>
          <Image
            source={{ uri: "https://ucarecdn.com/7e6175a0-5279-4da8-8e24-c6a129f1821f/-/format/auto/" }}
            style={styles.navLogoImage}
            contentFit="contain"
          />
          <Text style={styles.navLogoText}>Rende-View</Text>
        </View>
        <View style={styles.navLinks}>
          {navLinks.map((link) => (
            <TouchableOpacity
              key={link.path}
              onPress={() => router.push(link.path)}
              style={styles.navLinkButton}
            >
              <Text style={styles.navLinkText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo Card */}
        <View style={styles.logoCard}>
          <Image
            source={{ uri: "https://ucarecdn.com/7e6175a0-5279-4da8-8e24-c6a129f1821f/-/format/auto/" }}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Rende-View</Text>
        <Text style={styles.subtitle}>VIDEO-FIRST DATING</Text>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.taglineTitle}>Date Smarter, Not Harder</Text>
          <Text style={styles.taglineText}>
            No Catfishing. Know who they are before you meet. Your time is valuable—only pay for connections that matter.
          </Text>
        </View>

        {/* Value Props */}
        <View style={styles.valuePropsContainer}>
          {valueProps.map((prop, index) => (
            <View key={index} style={styles.valuePropItem}>
              <Ionicons
                name={prop.icon}
                size={22}
                color={COLORS.primary}
                style={styles.valuePropIcon}
              />
              <View style={styles.valuePropContent}>
                <Text style={styles.valuePropTitle}>{prop.title}</Text>
                <Text style={styles.valuePropDescription}>{prop.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleSignIn}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.joinNowButton}
            onPress={handleJoinNow}
          >
            <LinearGradient
              colors={[COLORS.primaryLight, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinNowGradient}
            >
              <Text style={styles.joinNowButtonText}>Join Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          By continuing, you agree to our{" "}
          <Text style={styles.termsLink} onPress={() => router.push("/terms")}>
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text style={styles.termsLink} onPress={() => router.push("/privacy")}>
            Privacy Policy
          </Text>.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navLogoImage: {
    width: 28,
    height: 28,
  },
  navLogoText: {
    fontFamily: "serif",
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  navLinkButton: {
    paddingVertical: 8,
  },
  navLinkText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.text,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
  },
  title: {
    fontFamily: "serif",
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: COLORS.primaryLight,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  taglineContainer: {
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  taglineTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textDark,
    marginBottom: 6,
    textAlign: "center",
  },
  taglineText: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 18,
  },
  valuePropsContainer: {
    width: "100%",
    gap: 10,
    marginBottom: 20,
  },
  valuePropItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 10,
  },
  valuePropIcon: {
    marginTop: 2,
  },
  valuePropContent: {
    flex: 1,
  },
  valuePropTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 2,
  },
  valuePropDescription: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 16,
  },
  buttonsContainer: {
    width: "100%",
    maxWidth: 320,
    gap: 16,
    marginBottom: 24,
  },
  signInButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "#c084fc",
    backgroundColor: "transparent",
    alignItems: "center",
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  joinNowButton: {
    width: "100%",
    borderRadius: 9999,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  joinNowGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  joinNowButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  termsText: {
    fontSize: 11,
    textAlign: "center",
    color: COLORS.text,
    paddingHorizontal: 20,
  },
  termsLink: {
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
});

export default function Welcome() {
  return (
    <OnboardingGuard allowUnauthenticated={true}>
      <WelcomeContent />
    </OnboardingGuard>
  );
}

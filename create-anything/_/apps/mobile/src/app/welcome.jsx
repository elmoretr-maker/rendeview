import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#5B3BAF",
  primaryDark: "#4A2E8E",
  purple50: "#F5E6FF",
  purple100: "#E6CCFF",
  blue50: "#E6F2FF",
  pink50: "#FFE6F5",
  text: "#2C3E50",
  textLight: "#6B7280",
  white: "#FFFFFF",
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { auth } = useAuth();
  
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (auth) {
      console.log("[WELCOME] User authenticated, redirecting to index");
      router.replace("/");
    }
  }, [auth, router]);

  if (!loaded && !error) {
    return null;
  }

  const handleSignIn = () => {
    router.push("/onboarding/welcome");
  };

  const handleJoinNow = () => {
    router.push("/onboarding/welcome");
  };

  return (
    <LinearGradient
      colors={[COLORS.purple50, COLORS.blue50, COLORS.pink50]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.blurCircle1} />
      <View style={styles.blurCircle2} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.logoSection}>
            <View style={styles.logoCard}>
              <Image
                source={{
                  uri: "https://ucarecdn.com/7e6175a0-5279-4da8-8e24-c6a129f1821f/-/format/auto/",
                }}
                style={styles.logo}
                contentFit="contain"
                transition={150}
              />
            </View>

            <View style={styles.brandSection}>
              <Text style={[styles.appName, { fontFamily: "Inter_700Bold" }]}>
                Rende-View
              </Text>
              <Text style={[styles.tagline, { fontFamily: "Inter_600SemiBold" }]}>
                VIDEO-FIRST DATING
              </Text>
            </View>
          </View>

          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
              activeOpacity={0.85}
            >
              <Text style={[styles.signInText, { fontFamily: "Inter_700Bold" }]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinNow}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.joinGradient}
              >
                <Text style={[styles.joinText, { fontFamily: "Inter_700Bold" }]}>
                  Join Now
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { fontFamily: "Inter_400Regular" }]}>
              By continuing, you agree to our{" "}
              <Text style={styles.footerLink}>Terms of Service</Text> and{" "}
              <Text style={styles.footerLink}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  blurCircle1: {
    position: "absolute",
    top: "-10%",
    right: "-5%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.purple100,
    opacity: 0.3,
  },
  blurCircle2: {
    position: "absolute",
    bottom: "-10%",
    left: "-5%",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.blue50,
    opacity: 0.3,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 40,
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    marginTop: 60,
  },
  logoCard: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  logo: {
    width: 96,
    height: 96,
  },
  brandSection: {
    alignItems: "center",
  },
  appName: {
    fontSize: 36,
    color: COLORS.primary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.primary,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  buttonSection: {
    width: "100%",
    gap: 16,
    marginTop: 40,
  },
  signInButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 9999,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  signInText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  joinButton: {
    borderRadius: 9999,
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  joinGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  joinText: {
    color: COLORS.white,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 18,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/utils/auth/useAuth";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  text: "#2C3E50",
  lightGray: "#F3F4F6",
  bg: "#F9F9F9",
  white: "#FFFFFF",
  error: "#E74C3C",
};
const FONT_SIZES = {
  title: 32,
  subtitle: 18,
  body: 14,
};

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, isReady, auth } = useAuth();
  const router = useRouter();
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!isReady) return;
    if (auth) {
      // Let index gate decide next step (consent/membership/profile/tabs)
      router.replace("/");
    }
  }, [isReady, auth, router]);

  if (!loaded && !error) {
    return null;
  }

  const valueProps = [
    {
      icon: "videocam-outline",
      title: "Video-First Dating",
      description:
        "The only dating app where you see who you're really meeting. Built for authentic introductions and real-time conversations.",
    },
    {
      icon: "shield-checkmark-outline",
      title: "Safety First",
      description:
        "Advanced verification and safety features to protect your time and ensure a secure experience.",
    },
    {
      icon: "heart-outline",
      title: "Meaningful Connections",
      description:
        "Quality matches based on compatibility and genuine connections.",
    },
    {
      icon: "people-outline",
      title: "Inclusive Community",
      description:
        "A welcoming space for everyone to find authentic relationships.",
    },
  ];

  const isAuthed = Boolean(isReady && auth);
  const primaryCtaLabel = isAuthed ? "Continue" : "Get Started";
  const onPrimaryPress = () => {
    if (isAuthed) {
      router.replace("/onboarding/consent");
    } else {
      signUp();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header/Title Section */}
        <View style={styles.header}>
          <Image
            source={{
              uri: "https://ucarecdn.com/7e6175a0-5279-4da8-8e24-c6a129f1821f/-/format/auto/",
            }}
            style={styles.logo}
            contentFit="contain"
            transition={150}
          />
          <Text style={[styles.appLogo, { fontFamily: "Inter_700Bold" }]}>
            Rende-View
          </Text>
          <Text style={[styles.tagline, { fontFamily: "Inter_400Regular" }]}>
            Rende-View: Date Smarter, Not Harder. No Catfishing. Know who they
            are before you meet. Your time is valuable—only pay for connections
            that matter.
          </Text>
        </View>

        {/* Value Propositions Section */}
        <View style={styles.propsContainer}>
          {valueProps.map((prop, index) => (
            <View key={index} style={styles.propItem}>
              <Ionicons
                name={prop.icon}
                size={28}
                color={COLORS.primary}
                style={styles.propIcon}
              />
              <View style={styles.propTextContent}>
                <Text
                  style={[
                    styles.propTitle,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {prop.title}
                </Text>
                <Text
                  style={[
                    styles.propDescription,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  {prop.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={onPrimaryPress}
            accessibilityLabel="Get Started"
          >
            <Text
              style={[
                styles.getStartedText,
                { fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {primaryCtaLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => signIn()}
            accessibilityLabel="Sign In"
          >
            <Text
              style={[styles.loginText, { fontFamily: "Inter_600SemiBold" }]}
            >
              I Already Have an Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer/Legal Text */}
        <Text style={[styles.footerText, { fontFamily: "Inter_400Regular" }]}>
          By continuing, you agree to our{" "}
          <Text style={styles.footerLink}>Terms of Service</Text> and{" "}
          <Text style={styles.footerLink}>Privacy Policy.</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  appLogo: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 5,
  },
  tagline: {
    fontSize: FONT_SIZES.subtitle,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
  },
  propsContainer: {
    marginBottom: 40,
  },
  propItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  propIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  propTextContent: {
    flex: 1,
  },
  propTitle: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  propDescription: {
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
    opacity: 0.7,
  },
  buttonsContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  getStartedButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  getStartedText: {
    color: COLORS.white,
    fontSize: 18,
  },
  loginText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.body,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: "center",
    opacity: 0.6,
  },
  footerLink: {
    textDecorationLine: "underline",
    color: COLORS.primary,
  },
});

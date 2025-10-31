import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";

const COLORS = {
  primary: "#5B3BAF",
  bg: "#F9F9F9",
};

export function OnboardingGuard({ children, allowUnauthenticated = false }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const res = await fetch("/api/profile");
        
        if (!res.ok) {
          if (res.status === 401 && !allowUnauthenticated) {
            router.replace("/onboarding/welcome");
            return;
          }
          if (res.status === 401 && allowUnauthenticated) {
            setChecking(false);
            return;
          }
          throw new Error("Failed to check profile");
        }

        const data = await res.json();
        const user = data?.user;
        const media = data?.media || [];
        const photos = media.filter((m) => m.type === "photo");

        if (
          user?.consent_accepted &&
          user?.membership_tier &&
          user?.name &&
          photos.length >= 2
        ) {
          router.replace("/(tabs)");
          return;
        }

        setChecking(false);
      } catch (e) {
        console.error("Onboarding guard error:", e);
        setChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [router, allowUnauthenticated]);

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.bg,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return children;
}

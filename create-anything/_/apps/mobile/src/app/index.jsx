import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";

export default function Index() {
  const router = useRouter();
  const { isReady, auth } = useAuth();

  useEffect(() => {
    const routeNext = async () => {
      if (!isReady) return;

      // Not authenticated -> Welcome
      if (!auth) {
        router.replace("/onboarding/welcome");
        return;
      }

      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const user = data?.user;

          // Membership gate: require selection before rest of onboarding
          if (!user?.membership_tier) {
            router.replace("/onboarding/membership");
            return;
          }

          // Profile basics gate
          if (!user?.name) {
            router.replace("/onboarding/profile");
            return;
          }

          // Consent gate with return path back to main tabs
          if (!user?.consent_accepted) {
            const returnTo = "/(tabs)";
            router.replace(
              `/onboarding/data-consent-required?returnTo=${encodeURIComponent(returnTo)}`,
            );
            return;
          }

          // All checks passed -> main app
          router.replace("/(tabs)");
          return;
        }
      } catch (e) {
        console.error("/index bootstrap routeNext error", e);
      }

      // Fallback to main tabs if profile fetch fails
      router.replace("/(tabs)");
    };

    routeNext();
  }, [isReady, auth, router]);

  return null;
}

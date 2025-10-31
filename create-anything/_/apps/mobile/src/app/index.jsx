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
          const media = data?.media || [];
          const photos = media.filter((m) => m.type === "photo");

          // NEW FLOW: Check consent first (Step 2 before membership)
          if (!user?.consent_accepted) {
            const returnTo = "/onboarding/membership";
            router.replace(`/onboarding/consent?returnTo=${encodeURIComponent(returnTo)}`);
            return;
          }

          // Membership gate (Step 3)
          if (!user?.membership_tier) {
            router.replace("/onboarding/membership");
            return;
          }

          // Profile completion gate (Step 4 - consolidated)
          // Require name AND minimum 2 photos to ensure profile is properly completed
          if (!user?.name || photos.length < 2) {
            router.replace("/onboarding/profile");
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

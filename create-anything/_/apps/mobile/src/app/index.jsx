import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";

export default function Index() {
  const router = useRouter();
  const { isReady, auth } = useAuth();

  useEffect(() => {
    const routeNext = async () => {
      if (!isReady) return;

      console.log("[INDEX] Starting route logic, isReady:", isReady, "auth:", !!auth);

      // Not authenticated -> Welcome
      if (!auth) {
        console.log("[INDEX] No auth, redirecting to welcome");
        router.replace("/onboarding/welcome");
        return;
      }

      try {
        console.log("[INDEX] Fetching profile...");
        const res = await fetch("/api/profile");
        console.log("[INDEX] Profile fetch status:", res.status);
        
        if (res.ok) {
          const data = await res.json();
          const user = data?.user;
          const media = data?.media || [];
          const photos = media.filter((m) => m.type === "photo");

          console.log("[INDEX] User data:", {
            hasUser: !!user,
            consent: user?.consent_accepted,
            tier: user?.membership_tier,
            name: user?.name,
            photoCount: photos.length
          });

          // NEW FLOW: Check consent first (Step 2 before membership)
          if (!user?.consent_accepted) {
            console.log("[INDEX] No consent, redirecting to consent");
            const returnTo = "/onboarding/membership";
            router.replace(`/onboarding/consent?returnTo=${encodeURIComponent(returnTo)}`);
            return;
          }

          // Membership gate (Step 3)
          if (!user?.membership_tier) {
            console.log("[INDEX] No membership tier, redirecting to membership");
            router.replace("/onboarding/membership");
            return;
          }

          // Profile completion gate (Step 4 - consolidated)
          // Require name AND minimum 2 photos to ensure profile is properly completed
          if (!user?.name || photos.length < 2) {
            console.log("[INDEX] Incomplete profile (name or photos), redirecting to profile setup");
            router.replace("/onboarding/profile");
            return;
          }

          // All checks passed -> main app
          console.log("[INDEX] All checks passed, redirecting to discovery");
          router.replace("/(tabs)/discovery");
          return;
        }
      } catch (e) {
        console.error("[INDEX] Error during route logic:", e);
      }

      // Fallback
      console.log("[INDEX] Fallback triggered, redirecting to discovery");
      router.replace("/(tabs)/discovery");
    };

    routeNext();
  }, [isReady, auth, router]);

  return null;
}

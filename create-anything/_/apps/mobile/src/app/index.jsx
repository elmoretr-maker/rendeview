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

      // Not authenticated -> Welcome Back page
      if (!auth) {
        console.log("[INDEX] No auth, redirecting to welcome back page");
        router.replace("/welcome");
        return;
      }

      // User is authenticated - check onboarding completion
      try {
        console.log("[INDEX] Fetching profile...");
        const res = await fetch("/api/profile");
        console.log("[INDEX] Profile fetch status:", res.status);
        
        // Handle 401 as true unauth (shouldn't happen with QA_BYPASS, but handle it)
        if (res.status === 401) {
          console.log("[INDEX] Got 401, redirecting to welcome");
          router.replace("/welcome");
          return;
        }

        // Handle server errors (5xx) or network errors - keep user on profile with error state
        if (!res.ok && res.status >= 500) {
          console.error("[INDEX] Server error fetching profile, defaulting to profile page");
          router.replace("/(tabs)/profile");
          return;
        }

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

          // Check consent first (Step 1)
          if (!user?.consent_accepted) {
            console.log("[INDEX] No consent, redirecting to consent");
            const returnTo = "/onboarding/membership";
            router.replace(`/onboarding/consent?returnTo=${encodeURIComponent(returnTo)}`);
            return;
          }

          // Membership gate (Step 2)
          if (!user?.membership_tier) {
            console.log("[INDEX] No membership tier, redirecting to membership");
            router.replace("/onboarding/membership");
            return;
          }

          // Profile completion gate (Step 3)
          // Require name AND minimum 2 photos to ensure profile is properly completed
          if (!user?.name || photos.length < 2) {
            console.log("[INDEX] Incomplete profile (name or photos), redirecting to profile setup");
            router.replace("/onboarding/profile");
            return;
          }

          // All checks passed -> Profile page for returning users
          console.log("[INDEX] All checks passed, redirecting to profile");
          router.replace("/(tabs)/profile");
          return;
        }
      } catch (e) {
        console.error("[INDEX] Network/fetch error during route logic:", e);
        // Network error while authenticated - default to profile page
        router.replace("/(tabs)/profile");
        return;
      }

      // Fallback for other 4xx errors - go to profile with degraded state
      console.log("[INDEX] Fallback triggered (4xx error), redirecting to profile");
      router.replace("/(tabs)/profile");
    };

    routeNext();
  }, [isReady, auth, router]);

  return null;
}

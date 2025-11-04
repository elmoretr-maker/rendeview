import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";

export default function Index() {
  const router = useRouter();
  const { isReady, auth, setAuth } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const routeNext = async () => {
      if (!isReady) return;

      console.log("[INDEX] ===== COMPREHENSIVE TRAFFIC CHECK SEQUENCE =====");
      console.log("[INDEX] Step 1: Authentication Check - isReady:", isReady, "hasLocalAuth:", !!auth);

      // ========================================
      // STEP 1: AUTHENTICATION CHECK
      // ========================================
      // Try to fetch profile to check if backend has valid session (QA_BYPASS or real auth)
      try {
        // Build absolute URL to avoid exp:// resolution issues on cold starts
        const baseURL = process.env.EXPO_PUBLIC_BASE_URL;
        const apiURL = baseURL ? `${baseURL}/api/profile` : "/api/profile";
        
        console.log("[INDEX] Checking backend authentication status...");
        console.log("[INDEX] Using URL:", apiURL);
        
        // Create AbortController for proper timeout cancellation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(apiURL, {
          signal: controller.signal,
          credentials: "include"
        });
        clearTimeout(timeoutId);
        
        if (!isMounted) return;
        
        console.log("[INDEX] Backend responded with status:", res.status);

        // TRUE UNAUTHENTICATED - No session on backend
        if (res.status === 401) {
          console.log("[INDEX] ❌ STEP 1 FAILED: No valid session (401)");
          console.log("[INDEX] Clearing any cached auth data from previous session");
          await setAuth(null); // Clear stale auth from SecureStore
          console.log("[INDEX] → Routing to /welcome (Sign-In page)");
          router.replace("/welcome");
          return;
        }

        // Server error or network issues - show error screen
        if (!res.ok) {
          console.error("[INDEX] ⚠️ Backend error during auth check:", res.status);
          setError({
            message: "Unable to connect to server. Please check your connection and try again.",
            status: res.status
          });
          return;
        }

        // ========================================
        // STEP 2: ONBOARDING COMPLETION CHECK
        // ========================================
        console.log("[INDEX] ✅ STEP 1 PASSED: User is authenticated");
        console.log("[INDEX] Step 2: Onboarding Completion Check");

        const data = await res.json();
        const user = data?.user;
        
        // CRITICAL: Persist auth state to SecureStore so isAuthenticated becomes true
        if (user?.id) {
          console.log("[INDEX] Persisting auth state for user:", user.id);
          await setAuth({ userId: user.id, email: user.email });
        }
        const media = data?.media || [];
        const photos = media.filter((m) => m.type === "photo");

        console.log("[INDEX] User profile status:", {
          hasUser: !!user,
          consent: user?.consent_accepted,
          tier: user?.membership_tier,
          name: user?.name,
          photoCount: photos.length
        });

        // Gate 2.1: Consent Check
        if (!user?.consent_accepted) {
          console.log("[INDEX] ❌ STEP 2 INCOMPLETE: No consent accepted");
          console.log("[INDEX] → Routing to /onboarding/consent");
          const returnTo = "/onboarding/membership";
          router.replace(`/onboarding/consent?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        // Gate 2.2: Membership Check
        if (!user?.membership_tier) {
          console.log("[INDEX] ❌ STEP 2 INCOMPLETE: No membership tier selected");
          console.log("[INDEX] → Routing to /onboarding/membership");
          router.replace("/onboarding/membership");
          return;
        }

        // Gate 2.3: Profile Completion Check (name + minimum 2 photos)
        if (!user?.name || photos.length < 2) {
          console.log("[INDEX] ❌ STEP 2 INCOMPLETE: Profile not complete");
          console.log("[INDEX] → Routing to /onboarding/profile");
          router.replace("/onboarding/profile");
          return;
        }

        // ========================================
        // SUCCESS: Route to Main App Dashboard
        // ========================================
        console.log("[INDEX] ✅ STEP 2 PASSED: Onboarding complete");
        console.log("[INDEX] ✅✅✅ ALL CHECKS PASSED ✅✅✅");
        console.log("[INDEX] → Routing to /discovery (Main Application Dashboard)");
        router.replace("/(tabs)/discovery");
        return;

      } catch (e) {
        if (!isMounted) return;
        
        console.error("[INDEX] ⚠️ Network/fetch error during routing logic:", e);
        console.error("[INDEX] Error details:", e.name, e.message);
        
        // Check if it's a timeout/abort error
        const isTimeout = e.name === "AbortError" || e.message === "Request timeout";
        
        setError({
          message: isTimeout 
            ? "Connection timeout. Please check your internet and try again." 
            : "Network error. Please check your connection and try again.",
          error: e.message
        });
        return;
      }
    };

    routeNext();

    return () => {
      isMounted = false;
    };
  }, [isReady, auth, router]);

  // Show error screen if there's an error
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <Text style={styles.errorHint}>
          {error.status ? `(Error ${error.status})` : ''}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading screen while checking auth
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#5B3BAF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 10,
  },
  errorHint: {
    fontSize: 14,
    color: "#95a5a6",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#5B3BAF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

import { useAuth } from "@/utils/auth/useAuth";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { AuthModal } from "@/utils/auth/useAuthModal.jsx";
import { Text } from "react-native"; // Import Text component for loading

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootGate />
      {/* Auth modal must be mounted at root */}
      <AuthModal />
    </QueryClientProvider>
  );
}

// --- NEW/REINFORCED AUTH GATE COMPONENT ---
function RootGate() {
  const { initiate, isReady, isAuthenticated, auth } = useAuth();
  const router = useRouter();

  // 1. Initialize Auth on mount
  useEffect(() => {
    initiate();
  }, [initiate]);

  // 2. Hide Splash Screen when Ready
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // 3. MAIN REDIRECTION LOGIC (Runs once when isReady becomes true)
  useEffect(() => {
    if (!isReady) return;

    if (isAuthenticated) {
      // If authenticated, go to the primary profile check page (root path '/')
      router.replace("/"); // CHANGED from "/index" to "/" to match expo-router root
    } else {
      // If not authenticated, go straight to the welcome screen.
      router.replace("/onboarding/welcome");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady) {
    return null; // Show nothing while state is loading
  }

  // Render the stack, controlled by the redirects above.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        {/* The index page will now execute the complex post-login checks */}
        <Stack.Screen name="index" />

        {/* All onboarding/auth routes */}
        <Stack.Screen name="onboarding/welcome" />
        <Stack.Screen name="onboarding/profile" />
        <Stack.Screen name="onboarding/photos" />
        <Stack.Screen name="onboarding/video" />
        <Stack.Screen name="onboarding/consent" />
        <Stack.Screen name="onboarding/data-consent-required" />

        {/* Main tabs, payments, video */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="stripe" />
        <Stack.Screen name="video/call" />
      </Stack>
    </GestureHandlerRootView>
  );
}

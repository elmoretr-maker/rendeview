import { useAuth } from "@/utils/auth/useAuth";
import { Stack, useRouter, usePathname, useSegments } from "expo-router";
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

// --- GLOBAL AUTHENTICATION GUARD ---
function RootGate() {
  const { initiate, isReady, isAuthenticated, auth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

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

  // 3. GLOBAL AUTHENTICATION PROTECTION
  // This runs on EVERY navigation to protect ALL routes
  useEffect(() => {
    if (!isReady) return;

    // Define PUBLIC routes (accessible without authentication)
    const PUBLIC_ROUTES = [
      'welcome',
      'onboarding/welcome',
      'onboarding/consent',
      'onboarding/data-consent-required',
      'onboarding/membership',
      'onboarding/profile',
    ];

    // Build current path from segments for comparison
    const currentPath = segments.join('/');
    
    console.log("[GLOBAL AUTH GUARD] Checking route:", pathname);
    console.log("[GLOBAL AUTH GUARD] Segments:", segments);
    console.log("[GLOBAL AUTH GUARD] isAuthenticated:", isAuthenticated);

    // Check if current route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route => 
      currentPath === route || currentPath.startsWith(route) || pathname === `/${route}`
    );

    // Special case: index route handles its own backend auth check (supports QA_BYPASS)
    const isIndexRoute = currentPath === '' || pathname === '/';

    console.log("[GLOBAL AUTH GUARD] isPublicRoute:", isPublicRoute);
    console.log("[GLOBAL AUTH GUARD] isIndexRoute:", isIndexRoute);

    // GUARD LOGIC: Redirect unauthenticated users trying to access protected routes
    // EXCEPT index route, which performs its own backend authentication check
    if (!isAuthenticated && !isPublicRoute && !isIndexRoute) {
      console.log("[GLOBAL AUTH GUARD] ❌ BLOCKED: Unauthenticated user on protected route");
      console.log("[GLOBAL AUTH GUARD] → Redirecting to /welcome");
      router.replace("/welcome");
      return;
    }

    // Index route always allowed - it handles backend auth check and routing
    if (isIndexRoute) {
      console.log("[GLOBAL AUTH GUARD] ✅ Index route - allowing backend auth check");
      return;
    }

    // Allow navigation for all other cases
    console.log("[GLOBAL AUTH GUARD] ✅ Navigation allowed");
  }, [isReady, isAuthenticated, router, pathname, segments]);

  if (!isReady) {
    return null; // Show nothing while state is loading
  }

  // Render the stack, controlled by the guard above
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        {/* The index page will execute the complex post-login checks */}
        <Stack.Screen name="index" />

        {/* Public routes */}
        <Stack.Screen name="welcome" />
        <Stack.Screen name="onboarding/welcome" />
        <Stack.Screen name="onboarding/profile" />
        <Stack.Screen name="onboarding/consent" />
        <Stack.Screen name="onboarding/data-consent-required" />
        <Stack.Screen name="onboarding/membership" />

        {/* Protected routes */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="stripe" />
        <Stack.Screen name="video/call" />
        <Stack.Screen name="profile/[userId]" />
        <Stack.Screen name="settings/blockers" />
        <Stack.Screen name="settings/subscription" />
      </Stack>
    </GestureHandlerRootView>
  );
}

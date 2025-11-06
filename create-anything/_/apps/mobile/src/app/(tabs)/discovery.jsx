import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Heart, Sparkles, Eye } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { apiFetch, getAbsoluteUrl } from "@/utils/api/apiFetch";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
// ADD: Inter fonts for modern typography
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

// Brand palette
const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

// Handle dismiss with two-tap confirmation
const handleDismiss = (profileId, discardMutation, setConfirmDismiss, confirmDismiss) => {
  if (!confirmDismiss) {
    setConfirmDismiss(true);
    Alert.alert(
      "Are you sure?",
      "Tap X again to permanently dismiss this profile",
      [{ text: "Cancel", onPress: () => setConfirmDismiss(false), style: "cancel" }],
      { cancelable: true, onDismiss: () => setConfirmDismiss(false) }
    );
  } else {
    setConfirmDismiss(false);
    discardMutation.mutate(profileId);
  }
};

export default function Discovery() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { signIn, isReady} = useAuth();
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["discovery"],
    queryFn: async () => {
      const res = await apiFetch("/api/discovery/list");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profiles");
      return res.json();
    },
    retry: (count, err) => {
      // Do not retry on auth errors
      // @ts-ignore
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const [index, setIndex] = useState(0);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  
  useEffect(() => {
    setIndex(0);
    setConfirmDismiss(false);
  }, [data]);
  
  // Reset confirmation when profile changes
  useEffect(() => {
    setConfirmDismiss(false);
  }, [index]);

  const likeMutation = useMutation({
    mutationFn: async (likedId) => {
      const res = await apiFetch("/api/matches/like", {
        method: "POST",
        body: JSON.stringify({ likedId }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: () => {
      setIndex((i) => i + 1);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
    },
    onError: (e) => {
      // @ts-ignore
      if (e?.code === 401 || e?.message === "AUTH_401") {
        Alert.alert("Sign in required", "Please sign in to continue.");
        if (isReady) signIn();
        return;
      }
      Alert.alert("Error", "Could not perform action");
    },
  });

  const discardMutation = useMutation({
    mutationFn: async (blockedId) => {
      const res = await apiFetch("/api/blockers", {
        method: "POST",
        body: JSON.stringify({ blockedId }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to discard");
      return res.json();
    },
    onSuccess: () => {
      setIndex((i) => i + 1);
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
    },
    onError: (e) => {
      // @ts-ignore
      if (e?.code === 401 || e?.message === "AUTH_401") {
        Alert.alert("Sign in required", "Please sign in to continue.");
        if (isReady) signIn();
        return;
      }
      Alert.alert("Error", "Could not discard profile");
    },
  });

  const profiles = data?.profiles || [];
  const current = profiles[index];

  if (!loaded && !errorFont) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.bg,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (isLoading)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.bg,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  if (error)
    return (
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 16 }}>
        {/* @ts-ignore */}
        {error?.message === "AUTH_401" ? (
          <View>
            <Text
              style={{
                marginBottom: 12,
                color: COLORS.text,
                fontFamily: "Inter_400Regular",
              }}
            >
              Session expired. Please sign in.
            </Text>
            <TouchableOpacity
              onPress={() => isReady && signIn()}
              style={{
                backgroundColor: COLORS.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "600",
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}>
            Error loading
          </Text>
        )}
      </View>
    );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          marginBottom: 12,
          color: COLORS.text,
          fontFamily: "Inter_700Bold",
        }}
      >
        Discover
      </Text>

      {/* Quick Access Buttons */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/daily-picks")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: "#FFFFFF",
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.primary + "30",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Sparkles size={18} color={COLORS.primary} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: COLORS.primary,
              fontFamily: "Inter_700Bold",
            }}
          >
            Daily Picks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/profile-viewers")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: "#FFFFFF",
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.secondary + "30",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Eye size={18} color={COLORS.secondary} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: COLORS.secondary,
              fontFamily: "Inter_700Bold",
            }}
          >
            Who Viewed Me
          </Text>
        </TouchableOpacity>
      </View>

      {current ? (
        <SwipeableCard
          profile={current}
          onSwipeLeft={() => setIndex((i) => i + 1)}
          onSwipeRight={() => likeMutation.mutateAsync(current.id)}
          onTap={() => router.push(`/profile/${current.id}`)}
          onDismiss={() => handleDismiss(current.id, discardMutation, setConfirmDismiss, confirmDismiss)}
          confirmDismiss={confirmDismiss}
        />
      ) : (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            style={{
              color: COLORS.text,
              opacity: 0.6,
              marginBottom: 12,
              fontFamily: "Inter_400Regular",
            }}
          >
            No more profiles.
          </Text>
          <TouchableOpacity
            onPress={refetch}
            style={{
              backgroundColor: COLORS.primary,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "600",
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Swipeable Card Component
function SwipeableCard({ profile, onSwipeLeft, onSwipeRight, onTap, onDismiss, confirmDismiss }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const router = useRouter();

  // Reset animation values when a new profile loads
  useEffect(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }, [profile.id]);

  const handleSwipe = async (direction) => {
    try {
      await (direction > 0 ? onSwipeRight() : onSwipeLeft());
      // Success - card will reset when new profile loads via useEffect
    } catch (error) {
      // Error - reset card position to allow retry
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        const direction = translateX.value > 0 ? 1 : -1;
        translateX.value = withTiming(direction * SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(handleSwipe)(direction);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-30, 0, 30],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [1, 0.7],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    };
  });

  const likeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const nopeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  return (
    <View style={{ flex: 1, alignItems: "center", width: "100%" }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ width: "100%", position: "relative" }, cardStyle]}>
          <TouchableOpacity
            onPress={onTap}
            style={{ width: "100%", position: "relative" }}
            activeOpacity={0.9}
          >
            {profile.photo ? (
              <AuthenticatedImage
                source={{ uri: profile.photo }}
                style={{
                  width: "100%",
                  height: 360,
                  borderRadius: 16,
                  backgroundColor: COLORS.cardBg,
                }}
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: 360,
                  borderRadius: 16,
                  backgroundColor: COLORS.cardBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}
                >
                  View Profile
                </Text>
              </View>
            )}

            {/* LIKE Overlay */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: 60,
                  left: 30,
                  borderWidth: 4,
                  borderColor: "#4ADE80",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  transform: [{ rotate: "-20deg" }],
                },
                likeOverlayStyle,
              ]}
              pointerEvents="none"
            >
              <Text
                style={{
                  color: "#4ADE80",
                  fontSize: 32,
                  fontWeight: "800",
                  fontFamily: "Inter_700Bold",
                }}
              >
                LIKE
              </Text>
            </Animated.View>

            {/* NOPE Overlay */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: 60,
                  right: 30,
                  borderWidth: 4,
                  borderColor: "#EF4444",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  transform: [{ rotate: "20deg" }],
                },
                nopeOverlayStyle,
              ]}
              pointerEvents="none"
            >
              <Text
                style={{
                  color: "#EF4444",
                  fontSize: 32,
                  fontWeight: "800",
                  fontFamily: "Inter_700Bold",
                }}
              >
                NOPE
              </Text>
            </Animated.View>
            
            {/* Compatibility Score Badge */}
            {profile.compatibility_score !== undefined && (
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: 14,
                    fontFamily: "Inter_700Bold",
                  }}
                >
                  {Math.round(profile.compatibility_score * 100)}% Match
                </Text>
              </View>
            )}
            
            {/* Liked You Badge */}
            {profile.liked_you && (
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  backgroundColor: "#FF69B4",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: 12,
                    fontFamily: "Inter_700Bold",
                  }}
                >
                  💕 Likes You
                </Text>
              </View>
            )}
            
            {/* Swipe Hint */}
            <View
              style={{
                position: "absolute",
                bottom: 12,
                left: 0,
                right: 0,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  👈 Swipe or tap to interact 👉
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
      
      {/* Name and Info Below Card */}
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          marginTop: 16,
          color: COLORS.text,
          fontFamily: "Inter_700Bold",
        }}
      >
        {profile.name || "User " + profile.id}
      </Text>
      
      {/* Relationship Goals */}
      {profile.relationship_goals && (
        <Text
          style={{
            fontSize: 14,
            color: COLORS.text,
            opacity: 0.7,
            marginTop: 4,
            fontFamily: "Inter_400Regular",
          }}
        >
          Looking for: {profile.relationship_goals}
        </Text>
      )}
      
      {/* Bio Preview */}
      {profile.bio && (
        <Text
          style={{
            fontSize: 14,
            color: COLORS.text,
            opacity: 0.8,
            marginTop: 8,
            textAlign: "center",
            paddingHorizontal: 24,
            fontFamily: "Inter_400Regular",
          }}
          numberOfLines={2}
        >
          {profile.bio}
        </Text>
      )}
      
      {/* Mutual Interests */}
      {profile.mutual_interests && profile.mutual_interests.length > 0 && (
        <View style={{ marginTop: 12, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.text,
              opacity: 0.6,
              marginBottom: 6,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            {profile.mutual_interests.length} Shared Interest{profile.mutual_interests.length > 1 ? 's' : ''}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 6,
              maxWidth: "90%",
            }}
          >
            {profile.mutual_interests.slice(0, 3).map((interest, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: "#EDE9FE",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 12,
                    fontWeight: "600",
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {interest}
                </Text>
              </View>
            ))}
            {profile.mutual_interests.length > 3 && (
              <View
                style={{
                  backgroundColor: COLORS.cardBg,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 12,
                    opacity: 0.7,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  +{profile.mutual_interests.length - 3} more
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      {/* Action Buttons */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 16,
          marginTop: 20,
        }}
      >
        <TouchableOpacity
          onPress={onDismiss}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: confirmDismiss ? "#FEE2E2" : COLORS.cardBg,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: confirmDismiss ? 3 : 0,
            borderColor: confirmDismiss ? COLORS.error : "transparent",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <X color={COLORS.error} size={28} strokeWidth={confirmDismiss ? 3 : 2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSwipeRight}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#EDE7FF",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Heart color={COLORS.primary} size={28} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

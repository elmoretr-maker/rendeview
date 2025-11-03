import React, { useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";
import { Heart, Video as VideoIcon, X, ArrowLeft } from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth"; // added for 401 handling
import { apiFetch, getAbsoluteUrl } from "@/utils/api/apiFetch";
// ADD: Inter fonts + palette
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function RemoteProfile() {
  const { userId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signIn, isReady } = useAuth(); // added
  const targetId = Number(userId);
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["remote-profile", targetId],
    queryFn: async () => {
      const res = await apiFetch(`/api/profile/${targetId}`);
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    retry: (count, err) => {
      // @ts-ignore
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const media = data?.media || [];
  const user = data?.user || {};
  const video = media.find((m) => m.type === "video");
  const player = useVideoPlayer(video?.url || undefined, (p) => {
    if (!video?.url) return;
    p.loop = true;
  });
  const videoRef = useRef(null);

  const typical = user?.typical_availability?.typical || [];
  const timezone = user?.typical_availability?.timezone || user?.timezone;

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/matches/like", {
        method: "POST",
        body: JSON.stringify({ likedId: targetId }),
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
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      Alert.alert(
        resp?.matched ? "It's a match!" : "Liked",
        resp?.matched
          ? "You can now chat and schedule."
          : "We'll let you know if they like you back.",
      );
    },
    onError: (e) => {
      // @ts-ignore
      if (e?.code === 401 || e?.message === "AUTH_401") {
        Alert.alert("Sign in required", "Please sign in to continue.");
        if (isReady) signIn();
        return;
      }
      Alert.alert("Error", "Unable to like this profile");
    },
  });

  const discardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: targetId }),
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
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      Alert.alert("Removed", "We'll hide this profile going forward.");
      router.back();
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

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      // Like first to ensure intent; if mutual, try to find the match
      let matched = false;
      try {
        const likeRes = await fetch("/api/matches/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ likedId: targetId }),
        });
        if (likeRes.status === 401) {
          const err = new Error("AUTH_401");
          // @ts-ignore
          err.code = 401;
          throw err;
        }
        if (likeRes.ok) {
          const j = await likeRes.json();
          matched = !!j.matched;
        }
      } catch (e) {
        // bubble up auth error
        // @ts-ignore
        if (e?.code === 401 || e?.message === "AUTH_401") throw e;
      }

      if (!matched) {
        // Not mutual yet; inform the user politely
        return {
          scheduled: false,
          message:
            "Like sent — once it's a match, you can schedule a video chat.",
        };
      }
      // Fetch matches and locate this match id
      const listRes = await fetch("/api/matches/list");
      if (listRes.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (!listRes.ok) throw new Error("Failed to load matches");
      const list = await listRes.json();
      const m = (list.matches || []).find(
        (x) => x.user?.id === targetId || x.other_id === targetId,
      );
      if (!m?.match_id) {
        return {
          scheduled: false,
          message: "Match found, but could not locate the thread.",
        };
      }
      // Propose a simple default slot: now + 24h for 30m
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const res = await fetch("/api/schedule/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: m.match_id, start, end }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (res.status === 403) {
        const j = await res.json();
        return {
          scheduled: false,
          message: j?.error || "Please upgrade to schedule video chats.",
        };
      }
      if (!res.ok) throw new Error("Failed to schedule");
      const j = await res.json();
      return { scheduled: true, proposal: j.proposal };
    },
    onSuccess: (r) => {
      if (r?.scheduled) {
        Alert.alert(
          "Scheduled",
          "Proposal sent — check your messages to confirm.",
        );
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      } else {
        Alert.alert("Heads up", r?.message || "Unable to schedule right now");
      }
    },
    onError: (e) => {
      // @ts-ignore
      if (e?.code === 401 || e?.message === "AUTH_401") {
        Alert.alert("Sign in required", "Please sign in to continue.");
        if (isReady) signIn();
        return;
      }
      Alert.alert("Error", "Could not start scheduling");
    },
  });

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
        <Text style={{ color: COLORS.text }}>Loading...</Text>
      </View>
    );
  }

  if (isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
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
            Error loading profile
          </Text>
        )}
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header with back button */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: COLORS.bg,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#F3F4F6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: COLORS.text,
            fontFamily: "Inter_700Bold",
            flex: 1,
          }}
        >
          {user?.name || `User ${user?.id}`}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
      >

      {/* Primary photo at top if available */}
      {user?.primary_photo_url ? (
        <Image
          source={{ uri: user.primary_photo_url }}
          style={{
            width: "100%",
            height: 260,
            borderRadius: 14,
            backgroundColor: COLORS.cardBg,
          }}
        />
      ) : null}

      {/* Video section */}
      {video?.url ? (
        <View
          style={{
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#000",
            marginTop: 12,
          }}
        >
          <VideoView
            ref={videoRef}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
            style={{ width: "100%", height: 220 }}
          />
        </View>
      ) : null}

      {/* Photos */}
      <Text
        style={{
          fontWeight: "700",
          marginTop: 16,
          marginBottom: 8,
          color: COLORS.text,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        Photos
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {media
          .filter((m) => m.type === "photo")
          .map((m, idx) => (
            <Image
              key={idx}
              source={{ uri: m.url }}
              style={{
                width: 96,
                height: 96,
                borderRadius: 10,
                backgroundColor: COLORS.cardBg,
              }}
            />
          ))}
      </View>

      {/* Membership Tier & Status */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {user?.membership_tier && (
          <View
            style={{
              backgroundColor: COLORS.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" }}>
              {user.membership_tier.charAt(0).toUpperCase() + user.membership_tier.slice(1)} Member
            </Text>
          </View>
        )}
        {user?.immediate_available && (
          <View
            style={{
              backgroundColor: "#10B981",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" }}>
              Online Now
            </Text>
          </View>
        )}
      </View>

      {/* About / Bio */}
      <Text
        style={{
          fontWeight: "700",
          marginTop: 16,
          marginBottom: 6,
          color: COLORS.text,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        About
      </Text>
      <Text
        style={{
          color: COLORS.text,
          opacity: 0.8,
          fontFamily: "Inter_400Regular",
          lineHeight: 20,
        }}
      >
        {user?.bio || "No bio provided."}
      </Text>

      {/* Interests */}
      {user?.interests && Array.isArray(user.interests) && user.interests.length > 0 && (
        <>
          <Text
            style={{
              fontWeight: "700",
              marginTop: 16,
              marginBottom: 8,
              color: COLORS.text,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Interests & Hobbies
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {user.interests.map((interest, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: "#EDE7FF",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 13,
                    fontWeight: "600",
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {interest}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Personal Details - only show if at least one field exists */}
      {(user?.gender || user?.sexual_orientation || user?.looking_for || user?.relationship_goals || 
        user?.height_range || user?.body_type || user?.education) && (
        <>
          <Text
            style={{
              fontWeight: "700",
              marginTop: 16,
              marginBottom: 8,
              color: COLORS.text,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Personal Details
          </Text>
          <View style={{ gap: 6 }}>
            {user?.gender && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Gender:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.gender}
                </Text>
              </View>
            )}
            {user?.sexual_orientation && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Orientation:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.sexual_orientation}
                </Text>
              </View>
            )}
            {user?.looking_for && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Looking For:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.looking_for}
                </Text>
              </View>
            )}
            {user?.relationship_goals && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Relationship Goals:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.relationship_goals}
                </Text>
              </View>
            )}
            {user?.height_range && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Height:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.height_range}
                </Text>
              </View>
            )}
            {user?.body_type && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Body Type:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.body_type}
                </Text>
              </View>
            )}
            {user?.education && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Education:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.education}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Lifestyle - only show if at least one field exists */}
      {(user?.drinking || user?.smoking || user?.exercise || user?.religion || 
        user?.children_preference || user?.pets) && (
        <>
          <Text
            style={{
              fontWeight: "700",
              marginTop: 16,
              marginBottom: 8,
              color: COLORS.text,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Lifestyle
          </Text>
          <View style={{ gap: 6 }}>
            {user?.drinking && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Drinking:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.drinking}
                </Text>
              </View>
            )}
            {user?.smoking && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Smoking:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.smoking}
                </Text>
              </View>
            )}
            {user?.exercise && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Exercise:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.exercise}
                </Text>
              </View>
            )}
            {user?.religion && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Religion:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.religion}
                </Text>
              </View>
            )}
            {user?.children_preference && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Children:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.children_preference}
                </Text>
              </View>
            )}
            {user?.pets && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: COLORS.text, opacity: 0.6, fontFamily: "Inter_400Regular", width: 140 }}>
                  Pets:
                </Text>
                <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular", fontWeight: "600" }}>
                  {user.pets}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      <Text
        style={{
          fontWeight: "700",
          marginTop: 16,
          marginBottom: 6,
          color: COLORS.text,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        Typical Availability
      </Text>
      {typical.length > 0 ? (
        typical.map((slot, i) => (
          <Text
            key={i}
            style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}
          >
            {(slot.days || []).join(", ")} • {slot.start} - {slot.end}
          </Text>
        ))
      ) : (
        <Text
          style={{
            color: COLORS.text,
            opacity: 0.6,
            fontFamily: "Inter_400Regular",
          }}
        >
          Not shared
        </Text>
      )}
      {timezone ? (
        <Text
          style={{
            color: COLORS.text,
            opacity: 0.6,
            marginTop: 4,
            fontFamily: "Inter_400Regular",
          }}
        >
          Timezone: {timezone}
        </Text>
      ) : null}

      {/* Action buttons */}
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          marginTop: 20,
          justifyContent: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => discardMutation.mutate()}
          style={{
            backgroundColor: COLORS.cardBg,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <X color={COLORS.error} size={20} />
          <Text
            style={{
              fontWeight: "700",
              color: COLORS.text,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Discard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => likeMutation.mutate()}
          style={{
            backgroundColor: "#EDE7FF",
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Heart color={COLORS.primary} size={20} />
          <Text
            style={{
              fontWeight: "700",
              color: COLORS.primary,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Like
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => scheduleMutation.mutate()}
          style={{
            backgroundColor: COLORS.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <VideoIcon color="#FFFFFF" size={20} />
          <Text
            style={{
              fontWeight: "700",
              color: "#FFFFFF",
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Schedule Video Chat
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

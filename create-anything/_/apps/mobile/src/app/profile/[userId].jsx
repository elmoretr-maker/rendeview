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
import { Heart, Video as VideoIcon, X } from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth"; // added for 401 handling
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
      const res = await fetch(`/api/profile/${targetId}`);
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
      const res = await fetch("/api/matches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 24,
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
        {user?.name || `User ${user?.id}`}
      </Text>

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

      {/* About / Availability */}
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
        }}
      >
        No bio provided.
      </Text>

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
  );
}

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Heart } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
// ADD: Inter fonts for modern typography
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

// Brand palette
const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function Discovery() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { signIn, isReady } = useAuth();
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["discovery"],
    queryFn: async () => {
      const res = await fetch("/api/discovery/list");
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
  useEffect(() => {
    setIndex(0);
  }, [data]);

  const likeMutation = useMutation({
    mutationFn: async (likedId) => {
      const res = await fetch("/api/matches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      {current ? (
        <View style={{ flex: 1, alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.push(`/profile/${current.id}`)}
            style={{ width: "100%" }}
          >
            {current.photo ? (
              <Image
                source={{ uri: current.photo }}
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
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginTop: 12,
              color: COLORS.text,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            {current.name || "User " + current.id}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 16,
              marginTop: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => discardMutation.mutate(current.id)}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: COLORS.cardBg,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <X color={COLORS.error} size={28} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => likeMutation.mutate(current.id)}
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

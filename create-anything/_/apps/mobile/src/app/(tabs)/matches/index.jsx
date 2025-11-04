import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth"; // NEW
import { apiFetch, getAbsoluteUrl } from "@/utils/api/apiFetch";
// Fonts + brand
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

export default function Matches() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, isReady } = useAuth(); // NEW
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await apiFetch("/api/matches/list");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
    retry: (count, err) => {
      // @ts-ignore
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const matches = data?.matches || [];

  if (!loaded && !errorFont) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: COLORS.text,
            fontFamily: "Inter_700Bold",
          }}
        >
          Matches
        </Text>
        <Link href="/(tabs)/matches/likers" asChild>
          <TouchableOpacity
            style={{
              backgroundColor: "#EDE7FF",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text
              style={{
                color: COLORS.primary,
                fontWeight: "600",
                fontFamily: "Inter_600SemiBold",
              }}
            >
              View Likers
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : error ? (
        // @ts-ignore
        error?.message === "AUTH_401" ? (
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
              onPress={() => router.push("/welcome")}
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
        )
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => String(item.match_id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/messages/${item.match_id}`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: COLORS.cardBg,
              }}
            >
              {item.user.photo ? (
                <Image
                  source={{ uri: getAbsoluteUrl(item.user.photo) }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#EEE",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#EEE",
                  }}
                />
              )}
              <View style={{ marginLeft: 12 }}>
                <Text
                  style={{
                    fontWeight: "600",
                    color: COLORS.text,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {item.user.name || `User ${item.user.id}`}
                </Text>
                <Text
                  style={{
                    color: "#6B7280",
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {item.last_chat_at ? "Active chat" : "New match"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

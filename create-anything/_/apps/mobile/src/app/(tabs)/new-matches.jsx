import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Sparkles, MessageCircle, ArrowLeft } from "lucide-react-native";
import { getAbsoluteUrl } from "@/utils/api/apiFetch";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function NewMatches() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["newMatches"],
    queryFn: async () => {
      const res = await fetch("/api/new-matches");
      if (!res.ok) throw new Error("Failed to load new matches");
      return res.json();
    },
  });

  const markViewedMutation = useMutation({
    mutationFn: async (matchId) => {
      const res = await fetch("/api/mark-match-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (!res.ok) throw new Error("Failed to mark as viewed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  const matches = data?.matches || [];

  const handleViewMatch = async (matchId) => {
    await markViewedMutation.mutateAsync(matchId);
    router.push(`/(tabs)/messages/${matchId}`);
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          paddingTop: insets.top,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text
          style={{
            marginTop: 16,
            fontSize: 16,
            color: COLORS.text,
            fontFamily: "Inter_400Regular",
          }}
        >
          Loading your new matches...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 16,
            color: COLORS.text,
            fontFamily: "Inter_700Bold",
          }}
        >
          New Matches
        </Text>
        <Text style={{ color: COLORS.error, fontFamily: "Inter_400Regular" }}>
          Error loading new matches
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {matches.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Heart
              size={80}
              color={COLORS.primary}
              fill={COLORS.primary}
              style={{ marginBottom: 16 }}
            />
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                marginBottom: 12,
                color: COLORS.text,
                fontFamily: "Inter_700Bold",
                textAlign: "center",
              }}
            >
              No New Matches Yet
            </Text>
            <Text
              style={{
                fontSize: 16,
                marginBottom: 24,
                color: COLORS.text,
                fontFamily: "Inter_400Regular",
                textAlign: "center",
                opacity: 0.7,
              }}
            >
              Keep swiping in Discovery to find your next connection!
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/discovery")}
              style={{
                backgroundColor: COLORS.primary,
                paddingVertical: 14,
                paddingHorizontal: 28,
                borderRadius: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "700",
                  fontFamily: "Inter_700Bold",
                }}
              >
                Go to Discovery
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
                gap: 8,
              }}
            >
              <Sparkles size={28} color={COLORS.secondary} />
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "700",
                  color: COLORS.text,
                  fontFamily: "Inter_700Bold",
                }}
              >
                You Have {matches.length} New {matches.length === 1 ? "Match" : "Matches"}!
              </Text>
              <Sparkles size={28} color={COLORS.secondary} />
            </View>
            <Text
              style={{
                fontSize: 16,
                color: COLORS.text,
                fontFamily: "Inter_400Regular",
                textAlign: "center",
                marginBottom: 24,
                opacity: 0.7,
              }}
            >
              Start a conversation and make a connection!
            </Text>

            {matches.map((item) => (
              <TouchableOpacity
                key={item.match_id}
                onPress={() => handleViewMatch(item.match_id)}
                disabled={markViewedMutation.isPending}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 2,
                  borderColor: COLORS.secondary,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                  position: "relative",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    backgroundColor: COLORS.secondary,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderBottomLeftRadius: 8,
                    borderTopRightRadius: 14,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: "700",
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    NEW
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ position: "relative" }}>
                    {item.user.photo ? (
                      <Image
                        source={{ uri: getAbsoluteUrl(item.user.photo) }}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          borderWidth: 4,
                          borderColor: COLORS.secondary,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          backgroundColor: "#E5E7EB",
                          borderWidth: 4,
                          borderColor: COLORS.secondary,
                        }}
                      />
                    )}
                    <View
                      style={{
                        position: "absolute",
                        bottom: -4,
                        right: -4,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: COLORS.secondary,
                        justifyContent: "center",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                    >
                      <Heart size={16} fill="#FFFFFF" color="#FFFFFF" />
                    </View>
                  </View>

                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "700",
                        marginBottom: 4,
                        color: COLORS.text,
                        fontFamily: "Inter_700Bold",
                      }}
                    >
                      {item.user.name || `User ${item.user.id}`}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#666",
                        marginBottom: 8,
                        fontFamily: "Inter_400Regular",
                      }}
                    >
                      Matched{" "}
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: COLORS.primary + "20",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        alignSelf: "flex-start",
                        gap: 6,
                      }}
                    >
                      <MessageCircle size={16} color={COLORS.primary} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: COLORS.primary,
                          fontFamily: "Inter_700Bold",
                        }}
                      >
                        Start Chatting
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <View style={{ alignItems: "center", marginTop: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  marginBottom: 16,
                  color: "#666",
                  fontFamily: "Inter_400Regular",
                  textAlign: "center",
                }}
              >
                After you start a conversation, these matches will move to your Matches page
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/matches/index")}
                style={{
                  backgroundColor: COLORS.cardBg,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 14,
                    fontWeight: "700",
                    fontFamily: "Inter_700Bold",
                  }}
                >
                  View All Matches
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

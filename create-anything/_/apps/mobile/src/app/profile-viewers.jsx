import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, X, Eye, ArrowLeft } from "lucide-react-native";
import { getAbsoluteUrl } from "@/utils/api/apiFetch";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function ProfileViewers() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["profileViewers"],
    queryFn: async () => {
      const res = await fetch("/api/profile-views");
      if (!res.ok) throw new Error("Failed to load profile viewers");
      return res.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (likedId) => {
      const res = await fetch("/api/matches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likedId }),
      });
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: (data, likedId) => {
      queryClient.invalidateQueries({ queryKey: ["profileViewers"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });

      if (data?.matched) {
        const likedViewer = viewers.find((v) => v.user.id === likedId);
        Alert.alert(
          "It's a Match! 🎉",
          `You and ${likedViewer?.user.name || "this user"} both liked each other!`,
          [
            {
              text: "View New Matches",
              onPress: () => router.push("/(tabs)/new-matches"),
            },
            { text: "Keep Browsing", style: "cancel" },
          ]
        );
      } else {
        Alert.alert("Success", "Profile liked!");
      }
    },
    onError: () => {
      Alert.alert("Error", "Could not like profile");
    },
  });

  const passMutation = useMutation({
    mutationFn: async (blockedId) => {
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId }),
      });
      if (!res.ok) throw new Error("Failed to pass");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profileViewers"] });
    },
    onError: () => {
      Alert.alert("Error", "Could not pass profile");
    },
  });

  const viewers = data?.viewers || [];

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
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 16,
            color: COLORS.text,
            fontFamily: "Inter_700Bold",
          }}
        >
          Profile Viewers
        </Text>
        <Text style={{ color: COLORS.error, fontFamily: "Inter_400Regular" }}>
          Error loading profile viewers
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Eye size={28} color={COLORS.primary} />
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: COLORS.text,
                fontFamily: "Inter_700Bold",
              }}
            >
              Profile Viewers
            </Text>
          </View>
          <Text
            style={{
              fontSize: 15,
              color: "#666",
              fontFamily: "Inter_400Regular",
              textAlign: "center",
            }}
          >
            See who's been checking out your profile
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#999",
              fontFamily: "Inter_400Regular",
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Recent viewers from the last 7 days
          </Text>
        </View>

        {viewers.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Text
              style={{
                fontSize: 16,
                color: COLORS.text,
                fontFamily: "Inter_400Regular",
              }}
            >
              No profile views yet. Keep being active!
            </Text>
          </View>
        ) : (
          viewers.map((viewer) => (
            <View
              key={viewer.user.id}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                marginBottom: 16,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <TouchableOpacity
                onPress={() => router.push(`/profile/${viewer.user.id}`)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                }}
              >
                {viewer.user.photo ? (
                  <Image
                    source={{ uri: getAbsoluteUrl(viewer.user.photo) }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: "#E5E7EB",
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: "#E5E7EB",
                    }}
                  />
                )}
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: COLORS.text,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    {viewer.user.name || `User ${viewer.user.id}`}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#666",
                      marginTop: 4,
                      fontFamily: "Inter_400Regular",
                    }}
                  >
                    Viewed{" "}
                    {new Date(viewer.viewed_at).toLocaleDateString()} at{" "}
                    {new Date(viewer.viewed_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    {viewer.user.immediate_available && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "#10B981",
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#10B981",
                            fontWeight: "700",
                            fontFamily: "Inter_700Bold",
                          }}
                        >
                          Online Now
                        </Text>
                      </View>
                    )}
                    {viewer.user.membership_tier && (
                      <View
                        style={{
                          backgroundColor: COLORS.cardBg,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.text,
                            fontFamily: "Inter_400Regular",
                          }}
                        >
                          {viewer.user.membership_tier.charAt(0).toUpperCase() +
                            viewer.user.membership_tier.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Bio preview */}
              {viewer.user.bio && (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#374151",
                      fontFamily: "Inter_400Regular",
                    }}
                    numberOfLines={2}
                  >
                    {viewer.user.bio}
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <View
                style={{
                  flexDirection: "row",
                  borderTopWidth: 1,
                  borderTopColor: "#F3F4F6",
                }}
              >
                <TouchableOpacity
                  onPress={() => passMutation.mutate(viewer.user.id)}
                  disabled={passMutation.isPending || likeMutation.isPending}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 16,
                    backgroundColor:
                      passMutation.isPending ? COLORS.cardBg : "transparent",
                    opacity:
                      passMutation.isPending || likeMutation.isPending ? 0.5 : 1,
                  }}
                >
                  <X size={20} color={COLORS.error} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: COLORS.error,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    Pass
                  </Text>
                </TouchableOpacity>
                <View
                  style={{ width: 1, backgroundColor: "#E5E7EB" }}
                />
                <TouchableOpacity
                  onPress={() => likeMutation.mutate(viewer.user.id)}
                  disabled={likeMutation.isPending || passMutation.isPending}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 16,
                    backgroundColor:
                      likeMutation.isPending ? COLORS.cardBg : "transparent",
                    opacity:
                      likeMutation.isPending || passMutation.isPending ? 0.5 : 1,
                  }}
                >
                  <Heart size={20} color={COLORS.secondary} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: COLORS.secondary,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    Like
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

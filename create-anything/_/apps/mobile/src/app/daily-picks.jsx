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
import { Heart, X, Sparkles, ArrowLeft } from "lucide-react-native";
import { apiFetch, getAbsoluteUrl } from "@/utils/api/apiFetch";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function DailyPicks() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [matchedUser, setMatchedUser] = React.useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dailyPicks"],
    queryFn: async () => {
      const res = await apiFetch("/api/daily-picks");
      if (!res.ok) throw new Error("Failed to load daily picks");
      return res.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (likedId) => {
      const res = await apiFetch("/api/matches/like", {
        method: "POST",
        body: JSON.stringify({ likedId }),
      });
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: (data, likedId) => {
      queryClient.invalidateQueries({ queryKey: ["dailyPicks"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });

      if (data?.matched) {
        const likedPick = picks.find((p) => p.id === likedId);
        Alert.alert(
          "It's a Match! 🎉",
          `You and ${likedPick?.name || "this user"} both liked each other!`,
          [
            {
              text: "View New Matches",
              onPress: () => router.push("/(tabs)/new-matches"),
            },
            { text: "Keep Swiping", style: "cancel" },
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
      const res = await apiFetch("/api/blockers", {
        method: "POST",
        body: JSON.stringify({ blockedId }),
      });
      if (!res.ok) throw new Error("Failed to pass");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyPicks"] });
    },
    onError: () => {
      Alert.alert("Error", "Could not pass profile");
    },
  });

  const picks = data?.picks || [];
  const generated = data?.generated || false;

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
          Daily Picks
        </Text>
        <Text style={{ color: COLORS.error, fontFamily: "Inter_400Regular" }}>
          Error loading daily picks
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
            <Sparkles size={28} color={COLORS.primary} />
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: COLORS.text,
                fontFamily: "Inter_700Bold",
              }}
            >
              Daily Picks
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
            {generated ? "Fresh" : "Today's"} curated matches just for you
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
            10 compatible profiles selected daily based on your interests
          </Text>
        </View>

        {picks.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Text
              style={{
                fontSize: 16,
                color: COLORS.text,
                fontFamily: "Inter_400Regular",
              }}
            >
              No picks available today. Check back tomorrow!
            </Text>
          </View>
        ) : (
          picks.map((pick) => (
            <View
              key={pick.id}
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
                onPress={() => router.push(`/profile/${pick.id}`)}
              >
                {pick.photo ? (
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{ uri: getAbsoluteUrl(pick.photo) }}
                      style={{
                        width: "100%",
                        height: 320,
                        backgroundColor: COLORS.cardBg,
                      }}
                      resizeMode="cover"
                    />
                    {/* Gradient overlay */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 96,
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                        backgroundColor: "rgba(0,0,0,0.5)",
                      }}
                    />

                    {/* Profile info overlay */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 16,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: "#FFFFFF",
                            fontFamily: "Inter_700Bold",
                          }}
                        >
                          {pick.name || `User ${pick.id}`}
                        </Text>
                        {pick.immediate_available && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              backgroundColor: "#10B981",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 12,
                            }}
                          >
                            <View
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: "#FFFFFF",
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: "#FFFFFF",
                                fontFamily: "Inter_700Bold",
                              }}
                            >
                              Online
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Compatibility score */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: COLORS.secondary,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: "#FFFFFF",
                              fontFamily: "Inter_700Bold",
                            }}
                          >
                            {Math.round(pick.compatibility_score * 100)}% Match
                          </Text>
                        </View>
                        {pick.membership_tier && (
                          <View
                            style={{
                              backgroundColor: "rgba(255,255,255,0.2)",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: "#FFFFFF",
                                fontFamily: "Inter_700Bold",
                              }}
                            >
                              {pick.membership_tier.charAt(0).toUpperCase() +
                                pick.membership_tier.slice(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: 320,
                      backgroundColor: COLORS.cardBg,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#999",
                        fontFamily: "Inter_400Regular",
                      }}
                    >
                      No Photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Bio preview */}
              {pick.bio && (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
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
                    {pick.bio}
                  </Text>
                </View>
              )}

              {/* Interests */}
              {pick.interests && pick.interests.length > 0 && (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {pick.interests.slice(0, 3).map((interest, idx) => (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: COLORS.cardBg,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: COLORS.text,
                            fontFamily: "Inter_400Regular",
                          }}
                        >
                          {interest}
                        </Text>
                      </View>
                    ))}
                    {pick.interests.length > 3 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#999",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          fontFamily: "Inter_400Regular",
                        }}
                      >
                        +{pick.interests.length - 3}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  onPress={() => passMutation.mutate(pick.id)}
                  disabled={passMutation.isPending || likeMutation.isPending}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 16,
                    opacity: passMutation.isPending || likeMutation.isPending ? 0.5 : 1,
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
                  onPress={() => likeMutation.mutate(pick.id)}
                  disabled={likeMutation.isPending || passMutation.isPending}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 16,
                    opacity: likeMutation.isPending || passMutation.isPending ? 0.5 : 1,
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

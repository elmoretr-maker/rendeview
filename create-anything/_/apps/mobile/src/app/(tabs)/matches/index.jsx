import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { apiFetch, getAbsoluteUrl } from "@/utils/api/apiFetch";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import { useQueryClient } from "@tanstack/react-query";
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
  gray600: "#6B7280",
};

export default function Matches() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signIn, isReady } = useAuth();
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await apiFetch("/api/matches-list");
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

  // Fetch saved profiles (Top Picks)
  const { data: savedData, isLoading: savedLoading } = useQuery({
    queryKey: ["savedProfiles"],
    queryFn: async () => {
      const res = await apiFetch("/api/saved-profiles");
      if (!res.ok) throw new Error("Failed to load saved profiles");
      return res.json();
    },
  });

  const matches = data?.matches || [];
  const savedProfiles = savedData?.savedProfiles || [];

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
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
            <Text style={{ 
              color: COLORS.text, 
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              marginBottom: 12,
              textAlign: "center"
            }}>
              Error Loading Matches
            </Text>
            <Text style={{ 
              color: COLORS.gray600, 
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              textAlign: "center",
              marginBottom: 20
            }}>
              Please try again later
            </Text>
          </View>
        )
      ) : (
        <FlatList
          ListHeaderComponent={() => (
            <>
              {/* Top Picks Section - Always Visible */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}>
                    ⭐ Top Picks
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#EDE7FF",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>
                      {savedProfiles.length}/5
                    </Text>
                  </View>
                </View>
                
                {savedProfiles.length > 0 ? (
                  <>
                    {savedProfiles.map((profile) => (
                      <TouchableOpacity
                        key={profile.id}
                        onPress={() => router.push(`/profile/${profile.id}`)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          marginBottom: 8,
                          backgroundColor: "#FFF9EB",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#FFD700",
                        }}
                      >
                        {profile.photo ? (
                          <AuthenticatedImage
                            source={{ uri: profile.photo }}
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
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ color: COLORS.text, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>
                              {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
                            </Text>
                          </View>
                        )}
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text
                            style={{
                              fontWeight: "600",
                              color: COLORS.text,
                              fontFamily: "Inter_600SemiBold",
                            }}
                          >
                            {profile.name || `User ${profile.id}`}
                          </Text>
                          <Text
                            style={{
                              color: "#6B7280",
                              fontSize: 12,
                              fontFamily: "Inter_400Regular",
                            }}
                            numberOfLines={1}
                          >
                            {profile.bio || "No bio available"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert(
                              "Remove from Top Picks",
                              `Remove ${profile.name || "this user"} from Top Picks?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Remove",
                                  style: "destructive",
                                  onPress: async () => {
                                    try {
                                      const res = await apiFetch(`/api/saved-profiles?savedUserId=${profile.id}`, {
                                        method: "DELETE",
                                      });
                                      if (res.ok) {
                                        queryClient.invalidateQueries({ queryKey: ["savedProfiles"] });
                                      }
                                    } catch (err) {
                                      Alert.alert("Error", "Could not remove from Top Picks");
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                          style={{
                            padding: 8,
                          }}
                        >
                          <Text style={{ color: COLORS.error, fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                    
                    {savedProfiles.length < 5 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.gray600,
                          textAlign: "center",
                          marginTop: 8,
                          fontFamily: "Inter_400Regular",
                        }}
                      >
                        Save up to 5 profiles from Discovery to your Top Picks
                      </Text>
                    )}
                  </>
                ) : (
                  <View style={{
                    backgroundColor: "#FFF9EB",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#FFD700",
                    padding: 20,
                    alignItems: "center",
                  }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>⭐</Text>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: COLORS.text,
                      fontFamily: "Inter_600SemiBold",
                      textAlign: "center",
                      marginBottom: 6,
                    }}>
                      No Top Picks saved yet
                    </Text>
                    <Text style={{
                      fontSize: 13,
                      color: COLORS.gray600,
                      fontFamily: "Inter_400Regular",
                      textAlign: "center",
                      marginBottom: 16,
                    }}>
                      Save up to 5 profiles from Discovery to keep track of people you're most interested in
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push("/(tabs)/discovery")}
                      style={{
                        backgroundColor: COLORS.primary,
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{
                        color: "#FFF",
                        fontWeight: "600",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                      }}>
                        Go to Discovery
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* All Matches Header */}
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: COLORS.text,
                  fontFamily: "Inter_700Bold",
                  marginBottom: 12,
                }}
              >
                All Matches
              </Text>
            </>
          )}
          ListEmptyComponent={() => (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, paddingTop: 60 }}>
              <Text style={{ 
                color: COLORS.text, 
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
                marginBottom: 12,
                textAlign: "center"
              }}>
                No matches yet
              </Text>
              <Text style={{ 
                color: COLORS.gray600, 
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 20
              }}>
                Visit the Discovery page to start swiping and find people you'd like to connect with!
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/discovery")}
                style={{
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 25,
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
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
                  Go to Discovery
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
                <AuthenticatedImage
                  source={{ uri: item.user.photo }}
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

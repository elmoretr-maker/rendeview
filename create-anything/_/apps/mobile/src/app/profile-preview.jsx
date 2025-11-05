import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getAbsoluteUrl } from "@/utils/api/apiFetch";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  text: "#2C3E50",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
  error: "#EF4444",
};

const TIER_DISPLAY_NAMES = {
  free: "Free",
  casual: "Casual",
  dating: "Dating",
  business: "Business",
};

export default function ProfilePreview() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [media, setMedia] = useState([]);
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const photos = media.filter((m) => m.type === "photo");
  const video = media.find((m) => m.type === "video");
  const interests = Array.isArray(user?.interests) ? user.interests : [];

  const videoPlayer = useVideoPlayer(video?.url || null, player => {
    if (player && video) {
      player.loop = true;
      player.play();
    }
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setUser(data?.user || null);
            setMedia(data?.media || []);
          }
        } else {
          if (mounted) setError("Failed to load profile");
        }
      } catch (e) {
        console.error("[PROFILE PREVIEW] Error:", e);
        if (mounted) setError("Could not load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: COLORS.lightGray }}>
        <View style={{ padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.primary, marginLeft: 8, fontFamily: "Inter_600SemiBold" }}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: COLORS.lightGray }}>
        <View style={{ padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.primary, marginLeft: 8, fontFamily: "Inter_600SemiBold" }}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <Text style={{ color: COLORS.error, textAlign: "center", fontFamily: "Inter_400Regular" }}>{error}</Text>
        </View>
      </View>
    );
  }

  const tierDisplay = TIER_DISPLAY_NAMES[user?.membership_tier] || "Free";

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: COLORS.lightGray }}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.primary, marginLeft: 8, fontFamily: "Inter_600SemiBold" }}>
            Back to Edit Profile
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Preview Header */}
          <View style={{ backgroundColor: "#EDE9FE", padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.primary, fontFamily: "Inter_700Bold" }}>
              Profile Preview
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 4, fontFamily: "Inter_400Regular" }}>
              This is how other users see your profile
            </Text>
          </View>

          {/* Profile Card */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            {/* Profile Header */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, overflow: "hidden", backgroundColor: COLORS.lightGray, marginRight: 12 }}>
                {user?.primary_photo_url ? (
                  <Image
                    source={{ uri: getAbsoluteUrl(user.primary_photo_url) }}
                    style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                  />
                ) : (
                  <View style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontSize: 32, color: COLORS.text, fontFamily: "Inter_400Regular" }}>
                      {user?.name?.[0]?.toUpperCase() || "?"}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 22, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}>
                    {user?.name || "No name"}
                  </Text>
                  {user?.immediate_available && !user?.availability_override && (
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.secondary, marginLeft: 8 }} />
                  )}
                </View>
                <View style={{ backgroundColor: "#EDE9FE", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: "flex-start", marginTop: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.primary, fontFamily: "Inter_600SemiBold" }}>
                    {tierDisplay}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bio */}
            {user?.bio && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 8, fontFamily: "Inter_600SemiBold" }}>
                  About
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.text, lineHeight: 20, fontFamily: "Inter_400Regular" }}>
                  {user.bio}
                </Text>
              </View>
            )}

            {/* Video */}
            {video && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Ionicons name="videocam" size={20} color={COLORS.primary} />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text, marginLeft: 8, fontFamily: "Inter_600SemiBold" }}>
                    Video Introduction
                  </Text>
                </View>
                <VideoView
                  player={videoPlayer}
                  style={{ width: "100%", height: 200, borderRadius: 12 }}
                  contentFit="cover"
                />
              </View>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 8, fontFamily: "Inter_600SemiBold" }}>
                  Photos ({photos.length})
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {photos.map((photo, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: getAbsoluteUrl(photo.url) }}
                      style={{ width: "31%", aspectRatio: 1, borderRadius: 8 }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 8, fontFamily: "Inter_600SemiBold" }}>
                  Interests
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {interests.map((interest, idx) => (
                    <View key={idx} style={{ backgroundColor: "#EDE9FE", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                      <Text style={{ fontSize: 12, color: COLORS.primary, fontFamily: "Inter_400Regular" }}>
                        {interest}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Personal Details */}
            {(user?.gender || user?.sexual_orientation || user?.looking_for || user?.relationship_goals || user?.height_range || user?.body_type || user?.education) && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 12, fontFamily: "Inter_600SemiBold" }}>
                  Personal Details
                </Text>
                <View style={{ gap: 12 }}>
                  {user?.gender && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Gender</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.gender}</Text>
                    </View>
                  )}
                  {user?.sexual_orientation && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Orientation</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.sexual_orientation}</Text>
                    </View>
                  )}
                  {user?.looking_for && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Looking For</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.looking_for}</Text>
                    </View>
                  )}
                  {user?.relationship_goals && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Relationship Goals</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.relationship_goals}</Text>
                    </View>
                  )}
                  {user?.height_range && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Height</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.height_range}</Text>
                    </View>
                  )}
                  {user?.body_type && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Body Type</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.body_type}</Text>
                    </View>
                  )}
                  {user?.education && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Education</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.education}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Lifestyle */}
            {(user?.drinking || user?.smoking || user?.exercise || user?.religion || user?.children_preference || user?.pets) && (
              <View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 12, fontFamily: "Inter_600SemiBold" }}>
                  Lifestyle
                </Text>
                <View style={{ gap: 12 }}>
                  {user?.drinking && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Drinking</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.drinking}</Text>
                    </View>
                  )}
                  {user?.smoking && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Smoking</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.smoking}</Text>
                    </View>
                  )}
                  {user?.exercise && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Exercise</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.exercise}</Text>
                    </View>
                  )}
                  {user?.religion && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Religion</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.religion}</Text>
                    </View>
                  )}
                  {user?.children_preference && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Children</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.children_preference}</Text>
                    </View>
                  )}
                  {user?.pets && (
                    <View>
                      <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" }}>Pets</Text>
                      <Text style={{ fontSize: 14, color: COLORS.text, marginTop: 2, fontFamily: "Inter_400Regular" }}>{user.pets}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

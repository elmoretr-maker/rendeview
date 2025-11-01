import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/utils/auth/useAuth";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
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

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signOut, signIn, isReady } = useAuth();
  const router = useRouter();
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [days, setDays] = useState("Mon,Tue,Wed,Thu,Fri");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("21:00");
  const [immediate, setImmediate] = useState(false);
  const [override, setOverride] = useState(false);

  // NEW: media and primary photo state
  const [media, setMedia] = useState([]);
  const [primaryPhoto, setPrimaryPhoto] = useState(null);

  // Profile information from onboarding
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [gender, setGender] = useState("");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [heightRange, setHeightRange] = useState("");
  const [education, setEducation] = useState("");
  const [relationshipGoals, setRelationshipGoals] = useState("");
  const [drinking, setDrinking] = useState("");
  const [smoking, setSmoking] = useState("");
  const [exercise, setExercise] = useState("");
  const [religion, setReligion] = useState("");
  const [childrenPreference, setChildrenPreference] = useState("");
  const [pets, setPets] = useState("");

  // NEW: video player
  const [videoUrl, setVideoUrl] = useState(null);
  const videoRef = useRef(null);
  const player = useVideoPlayer(videoUrl || undefined, (p) => {
    if (!videoUrl) return;
    p.loop = true;
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.status === 401) {
          setError("AUTH_401");
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        const u = data.user || {};
        setName(u.name || "");
        setImmediate(!!u.immediate_available);
        setOverride(!!u.availability_override);
        setPrimaryPhoto(u.primary_photo_url || null);
        if (u.typical_availability?.timezone) {
          setTimezone(u.typical_availability.timezone);
        }
        const typical = u.typical_availability?.typical?.[0];
        if (typical) {
          setDays((typical.days || []).join(","));
          setStart(typical.start || start);
          setEnd(typical.end || end);
        }
        // load media
        const m = Array.isArray(data.media) ? data.media : [];
        setMedia(m);
        const vid = m.find((x) => x.type === "video");
        setVideoUrl(vid?.url || null);
        
        // Load profile information
        setBio(u.bio || "");
        setInterests(Array.isArray(u.interests) ? u.interests : []);
        setGender(u.gender || "");
        setSexualOrientation(u.sexual_orientation || "");
        setLookingFor(u.looking_for || "");
        setBodyType(u.body_type || "");
        setHeightRange(u.height_range || "");
        setEducation(u.education || "");
        setRelationshipGoals(u.relationship_goals || "");
        setDrinking(u.drinking || "");
        setSmoking(u.smoking || "");
        setExercise(u.exercise || "");
        setReligion(u.religion || "");
        setChildrenPreference(u.children_preference || "");
        setPets(u.pets || "");
      } catch (e) {
        console.error(e);
        setError("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const save = useCallback(async () => {
    try {
      setError(null);
      const typical = [
        {
          days: days
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
          start,
          end,
        },
      ];
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          typical,
          immediate_available: immediate,
          availability_override: override,
        }),
      });
      if (res.status === 401) {
        setError("AUTH_401");
        return;
      }
      if (!res.ok) throw new Error("Failed to save");
      Alert.alert("Saved", "Profile updated");
    } catch (e) {
      console.error(e);
      setError("Could not save");
    }
  }, [name, timezone, days, start, end, immediate, override]);

  const deleteAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.status === 401) {
        setError("AUTH_401");
        return;
      }
      if (!res.ok) throw new Error("Failed to delete account");
      Alert.alert("Account deleted", "You will be signed out.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not delete account");
    }
  }, []);

  const handleSignOut = useCallback(() => {
    try {
      signOut();
      router.replace("/");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not sign out");
    }
  }, [router, signOut]);

  // NEW: select primary photo
  const selectPrimary = useCallback(async (url) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_photo_url: url }),
      });
      if (res.status === 401) {
        setError("AUTH_401");
        return;
      }
      if (!res.ok) throw new Error("Failed to set primary");
      setPrimaryPhoto(url);
      Alert.alert("Updated", "Primary photo set");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not set primary photo");
    }
  }, []);

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
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (loading)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.bg,
        }}
      >
        <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}>
          Loading...
        </Text>
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
        Profile
      </Text>

      {error === "AUTH_401" ? (
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
      ) : null}

      {/* Video preview */}
      {videoUrl ? (
        <View
          style={{
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#000",
            marginBottom: 12,
          }}
        >
          <VideoView
            ref={videoRef}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
            style={{ width: "100%", height: 220 }}
          />
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingVertical: 8,
              justifyContent: "center",
              backgroundColor: "#0B0B0B",
            }}
          >
            <TouchableOpacity
              onPress={() => (player.playing ? player.pause() : player.play())}
              style={{
                backgroundColor: "#FFFFFF20",
                paddingHorizontal: 12,
                paddingVertical: 6,
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
                {player.playing ? "Pause" : "Play"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/onboarding/profile")}
              style={{
                backgroundColor: COLORS.primary,
                paddingHorizontal: 12,
                paddingVertical: 6,
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
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => router.push("/onboarding/profile")}
          style={{
            backgroundColor: COLORS.lightGray,
            paddingVertical: 12,
            borderRadius: 12,
            marginBottom: 12,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: COLORS.primary,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: COLORS.primary,
              fontWeight: "600",
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Add Profile Video
          </Text>
        </TouchableOpacity>
      )}

      {/* Photos grid with primary selection */}
      <Text
        style={{
          fontWeight: "700",
          marginBottom: 8,
          color: COLORS.text,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        Your Photos
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {media
          .filter((m) => m.type === "photo")
          .map((m, idx) => {
            const isPrimary = m.url === primaryPhoto;
            return (
              <TouchableOpacity key={idx} onPress={() => selectPrimary(m.url)}>
                <Image
                  source={{ uri: m.url }}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isPrimary ? COLORS.primary : "#E5E7EB",
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    textAlign: "center",
                    color: isPrimary ? COLORS.primary : "#6B7280",
                    marginTop: 4,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {isPrimary ? "Primary" : "Set Primary"}
                </Text>
              </TouchableOpacity>
            );
          })}
      </View>

      <Text
        style={{
          fontWeight: "600",
          marginBottom: 6,
          color: COLORS.text,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        Name
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        style={{
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          backgroundColor: "#FFFFFF",
        }}
      />

      <Text
        style={{
          fontWeight: "600",
          marginBottom: 6,
          color: COLORS.text,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        Timezone
      </Text>
      <TextInput
        value={timezone}
        onChangeText={setTimezone}
        placeholder="America/New_York"
        style={{
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          backgroundColor: "#FFFFFF",
        }}
      />

      {/* Bio Section */}
      {bio ? (
        <>
          <Text
            style={{
              fontWeight: "600",
              marginBottom: 6,
              color: COLORS.text,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Bio
          </Text>
          <Text
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              backgroundColor: "#FFFFFF",
              color: COLORS.text,
              fontFamily: "Inter_400Regular",
            }}
          >
            {bio}
          </Text>
        </>
      ) : null}

      {/* Interests Section */}
      {interests.length > 0 ? (
        <>
          <Text
            style={{
              fontWeight: "600",
              marginBottom: 8,
              color: COLORS.text,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Interests ({interests.length})
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {interests.map((interest, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {interest}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Preferences Section */}
      <Text
        style={{
          fontWeight: "700",
          fontSize: 18,
          marginBottom: 12,
          marginTop: 8,
          color: COLORS.text,
          fontFamily: "Inter_700Bold",
        }}
      >
        About Me
      </Text>

      {gender ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Gender
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {gender}
          </Text>
        </View>
      ) : null}

      {sexualOrientation ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Sexual Orientation
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {sexualOrientation}
          </Text>
        </View>
      ) : null}

      {lookingFor ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Looking For
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {lookingFor}
          </Text>
        </View>
      ) : null}

      {relationshipGoals ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Relationship Goals
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {relationshipGoals}
          </Text>
        </View>
      ) : null}

      {bodyType ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Body Type
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {bodyType}
          </Text>
        </View>
      ) : null}

      {heightRange ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Height
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {heightRange}
          </Text>
        </View>
      ) : null}

      {education ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Education
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {education}
          </Text>
        </View>
      ) : null}

      {drinking ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Drinking
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {drinking}
          </Text>
        </View>
      ) : null}

      {smoking ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Smoking
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {smoking}
          </Text>
        </View>
      ) : null}

      {exercise ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Exercise
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {exercise}
          </Text>
        </View>
      ) : null}

      {religion ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Religion
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {religion}
          </Text>
        </View>
      ) : null}

      {childrenPreference ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Children
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {childrenPreference}
          </Text>
        </View>
      ) : null}

      {pets ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, fontFamily: "Inter_400Regular" }}>
            Pets
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_600SemiBold" }}>
            {pets}
          </Text>
        </View>
      ) : null}

      <Text
        style={{
          fontWeight: "700",
          fontSize: 18,
          marginBottom: 12,
          marginTop: 16,
          color: COLORS.text,
          fontFamily: "Inter_700Bold",
        }}
      >
        Availability Settings
      </Text>

      <Text
        style={{
          fontWeight: "600",
          marginBottom: 6,
          color: COLORS.text,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        Typical Availability
      </Text>
      <TextInput
        value={days}
        onChangeText={setDays}
        placeholder="Mon,Tue,Wed,Thu,Fri"
        style={{
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 10,
          padding: 12,
          marginBottom: 8,
          backgroundColor: "#FFFFFF",
        }}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={start}
          onChangeText={setStart}
          placeholder="18:00"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            backgroundColor: "#FFFFFF",
          }}
        />
        <TextInput
          value={end}
          onChangeText={setEnd}
          placeholder="21:00"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            backgroundColor: "#FFFFFF",
          }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}>
          Immediate Availability
        </Text>
        <Switch value={immediate} onValueChange={setImmediate} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Text style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}>
          Appear Offline (Override)
        </Text>
        <Switch value={override} onValueChange={setOverride} />
      </View>

      {error && error !== "AUTH_401" && (
        <Text
          style={{
            color: COLORS.error,
            marginBottom: 8,
            fontFamily: "Inter_400Regular",
          }}
        >
          {error}
        </Text>
      )}

      <TouchableOpacity
        onPress={save}
        style={{
          backgroundColor: COLORS.primary,
          paddingVertical: 12,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "600",
            textAlign: "center",
            fontFamily: "Inter_600SemiBold",
          }}
        >
          Save
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={deleteAccount}
        style={{
          backgroundColor: COLORS.cardBg,
          paddingVertical: 12,
          borderRadius: 10,
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: COLORS.text,
            fontWeight: "600",
            textAlign: "center",
            fontFamily: "Inter_600SemiBold",
          }}
        >
          Delete Account
        </Text>
      </TouchableOpacity>

      {/* Sign out button - convenient location on Profile */}
      <TouchableOpacity
        onPress={handleSignOut}
        accessibilityLabel="Sign Out"
        style={{
          backgroundColor: "#FEE2E2",
          paddingVertical: 12,
          borderRadius: 10,
          marginTop: 12,
          borderWidth: 1,
          borderColor: "#FCA5A5",
        }}
      >
        <Text
          style={{
            color: "#B91C1C",
            fontWeight: "700",
            textAlign: "center",
            fontFamily: "Inter_600SemiBold",
          }}
        >
          Sign Out
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/settings/subscription")}
        style={{
          backgroundColor: COLORS.primary,
          paddingVertical: 12,
          borderRadius: 10,
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "700",
            textAlign: "center",
            fontFamily: "Inter_600SemiBold",
          }}
        >
          Manage Membership
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {}}
        style={{ paddingVertical: 12, borderRadius: 10, marginTop: 12 }}
      >
        <Text
          style={{
            color: COLORS.primary,
            fontWeight: "600",
            textAlign: "center",
            fontFamily: "Inter_600SemiBold",
          }}
        >
          Manage Blocked Users
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

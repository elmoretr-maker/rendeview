import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as RNImagePicker from "expo-image-picker";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { VideoView, useVideoPlayer } from "expo-video";
import useUpload from "@/utils/useUpload";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  text: "#2C3E50",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
  error: "#EF4444",
};

function limitsForTier(tier) {
  const t = (tier || "free").toLowerCase();
  switch (t) {
    case "business":
      return { maxPhotos: 10, maxVideoSec: 60, maxVideos: 3 };
    case "dating":
      return { maxPhotos: 8, maxVideoSec: 60, maxVideos: 2 };
    case "casual":
      return { maxPhotos: 5, maxVideoSec: 30, maxVideos: 1 };
    case "free":
    default:
      return { maxPhotos: 3, maxVideoSec: 15, maxVideos: 1 };
  }
}

function ConsolidatedProfileOnboardingContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Profile fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [newInterest, setNewInterest] = useState("");
  
  // Media state
  const [photos, setPhotos] = useState([]);
  const [videoAsset, setVideoAsset] = useState(null);
  const [videoAccepted, setVideoAccepted] = useState(false);
  const [tier, setTier] = useState("free");
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [upload, { loading }] = useUpload();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const totalSteps = 4;
  const stepIndex = 4;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;
  const limits = limitsForTier(tier);

  const videoPlayer = useVideoPlayer(videoAsset?.uri || null, player => {
    if (player && videoAsset) {
      player.loop = true;
      player.play();
    }
  });

  // Pause and disable loop when video is accepted
  useEffect(() => {
    if (videoPlayer && videoAccepted) {
      videoPlayer.loop = false;
      videoPlayer.pause();
    }
  }, [videoPlayer, videoAccepted]);

  // Load existing profile data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const user = data?.user;
          if (mounted) {
            setTier(user?.membership_tier || "free");
            if (user?.name) setName(user.name);
            if (user?.bio) setBio(user.bio);
            if (user?.interests && Array.isArray(user.interests)) {
              setInterests(user.interests);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    })();
    return () => (mounted = false);
  }, []);

  const pickImage = useCallback(async () => {
    if (photos.length >= limits.maxPhotos) {
      Alert.alert(
        "Photo Limit",
        `You can only upload ${limits.maxPhotos} photos. Upgrade for more!`
      );
      return;
    }
    const result = await RNImagePicker.launchImageLibraryAsync({
      mediaTypes: RNImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      allowsMultipleSelection: false,
      base64: true, // Enable base64 for upload compatibility
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0]].slice(0, limits.maxPhotos));
    }
  }, [photos.length, limits.maxPhotos]);

  const removePhotoAt = useCallback((index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const ensureVideoPermissions = useCallback(async () => {
    if (!permission?.granted) {
      const cam = await requestPermission();
      if (!cam?.granted) {
        Alert.alert("Camera", "Camera permission is required to record.");
        return false;
      }
    }
    if (!micPermission?.granted) {
      const mic = await requestMicPermission();
      if (!mic?.granted) {
        Alert.alert(
          "Microphone",
          "Microphone permission is required to record video with sound."
        );
        return false;
      }
    }
    return true;
  }, [
    permission?.granted,
    micPermission?.granted,
    requestPermission,
    requestMicPermission,
  ]);

  const toggleRecord = useCallback(async () => {
    const ok = await ensureVideoPermissions();
    if (!ok) return;
    if (!cameraRef.current) return;

    if (recording) {
      try {
        await cameraRef.current.stopRecording();
      } catch (e) {
        console.error(e);
      }
      setRecording(false);
      return;
    }

    try {
      setRecording(true);
      setVideoAccepted(false);
      const cam = cameraRef.current;
      if (typeof cam.recordAsync === "function") {
        const rec = await cam.recordAsync({ maxDuration: limits.maxVideoSec });
        setVideoAsset(rec);
      } else if (typeof cam.startRecording === "function") {
        const rec = await new Promise((resolve, reject) => {
          let timeout;
          try {
            cam.startRecording({
              maxDuration: limits.maxVideoSec,
              onRecordingFinished: (video) => {
                clearTimeout(timeout);
                resolve(video);
              },
              onRecordingError: (err) => {
                clearTimeout(timeout);
                reject(err);
              },
            });
            timeout = setTimeout(
              () => {
                try {
                  cam.stopRecording();
                } catch {}
              },
              (limits.maxVideoSec + 1) * 1000
            );
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        });
        setVideoAsset(rec);
      } else {
        throw new Error("This device/SDK does not support video recording API");
      }
    } catch (e) {
      console.error(e);
      const maybePerm = !micPermission?.granted || !permission?.granted;
      Alert.alert(
        "Record",
        maybePerm
          ? "Failed to record — please allow Camera and Microphone in Settings and try again."
          : "Failed to record. Please try again."
      );
    } finally {
      setRecording(false);
    }
  }, [
    ensureVideoPermissions,
    limits.maxVideoSec,
    recording,
    micPermission?.granted,
    permission?.granted,
  ]);

  const acceptVideo = useCallback(() => {
    if (!videoAsset) return;
    setVideoAccepted(true);
  }, [videoAsset]);

  const redoVideo = useCallback(() => {
    setVideoAsset(null);
    setVideoAccepted(false);
  }, []);

  const addInterest = useCallback(() => {
    const trimmed = newInterest.trim();
    if (!trimmed) return;
    if (interests.length >= 10) {
      Alert.alert("Limit Reached", "You can add up to 10 interests/hobbies");
      return;
    }
    if (interests.includes(trimmed)) {
      Alert.alert("Duplicate", "You've already added this interest");
      return;
    }
    setInterests((prev) => [...prev, trimmed]);
    setNewInterest("");
  }, [newInterest, interests]);

  const removeInterest = useCallback((interest) => {
    setInterests((prev) => prev.filter((i) => i !== interest));
  }, []);

  const onSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your display name");
      return;
    }
    if (photos.length < 2) {
      Alert.alert(
        "Photos Required",
        `Please add at least 2 photos (max ${limits.maxPhotos}).`
      );
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      let media = [];
      const total = photos.length + (videoAsset && videoAccepted ? 1 : 0);
      setProgress({ done: 0, total });

      // Upload photos
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const { url, error: upErr } = await upload({ reactNativeAsset: photo });
        if (upErr) throw new Error(upErr);
        media.push({ type: "photo", url, sort_order: i });
        setProgress({ done: i + 1, total });
        // Small delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Upload video if accepted
      if (videoAsset && videoAccepted) {
        const { url: vurl, error: vErr } = await upload({
          reactNativeAsset: { uri: videoAsset.uri, mimeType: "video/mp4" },
        });
        if (vErr) throw new Error(vErr);
        media.push({ type: "video", url: vurl, sort_order: media.length });
        setProgress({ done: total, total });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Save profile data with media
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || null,
          interests: interests.length > 0 ? interests : null,
          media,
        }),
      });
      
      if (!res.ok) {
        throw new Error(
          `When saving profile, the response was [${res.status}] ${res.statusText}`
        );
      }
      
      router.replace("/(tabs)");
    } catch (e) {
      console.error(e);
      setError("Could not save profile");
      Alert.alert("Error", e.message || "Could not save profile");
      // Reset progress on error
      setProgress({ done: 0, total: 0 });
    } finally {
      setSaving(false);
    }
  }, [name, bio, interests, photos, videoAsset, videoAccepted, upload, router, limits.maxPhotos]);

  const resetAll = useCallback(() => {
    Alert.alert(
      "Start Over?",
      "This will clear all your photos, video, and information. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            setPhotos([]);
            setVideoAsset(null);
            setVideoAccepted(false);
            setName("");
            setBio("");
            setInterests([]);
            setNewInterest("");
            setProgress({ done: 0, total: 0 });
            setError(null);
          },
        },
      ]
    );
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.white }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Progress bar */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 999 }}
          >
            <View
              style={{
                height: 6,
                width: progressPct,
                backgroundColor: COLORS.primary,
                borderRadius: 999,
              }}
            />
          </View>
          <Text style={{ marginTop: 6, color: COLORS.text, opacity: 0.7 }}>
            Step {stepIndex} of {totalSteps}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 8,
            color: COLORS.text,
          }}
        >
          Complete Your Profile
        </Text>
        <Text style={{ color: COLORS.text, opacity: 0.7, marginBottom: 24 }}>
          Tell us about yourself and add photos (minimum 2 photos required)
        </Text>

        {/* Name field */}
        <Text style={{ fontWeight: "600", marginBottom: 8, color: COLORS.text }}>
          Display Name *
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: "#EAEAEA",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            fontSize: 16,
          }}
          placeholder="Your name"
          value={name}
          onChangeText={setName}
        />

        {/* Bio field */}
        <Text style={{ fontWeight: "600", marginBottom: 8, color: COLORS.text }}>
          Bio (Optional)
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: "#EAEAEA",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            fontSize: 16,
            minHeight: 80,
            textAlignVertical: "top",
          }}
          placeholder="Tell us about yourself..."
          value={bio}
          onChangeText={(text) => text.length <= 500 && setBio(text)}
          multiline
          numberOfLines={4}
        />
        <Text style={{ fontSize: 12, color: COLORS.text, opacity: 0.6, marginBottom: 16 }}>
          {bio.length}/500 characters
        </Text>

        {/* Interests field */}
        <Text style={{ fontWeight: "600", marginBottom: 8, color: COLORS.text }}>
          Interests & Hobbies (Optional)
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#EAEAEA",
              borderRadius: 10,
              padding: 12,
              fontSize: 16,
              marginRight: 8,
            }}
            placeholder="Add an interest..."
            value={newInterest}
            onChangeText={setNewInterest}
            onSubmitEditing={addInterest}
          />
          <TouchableOpacity
            onPress={addInterest}
            disabled={!newInterest.trim() || interests.length >= 10}
            style={{
              backgroundColor: COLORS.primary,
              paddingHorizontal: 16,
              borderRadius: 10,
              justifyContent: "center",
              opacity: !newInterest.trim() || interests.length >= 10 ? 0.5 : 1,
            }}
          >
            <Text style={{ color: COLORS.white, fontWeight: "600" }}>Add</Text>
          </TouchableOpacity>
        </View>
        {interests.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
            {interests.map((interest, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: COLORS.lightGray,
                  borderRadius: 20,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: COLORS.text, marginRight: 6 }}>{interest}</Text>
                <TouchableOpacity onPress={() => removeInterest(interest)}>
                  <Ionicons name="close-circle" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <Text style={{ fontSize: 12, color: COLORS.text, opacity: 0.6, marginBottom: 24 }}>
          {interests.length}/10 interests
        </Text>

        {/* Photos section */}
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12, color: COLORS.text }}>
          Photos ({photos.length}/{limits.maxPhotos}) *
        </Text>
        {photos.length === 0 ? (
          <View
            style={{
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: "#E5E7EB",
              borderRadius: 12,
              padding: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FAFAFA",
              marginBottom: 12,
            }}
          >
            <Ionicons name="images-outline" size={48} color={COLORS.text} opacity={0.3} />
            <Text style={{ color: COLORS.text, opacity: 0.7, marginTop: 8 }}>
              Add at least 2 photos
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            {photos.map((photo, idx) => (
              <View key={idx} style={{ position: "relative" }}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 12,
                    backgroundColor: COLORS.lightGray,
                  }}
                />
                <TouchableOpacity
                  onPress={() => removePhotoAt(idx)}
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    backgroundColor: COLORS.error,
                    borderRadius: 999,
                    padding: 4,
                  }}
                >
                  <Ionicons name="close" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          onPress={pickImage}
          disabled={photos.length >= limits.maxPhotos}
          style={{
            backgroundColor: photos.length >= limits.maxPhotos ? COLORS.lightGray : COLORS.primary,
            paddingVertical: 12,
            borderRadius: 12,
            marginBottom: 24,
            opacity: photos.length >= limits.maxPhotos ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: photos.length >= limits.maxPhotos ? COLORS.text : COLORS.white,
              fontWeight: "600",
            }}
          >
            {photos.length >= limits.maxPhotos ? "Photo Limit Reached" : "Add Photo"}
          </Text>
        </TouchableOpacity>

        {/* Video section */}
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12, color: COLORS.text }}>
          Video Introduction (Optional)
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.text, opacity: 0.6, marginBottom: 12 }}>
          Camera-only recording prevents catfishing • Max {Math.floor(limits.maxVideoSec / 60)}:
          {String(limits.maxVideoSec % 60).padStart(2, "0")}
        </Text>
        <View
          style={{
            height: 220,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#000",
            marginBottom: 12,
          }}
        >
          {!videoAsset ? (
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="front"
              mode="video"
            />
          ) : (
            <VideoView
              style={{ flex: 1 }}
              player={videoPlayer}
              contentFit="cover"
            />
          )}
        </View>

        {/* Video controls */}
        {!videoAsset ? (
          <TouchableOpacity
            onPress={toggleRecord}
            style={{
              backgroundColor: recording ? "#DC2626" : COLORS.secondary,
              paddingVertical: 12,
              borderRadius: 12,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: COLORS.white,
                fontWeight: "700",
              }}
            >
              {recording
                ? "Stop Recording"
                : `Record Video (max ${Math.round(limits.maxVideoSec)}s)`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
            {!videoAccepted ? (
              <>
                <TouchableOpacity
                  onPress={acceptVideo}
                  style={{
                    backgroundColor: COLORS.secondary,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: COLORS.white,
                      fontWeight: "700",
                    }}
                  >
                    Accept Video
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={redoVideo}
                  style={{
                    backgroundColor: "#FEE2E2",
                    paddingVertical: 12,
                    borderRadius: 12,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#991B1B",
                      fontWeight: "700",
                    }}
                  >
                    Redo
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View
                  style={{
                    backgroundColor: "#DCFCE7",
                    borderRadius: 12,
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#065F46",
                      fontWeight: "700",
                      paddingVertical: 12,
                    }}
                  >
                    ✓ Video accepted
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={redoVideo}
                  style={{
                    backgroundColor: COLORS.lightGray,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: COLORS.primary,
                      fontWeight: "700",
                    }}
                  >
                    Change Video
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Upload progress */}
        {progress.total > 0 && (
          <View style={{ backgroundColor: "#EDE9FE", padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ color: "#5B3BAF", fontSize: 14, textAlign: "center", fontWeight: "600" }}>
              {progress.done < progress.total 
                ? `📤 Uploading ${progress.done}/${progress.total}...`
                : `✓ All ${progress.total} item${progress.total > 1 ? 's' : ''} uploaded!`
              }
            </Text>
            {progress.done < progress.total && (
              <View style={{ marginTop: 8, height: 4, backgroundColor: "#fff", borderRadius: 999, overflow: "hidden" }}>
                <View style={{ 
                  height: 4, 
                  width: `${(progress.done / progress.total) * 100}%`, 
                  backgroundColor: "#5B3BAF" 
                }} />
              </View>
            )}
          </View>
        )}

        {/* Photo requirement reminder */}
        {photos.length < 2 && (
          <View style={{ backgroundColor: "#FEF3C7", padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ color: "#92400E", fontSize: 14, textAlign: "center" }}>
              📸 Please add at least 2 photos to continue ({photos.length}/2)
            </Text>
          </View>
        )}

        {/* Complete button */}
        <TouchableOpacity
          onPress={onSave}
          disabled={saving || loading || !name.trim() || photos.length < 2}
          style={{
            backgroundColor: COLORS.primary,
            paddingVertical: 14,
            borderRadius: 12,
            marginBottom: 12,
            opacity: saving || loading || !name.trim() || photos.length < 2 ? 0.6 : 1,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: COLORS.white,
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            {saving || loading ? "Saving..." : "Complete Setup"}
          </Text>
        </TouchableOpacity>

        {/* Reset button */}
        <TouchableOpacity
          onPress={resetAll}
          disabled={saving}
          style={{ 
            paddingVertical: 14, 
            borderRadius: 12, 
            marginBottom: 12,
            opacity: saving ? 0.6 : 1 
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: "#E74C3C",
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            🔄 Start Over
          </Text>
        </TouchableOpacity>

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.replace("/onboarding/membership")}
          style={{ paddingVertical: 14, borderRadius: 12 }}
        >
          <Text
            style={{
              textAlign: "center",
              color: COLORS.text,
              opacity: 0.7,
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            Back to Membership
          </Text>
        </TouchableOpacity>

        {error && <Text style={{ color: COLORS.error, marginTop: 8, textAlign: "center" }}>{error}</Text>}
        
        <Text style={{ fontSize: 12, textAlign: "center", color: COLORS.text, opacity: 0.6, marginTop: 16 }}>
          * Required fields
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function ConsolidatedProfileOnboarding() {
  return (
    <OnboardingGuard>
      <ConsolidatedProfileOnboardingContent />
    </OnboardingGuard>
  );
}

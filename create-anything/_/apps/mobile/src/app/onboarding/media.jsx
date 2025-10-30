import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import * as RNImagePicker from "expo-image-picker";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { Video } from "expo-video";
import useUpload from "@/utils/useUpload";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Brand palette
const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
};

function limitsForTier(tier) {
  const t = (tier || "free").toLowerCase();
  switch (t) {
    case "business":
      return { maxPhotos: 20, maxVideoSec: 5 * 60 };
    case "dating":
      return { maxPhotos: 10, maxVideoSec: 60 };
    case "casual":
      return { maxPhotos: 6, maxVideoSec: 30 };
    case "free":
    default:
      return { maxPhotos: 2, maxVideoSec: 15 };
  }
}

export default function MediaOnboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [videoAsset, setVideoAsset] = useState(null);
  const [videoAccepted, setVideoAccepted] = useState(false);
  const [tier, setTier] = useState("free");
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [upload, { loading }] = useUpload();
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // ADD: simple progress
  const totalSteps = 5;
  // this screen covers both photos+video when used
  const stepIndex = 3;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const limits = limitsForTier(tier);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (mounted) setTier(data?.user?.membership_tier || "free");
        }
      } catch {}
    })();
    return () => (mounted = false);
  }, []);

  const pickImage = useCallback(async () => {
    const result = await RNImagePicker.launchImageLibraryAsync({
      mediaTypes: RNImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) {
      setAssets((prev) =>
        [...prev, result.assets[0]].slice(0, limits.maxPhotos),
      );
    }
  }, [limits.maxPhotos]);

  const removeImageAt = useCallback((index) => {
    setAssets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllPhotos = useCallback(() => {
    setAssets([]);
  }, []);

  const ensureVideoPermissions = useCallback(async () => {
    // Request camera if missing
    if (!permission?.granted) {
      const cam = await requestPermission();
      if (!cam?.granted) {
        Alert.alert("Camera", "Camera permission is required to record.");
        return false;
      }
    }
    // Request microphone if missing
    if (!micPermission?.granted) {
      const mic = await requestMicPermission();
      if (!mic?.granted) {
        Alert.alert(
          "Microphone",
          "Microphone permission is required to record video with sound.",
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
      setVideoAccepted(false); // reset accept state when starting a new recording
      // Some SDKs require startRecording/stopRecording; recordAsync is supported in others.
      // Try recordAsync first; if not available, fall back to startRecording.
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
            // Safety timeout equal to maxDuration + small buffer
            timeout = setTimeout(
              () => {
                try {
                  cam.stopRecording();
                } catch {}
              },
              (limits.maxVideoSec + 1) * 1000,
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
          : "Failed to record. Please try again.",
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

  const onSave = useCallback(async () => {
    if (assets.length === 0) {
      Alert.alert(
        "Add photos",
        `Please add at least 1 photo (max ${limits.maxPhotos}).`,
      );
      return;
    }
    if (!videoAsset) {
      Alert.alert(
        "Record video",
        `Please record a video (max ${Math.round(limits.maxVideoSec)}s).`,
      );
      return;
    }
    if (!videoAccepted) {
      Alert.alert("Confirm video", "Please accept your video or redo it.");
      return;
    }
    try {
      setError(null);
      let media = [];
      const total = assets.length + 1; // photos + 1 video
      setProgress({ done: 0, total });

      for (let i = 0; i < assets.length; i++) {
        const a = assets[i];
        const { url, error: upErr } = await upload({ reactNativeAsset: a });
        if (upErr) throw new Error(upErr);
        media.push({ type: "photo", url, sort_order: i });
        setProgress({ done: i + 1, total });
      }
      // Upload recorded video
      const { url: vurl, error: vErr } = await upload({
        reactNativeAsset: { uri: videoAsset.uri, mimeType: "video/mp4" },
      });
      if (vErr) throw new Error(vErr);
      media.push({ type: "video", url: vurl, sort_order: media.length });
      setProgress({ done: total, total });

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media }),
      });
      if (!res.ok) {
        throw new Error(
          `When saving media, the response was [${res.status}] ${res.statusText}`,
        );
      }
      router.push("/onboarding/consent");
    } catch (e) {
      console.error(e);
      setError("Could not save media");
      Alert.alert("Error", e.message || "Could not save media");
    }
  }, [
    assets,
    videoAsset,
    videoAccepted,
    upload,
    router,
    limits.maxPhotos,
    limits.maxVideoSec,
  ]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.white,
        paddingTop: insets.top,
        paddingHorizontal: 24,
      }}
    >
      {/* ADD: Progress bar */}
      <View style={{ marginTop: 8 }}>
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
          marginTop: 16,
          color: COLORS.text,
        }}
      >
        Add your photos and intro video
      </Text>
      <Text style={{ color: COLORS.text, opacity: 0.7, marginTop: 8 }}>
        Tier: {tier?.toUpperCase()} • Photos up to {limits.maxPhotos} • Video up
        to {Math.round(limits.maxVideoSec)}s
      </Text>

      <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
        {/* ADD: empty state */}
        {assets.length === 0 ? (
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
            <Text style={{ color: COLORS.text, opacity: 0.7 }}>
              No photos yet — add a few below.
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {assets.map((a, idx) => (
            <View key={idx} style={{ position: "relative" }}>
              <Image
                source={{ uri: a.uri }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 12,
                  backgroundColor: COLORS.lightGray,
                }}
              />
              {/* ADD: delete button */}
              <TouchableOpacity
                accessibilityLabel={`Remove photo ${idx + 1}`}
                onPress={() => removeImageAt(idx)}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  backgroundColor: "#EF4444",
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {progress.total > 0 && progress.done < progress.total ? (
        <Text style={{ color: COLORS.text, opacity: 0.7 }}>
          Uploading {progress.done}/{progress.total}...
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <TouchableOpacity
          onPress={pickImage}
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
              fontWeight: "600",
            }}
          >
            Add Photo
          </Text>
        </TouchableOpacity>
        {assets.length > 0 ? (
          <TouchableOpacity
            onPress={clearAllPhotos}
            style={{
              backgroundColor: "#FEE2E2",
              paddingVertical: 12,
              borderRadius: 12,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: "#991B1B", fontWeight: "600" }}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View
        style={{
          height: 220,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#000",
          marginTop: 16,
        }}
      >
        {/* Show camera until a video is recorded; then show preview */}
        {!videoAsset ? (
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="front"
            mode="video"
          />
        ) : (
          <Video
            style={{ flex: 1 }}
            source={{ uri: videoAsset.uri }}
            shouldPlay
            isLooping
            resizeMode="cover"
          />
        )}
      </View>

      {/* Recording / Accept / Redo controls */}
      {!videoAsset ? (
        <TouchableOpacity
          onPress={toggleRecord}
          style={{
            backgroundColor: recording ? "#DC2626" : COLORS.primary,
            paddingVertical: 12,
            borderRadius: 12,
            marginTop: 12,
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
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          {!videoAccepted ? (
            <>
              <TouchableOpacity
                onPress={acceptVideo}
                style={{
                  backgroundColor: COLORS.primary,
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
                  Video accepted
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

      <TouchableOpacity
        onPress={onSave}
        disabled={loading}
        style={{
          backgroundColor: COLORS.primary,
          paddingVertical: 14,
          borderRadius: 12,
          marginTop: 16,
          opacity: loading ? 0.6 : 1,
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
          {loading ? "Saving..." : "Save & Continue"}
        </Text>
      </TouchableOpacity>

      {error && <Text style={{ color: "#EF4444", marginTop: 8 }}>{error}</Text>}

      <View style={{ height: insets.bottom + 8 }} />
    </View>
  );
}

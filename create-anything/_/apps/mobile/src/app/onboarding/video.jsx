import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { Video } from "expo-video";
import useUpload from "@/utils/useUpload";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
};

function getTierLimits(tier) {
  const t = (tier || "free").toLowerCase();
  switch (t) {
    case "business":
      return 5 * 60; // 5 minutes
    case "dating":
      return 60; // 60 seconds
    case "casual":
      return 30; // 30 seconds
    case "free":
    default:
      return 15; // 15 seconds
  }
}

export default function VideoOnboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [video, setVideo] = useState(null);
  const [videoAccepted, setVideoAccepted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [tier, setTier] = useState("free");
  const [upload, { loading }] = useUpload();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // ADD: simple progress
  const totalSteps = 5;
  const stepIndex = 4;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;
  
  const maxVideoSec = getTierLimits(tier);

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

  const ensurePermissions = useCallback(async () => {
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
        Alert.alert("Microphone", "Microphone permission is required.");
        return false;
      }
    }
    return true;
  }, [permission?.granted, micPermission?.granted, requestPermission, requestMicPermission]);

  const toggleRecord = useCallback(async () => {
    const ok = await ensurePermissions();
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
        const rec = await cam.recordAsync({ maxDuration: maxVideoSec });
        setVideo(rec);
      } else if (typeof cam.startRecording === "function") {
        const rec = await new Promise((resolve, reject) => {
          let timeout;
          try {
            cam.startRecording({
              maxDuration: maxVideoSec,
              onRecordingFinished: (video) => {
                clearTimeout(timeout);
                resolve(video);
              },
              onRecordingError: (err) => {
                clearTimeout(timeout);
                reject(err);
              },
            });
            timeout = setTimeout(() => {
              try { cam.stopRecording(); } catch {}
            }, (maxVideoSec + 1) * 1000);
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        });
        setVideo(rec);
      } else {
        throw new Error("This device does not support video recording");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to record video. Please try again.");
    } finally {
      setRecording(false);
    }
  }, [ensurePermissions, maxVideoSec, recording]);

  const acceptVideo = useCallback(() => {
    if (!video) return;
    setVideoAccepted(true);
  }, [video]);

  const redoVideo = useCallback(() => {
    setVideo(null);
    setVideoAccepted(false);
  }, []);

  const onNext = useCallback(async () => {
    if (!video) {
      Alert.alert("Record video", "Please record a short profile video.");
      return;
    }
    if (!videoAccepted) {
      Alert.alert("Accept video", "Please accept your video or redo it.");
      return;
    }
    try {
      const { url, error } = await upload({ reactNativeAsset: { uri: video.uri, mimeType: "video/mp4" } });
      if (error) throw new Error(error);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media: [{ type: "video", url, sort_order: 0 }],
        }),
      });
      if (!res.ok) {
        throw new Error(
          `When saving video, the response was [${res.status}] ${res.statusText}`,
        );
      }
      router.push("/onboarding/consent");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save video");
    }
  }, [video, videoAccepted, upload, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.white,
        paddingTop: insets.top,
        paddingHorizontal: 24,
      }}
    >
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
        Record your intro video
      </Text>
      <Text style={{ color: COLORS.text, opacity: 0.7, marginTop: 8 }}>
        Record a {maxVideoSec}s video using your front camera. This helps prevent catfishing.
      </Text>

      <View
        style={{
          height: 300,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#000",
          marginTop: 24,
        }}
      >
        {!video ? (
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="front"
            mode="video"
          />
        ) : (
          <Video
            style={{ flex: 1 }}
            source={{ uri: video.uri }}
            shouldPlay
            isLooping
            resizeMode="cover"
          />
        )}
      </View>

      {!video ? (
        <TouchableOpacity
          onPress={toggleRecord}
          style={{
            backgroundColor: recording ? "#DC2626" : COLORS.primary,
            paddingVertical: 12,
            borderRadius: 12,
            marginTop: 16,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: COLORS.white,
              fontWeight: "700",
            }}
          >
            {recording ? "Stop Recording" : `Record Video (max ${maxVideoSec}s)`}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
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

      <TouchableOpacity
        onPress={onNext}
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
          {loading ? "Saving..." : "Next: Data Consent"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

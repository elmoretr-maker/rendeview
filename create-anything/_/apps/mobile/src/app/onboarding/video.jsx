import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import * as RNImagePicker from "expo-image-picker";
import useUpload from "@/utils/useUpload";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
};

export default function VideoOnboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [video, setVideo] = useState(null);
  const [upload, { loading }] = useUpload();

  // ADD: simple progress
  const totalSteps = 5;
  const stepIndex = 4;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const pickVideo = useCallback(async () => {
    const result = await RNImagePicker.launchImageLibraryAsync({
      mediaTypes: RNImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled) {
      setVideo(result.assets[0]);
    }
  }, []);

  const onNext = useCallback(async () => {
    if (!video) {
      Alert.alert("Add video", "Please upload a short profile video.");
      return;
    }
    try {
      const { url, error } = await upload({ reactNativeAsset: video });
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
      Alert.alert("Error", "Could not upload video");
    }
  }, [video, upload, router]);

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
        Add your intro video
      </Text>
      <Text style={{ color: COLORS.text, opacity: 0.7, marginTop: 8 }}>
        A short clip helps prevent catfishing.
      </Text>

      {!video ? (
        <Text style={{ marginTop: 16, color: COLORS.text, opacity: 0.7 }}>
          No video selected yet.
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={pickVideo}
        style={{
          backgroundColor: COLORS.lightGray,
          paddingVertical: 12,
          borderRadius: 12,
          marginTop: 24,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: COLORS.primary,
            fontWeight: "600",
          }}
        >
          {video ? "Change Video" : "Pick a Video"}
        </Text>
      </TouchableOpacity>

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
          {loading ? "Uploading..." : "Next: Data Consent"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

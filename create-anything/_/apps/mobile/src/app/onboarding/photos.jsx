import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import * as RNImagePicker from "expo-image-picker";
import useUpload from "@/utils/useUpload";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Brand palette
const COLORS = {
  primary: "#5B3BAF", // Deep Indigo
  text: "#2C3E50", // Neutral Text
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
};

export default function PhotosOnboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [upload, { loading }] = useUpload();
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // ADD: simple progress
  const totalSteps = 5;
  const stepIndex = 3;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const pickImage = useCallback(async () => {
    const result = await RNImagePicker.launchImageLibraryAsync({
      mediaTypes: RNImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) {
      setAssets((prev) => [...prev, result.assets[0]].slice(0, 6));
    }
  }, []);

  const removeImageAt = useCallback((index) => {
    setAssets((prev) => prev.filter((_, i) => i !== index));
  }, []); // ADD: delete photo

  const clearAllPhotos = useCallback(() => {
    setAssets([]);
  }, []); // ADD: clear all

  const onNext = useCallback(async () => {
    if (assets.length < 3) {
      Alert.alert("Add photos", "Please add at least 3 photos.");
      return;
    }
    try {
      setError(null);
      const total = assets.length;
      setProgress({ done: 0, total });
      let media = [];

      for (let i = 0; i < assets.length; i++) {
        const a = assets[i];
        const {
          url,
          mimeType,
          error: upErr,
        } = await upload({ reactNativeAsset: a });
        if (upErr) throw new Error(upErr);
        media.push({ type: "photo", url, sort_order: i });
        setProgress({ done: i + 1, total });
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media }),
      });
      if (!res.ok) {
        throw new Error(
          `When saving photos, the response was [${res.status}] ${res.statusText}`,
        );
      }
      router.push("/onboarding/video");
    } catch (e) {
      console.error(e);
      setError("Could not upload photos");
      Alert.alert("Error", e?.message || "Could not upload photos");
    }
  }, [assets, upload, router]);

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
        Add at least 3 photos
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
            }}
          >
            <Text style={{ color: COLORS.text, opacity: 0.7 }}>
              No photos yet — add a few to continue.
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
        <Text style={{ color: COLORS.text, opacity: 0.7, marginBottom: 8 }}>
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
          {loading ? "Saving..." : "Next: Add Video"}
        </Text>
      </TouchableOpacity>

      {error && <Text style={{ color: "#EF4444", marginTop: 8 }}>{error}</Text>}
    </View>
  );
}

import React, { useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function ProfileOnboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ADD: simple progress
  const totalSteps = 5; // membership, profile, media/photos, video (or media), consent
  const stepIndex = 2;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const onNext = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        throw new Error(
          `When saving profile, the response was [${res.status}] ${res.statusText}`,
        );
      }
      router.push("/onboarding/media");
    } catch (e) {
      console.error(e);
      setError("Could not save profile");
      Alert.alert("Error", "Could not save profile");
    } finally {
      setSaving(false);
    }
  }, [name, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
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
              backgroundColor: "#5B3BAF",
              borderRadius: 999,
            }}
          />
        </View>
        <Text style={{ marginTop: 6, color: "#2C3E50", opacity: 0.7 }}>
          Step {stepIndex} of {totalSteps}
        </Text>
      </View>

      <Text style={{ fontSize: 24, fontWeight: "700", marginTop: 16 }}>
        Tell us about you
      </Text>
      <Text style={{ color: "#6B6B6B", marginTop: 8 }}>
        We use this to personalize your experience.
      </Text>

      <Text style={{ marginTop: 24, marginBottom: 8, fontWeight: "600" }}>
        Display name
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: "#EAEAEA",
          borderRadius: 10,
          padding: 12,
        }}
        placeholder="Your name"
        value={name}
        onChangeText={setName}
      />

      {error && <Text style={{ color: "#EF4444", marginTop: 8 }}>{error}</Text>}

      <TouchableOpacity
        onPress={onNext}
        disabled={saving || !name.trim()}
        style={{
          backgroundColor: "#5B3BAF", // updated to Primary Accent
          paddingVertical: 14,
          borderRadius: 12,
          marginTop: 24,
          opacity: saving || !name.trim() ? 0.6 : 1,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "#FFFFFF",
            fontWeight: "600",
            fontSize: 16,
          }}
        >
          {saving ? "Saving..." : "Next: Add Photos"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{ paddingVertical: 14, borderRadius: 12, marginTop: 12 }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "#6B6B6B",
            fontWeight: "600",
            fontSize: 16,
          }}
        >
          Back
        </Text>
      </TouchableOpacity>
    </View>
  );
}

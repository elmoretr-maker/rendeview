import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ConsentRequired() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo =
    typeof params.returnTo === "string" && params.returnTo.length > 0
      ? decodeURIComponent(params.returnTo)
      : "/(tabs)";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        paddingTop: insets.top,
        paddingHorizontal: 24,
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
        Consent Required
      </Text>
      <Text style={{ color: "#6B6B6B", marginBottom: 24 }}>
        You must accept data consent to use the app features.
      </Text>
      <TouchableOpacity
        onPress={() =>
          router.replace(
            `/onboarding/consent?returnTo=${encodeURIComponent(returnTo)}`,
          )
        }
        style={{
          backgroundColor: "#6855FF",
          paddingVertical: 14,
          borderRadius: 12,
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
          Return to Consent
        </Text>
      </TouchableOpacity>
    </View>
  );
}

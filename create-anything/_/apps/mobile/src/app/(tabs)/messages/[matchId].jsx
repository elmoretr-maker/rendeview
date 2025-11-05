import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { useAuth } from "@/utils/auth/useAuth";
import { containsExternalContact, PHONE_NUMBER_SECURITY_MESSAGE } from "@/utils/safetyFilters";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function Chat() {
  const { matchId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const { signIn, isReady } = useAuth();
  const [loaded, errorFont] = useFonts({ Inter_400Regular, Inter_600SemiBold });

  const { data, isLoading, error } = useQuery({
    queryKey: ["messages", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${matchId}`);
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    refetchInterval: 5000,
    retry: (count, err) => {
      // @ts-ignore
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch(`/api/messages/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        // @ts-ignore
        err.code = 401;
        throw err;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const err = new Error(errorData.error || "Failed to send");
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
    },
    onError: (e) => {
      // @ts-ignore
      if (e?.code === 401 || e?.message === "AUTH_401") {
        Alert.alert("Sign in required", "Please sign in to continue.");
        if (isReady) signIn();
        return;
      }
      Alert.alert("Error", e?.message || "Message failed");
    },
  });

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert("Error", "Message cannot be empty");
      return;
    }
    if (text.length > 280) {
      Alert.alert("Message Too Long", "Message exceeds 280 characters. Please keep messages brief and focused on scheduling your video chat!");
      return;
    }
    if (containsExternalContact(trimmed)) {
      Alert.alert("Security Alert", PHONE_NUMBER_SECURITY_MESSAGE);
      return;
    }
    sendMutation.mutate(trimmed);
    Keyboard.dismiss();
  }, [text, sendMutation]);

  const msgs = data?.messages || [];

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
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            marginBottom: 8,
            color: COLORS.text,
            fontFamily: "Inter_600SemiBold",
          }}
        >
          Chat
        </Text>
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
          ) : (
            <Text
              style={{ color: COLORS.text, fontFamily: "Inter_400Regular" }}
            >
              Error loading messages
            </Text>
          )
        ) : (
          <>
            <FlatList
              data={msgs}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={{ paddingVertical: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: COLORS.text,
                      fontFamily: "Inter_400Regular",
                    }}
                  >
                    {item.body}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#9CA3AF" }}>
                    {new Date(item.created_at).toLocaleTimeString()}
                  </Text>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 88 }}
            />
            <View
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: insets.bottom + 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: "#FFFFFF",
                  }}
                  placeholder="Type a message..."
                  value={text}
                  onChangeText={setText}
                  maxLength={280}
                />
                <TouchableOpacity
                  onPress={send}
                  style={{
                    backgroundColor: COLORS.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    Send
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  fontSize: 10,
                  color: text.length > 280 ? COLORS.error : "#9CA3AF",
                  textAlign: "right",
                  marginTop: 4,
                  fontFamily: "Inter_400Regular",
                }}
              >
                {text.length}/280 characters
              </Text>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}

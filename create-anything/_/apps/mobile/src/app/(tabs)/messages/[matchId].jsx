import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import { useAuth } from "@/utils/auth/useAuth";
import { containsExternalContact, PHONE_NUMBER_SECURITY_MESSAGE } from "@/utils/safetyFilters";
import {
  LongMessagePrompt,
  VideoSchedulingNudge,
  DecayModePrompt,
  PreVideoLimitReached,
  RewardWarningPrompt,
} from "@/components/SmartPrompts";
import { VideoMessageRecorder } from "@/components/VideoMessageRecorder";
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const { signIn, isReady } = useAuth();
  const [loaded, errorFont] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  
  // Smart prompts state
  const [showLongMessagePrompt, setShowLongMessagePrompt] = useState(false);
  const [showVideoNudge, setShowVideoNudge] = useState(false);
  const [showDecayPrompt, setShowDecayPrompt] = useState(false);
  const [showLimitPrompt, setShowLimitPrompt] = useState(false);
  const [showRewardWarning, setShowRewardWarning] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  
  // Track if prompts have been dismissed (persist dismissal)
  const longMessageDismissed = useRef(false);
  const videoNudgeDismissed = useRef(false);
  const decayModeDismissed = useRef(false);
  const rewardWarningDismissed = useRef(false);

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

  // Fetch message quota (using new Progressive Video Unlock API)
  const { data: quotaData, refetch: refetchQuota } = useQuery({
    queryKey: ["conversationQuota", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/conversation-quota?conversationId=${matchId}`);
      if (res.status === 403) {
        return null; // Conversation blocked
      }
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!matchId,
    refetchInterval: 10000,
    retry: false,
  });

  // Monitor text length for long message prompt (280+ characters)
  useEffect(() => {
    if (text.length >= 280 && !showLongMessagePrompt && !longMessageDismissed.current) {
      setShowLongMessagePrompt(true);
    }
  }, [text, showLongMessagePrompt]);

  // Monitor message count for video scheduling nudge (at message 8)
  useEffect(() => {
    if (quotaData?.messagesSentToday === 8 && quotaData?.messagesRemaining === 2 && !quotaData?.hasCompletedVideo && !videoNudgeDismissed.current) {
      setShowVideoNudge(true);
    }
  }, [quotaData]);

  // Monitor decay mode
  useEffect(() => {
    if (quotaData?.isDecayMode && quotaData?.messagesRemaining <= 1 && !showDecayPrompt && !decayModeDismissed.current) {
      setShowDecayPrompt(true);
    }
  }, [quotaData, showDecayPrompt]);

  // Monitor reward warning (7 days before month end)
  useEffect(() => {
    if (quotaData?.rewardStatus) {
      const { hasActiveReward, remainingCallsNeeded, daysUntilMonthEnd } = quotaData.rewardStatus;
      if (!hasActiveReward && remainingCallsNeeded > 0 && daysUntilMonthEnd <= 7 && !rewardWarningDismissed.current) {
        setShowRewardWarning(true);
      }
    }
  }, [quotaData]);

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
      if (res.status === 429) {
        // Quota exceeded - show appropriate prompt
        const errorData = await res.json().catch(() => ({}));
        const err = new Error(errorData.error || "Message limit reached");
        // @ts-ignore
        err.response = res;
        // @ts-ignore
        err.data = errorData;
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
      refetchQuota();
      // Reset dismissal flags on successful send (new conversation context)
      longMessageDismissed.current = false;
      videoNudgeDismissed.current = false;
    },
    onError: (e) => {
      // @ts-ignore
      if (e?.code === 401 || e?.message === "AUTH_401") {
        Alert.alert("Sign in required", "Please sign in to continue.");
        if (isReady) signIn();
        return;
      }
      // @ts-ignore
      if (e?.response?.status === 429) {
        // @ts-ignore
        const reason = e?.data?.reason;
        if (reason === "PRE_VIDEO_LIMIT") {
          setShowLimitPrompt(true);
        } else if (reason === "DECAY_MODE") {
          setShowDecayPrompt(true);
        } else {
          Alert.alert("Daily Limit Reached", e?.message || "You've reached your message limit for today.");
        }
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
  const otherUser = data?.otherUser;

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
        {/* Chat Header with Profile Picture and Back Button */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 }}>
          <TouchableOpacity
            onPress={() => otherUser?.id && router.push(`/profile/${otherUser.id}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              gap: 12,
            }}
          >
            {otherUser?.photo ? (
              <AuthenticatedImage
                source={{ uri: otherUser.photo }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#EEE",
                }}
              />
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#EEE",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: COLORS.text, fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>
                  {otherUser?.name ? otherUser.name.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: COLORS.text,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                {otherUser?.name || "Chat"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.gray600,
                  fontFamily: "Inter_400Regular",
                }}
              >
                Tap to view profile
              </Text>
            </View>
          </TouchableOpacity>
        </View>
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
                <TouchableOpacity
                  onPress={() => setShowVideoRecorder(true)}
                  style={{
                    backgroundColor: COLORS.secondary,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="videocam" size={20} color="white" />
                </TouchableOpacity>
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

      {/* Smart Prompts for Progressive Video Unlock */}
      <LongMessagePrompt
        visible={showLongMessagePrompt}
        onKeepTyping={() => {
          longMessageDismissed.current = true;
          setShowLongMessagePrompt(false);
        }}
        onScheduleVideo={() => {
          longMessageDismissed.current = true;
          setShowLongMessagePrompt(false);
          router.push(`/schedule/propose/${data?.otherUser?.id}`);
        }}
        onDismiss={() => {
          longMessageDismissed.current = true;
          setShowLongMessagePrompt(false);
          setText("");
        }}
      />

      <VideoSchedulingNudge
        visible={showVideoNudge}
        onScheduleVideo={() => {
          videoNudgeDismissed.current = true;
          setShowVideoNudge(false);
          router.push(`/schedule/propose/${data?.otherUser?.id}`);
        }}
        onDismiss={() => {
          videoNudgeDismissed.current = true;
          setShowVideoNudge(false);
        }}
        messagesRemaining={quotaData?.messagesRemaining || 0}
      />

      <DecayModePrompt
        visible={showDecayPrompt}
        onScheduleVideo={() => {
          decayModeDismissed.current = true;
          setShowDecayPrompt(false);
          router.push(`/schedule/propose/${data?.otherUser?.id}`);
        }}
        onDismiss={() => {
          decayModeDismissed.current = true;
          setShowDecayPrompt(false);
        }}
      />

      <PreVideoLimitReached
        visible={showLimitPrompt}
        onScheduleVideo={() => {
          setShowLimitPrompt(false);
          router.push(`/schedule/propose/${data?.otherUser?.id}`);
        }}
        onBuyCredits={() => {
          setShowLimitPrompt(false);
          router.push("/buy-credits");
        }}
        onDismiss={() => setShowLimitPrompt(false)}
      />

      <RewardWarningPrompt
        visible={showRewardWarning}
        remainingCalls={quotaData?.rewardStatus?.remainingCallsNeeded || 0}
        daysRemaining={quotaData?.rewardStatus?.daysUntilMonthEnd || 0}
        onDismiss={() => {
          rewardWarningDismissed.current = true;
          setShowRewardWarning(false);
        }}
      />

      {/* Video Message Recorder */}
      <VideoMessageRecorder
        visible={showVideoRecorder}
        conversationId={matchId}
        onClose={() => setShowVideoRecorder(false)}
        onSent={() => {
          queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
          refetchQuota();
        }}
      />
    </KeyboardAvoidingAnimatedView>
  );
}

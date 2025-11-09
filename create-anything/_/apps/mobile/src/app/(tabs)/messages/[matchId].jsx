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
import Modal from "react-native/Libraries/Modal/Modal";
import {
  LongMessagePrompt,
  VideoSchedulingNudge,
  DecayModePrompt,
  PreVideoLimitReached,
  RewardWarningPrompt,
} from "@/components/SmartPrompts";
import { VideoMessageRecorder } from "@/components/VideoMessageRecorder";
import { getTierLimits } from "@/utils/membershipTiers";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
} from "@expo/google-fonts/inter";

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
  
  // Video call state
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [creatingVideoCall, setCreatingVideoCall] = useState(false);
  const [videoCooldown, setVideoCooldown] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  
  // Incoming call state
  const [incomingCall, setIncomingCall] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [respondingToCall, setRespondingToCall] = useState(false);
  
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

  // Poll for incoming call invitations (3 second interval)
  const { data: invitationData } = useQuery({
    queryKey: ["callInvitations"],
    queryFn: async () => {
      const res = await fetch("/api/video/invitations/poll");
      if (!res.ok) return { incomingInvitation: null, outgoingInvitation: null };
      return res.json();
    },
    refetchInterval: 3000,
    enabled: !!matchId && !incomingCall,
  });

  // Show incoming call modal when invitation arrives
  useEffect(() => {
    if (invitationData?.incomingInvitation && !incomingCall) {
      setIncomingCall(invitationData.incomingInvitation);
    }
  }, [invitationData, incomingCall]);

  // Handle outgoing invitation responses (caller-side)
  useEffect(() => {
    const outgoing = invitationData?.outgoingInvitation;
    if (!outgoing) return;

    if (outgoing.status === "accepted") {
      // Callee accepted - navigate to video room!
      Alert.alert(
        "Call Accepted!",
        `${outgoing.callee_name} accepted your call. Starting video...`,
        [{ text: "OK", onPress: () => router.push(`/video/call?matchId=${outgoing.match_id}`) }],
        { cancelable: false }
      );
    } else if (outgoing.status === "declined") {
      // Callee declined - show reason
      Alert.alert(
        "Call Declined",
        `${outgoing.callee_name} declined your call.\nReason: ${outgoing.decline_reason || "Not available"}`,
        [{ text: "OK" }]
      );
    }
  }, [invitationData?.outgoingInvitation, router]);

  // Helper functions
  const getCallDuration = (tier) => {
    const limits = getTierLimits(tier);
    return limits.chatMinutes || 5;
  };

  const getTierDisplay = (tier) => {
    const tierMap = { free: 'Free', casual: 'Casual', dating: 'Dating', business: 'Business' };
    return tierMap[tier?.toLowerCase()] || 'Free';
  };

  const formatCooldownTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Start video call handler
  const handleStartVideoCall = async () => {
    if (!matchId) {
      Alert.alert("Error", "Unable to start video call");
      return;
    }

    setCreatingVideoCall(true);
    try {
      const res = await fetch("/api/video/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: Number(matchId) }),
      });

      if (!res.ok) {
        const error = await res.json();
        
        if (error.isLimitExceeded && error.secondsUntilAvailable !== undefined) {
          setVideoCooldown({
            nextAvailableAt: error.nextAvailableAt,
            currentMeetings: error.currentMeetings,
            maxMeetings: error.maxMeetings
          });
          setCooldownSeconds(error.secondsUntilAvailable);
          setShowVideoCallModal(false);
          Alert.alert("Daily Limit Reached", error.error);
          return;
        }
        
        if (error.upgradeRequired) {
          Alert.alert("Upgrade Required", error.error || "Please upgrade to start video calls", [
            { text: "Cancel", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/settings/subscription") }
          ]);
          setShowVideoCallModal(false);
          return;
        }
        throw new Error(error.error || "Failed to create invitation");
      }

      const invitationResponse = await res.json();
      setShowVideoCallModal(false);
      
      Alert.alert(
        "Call Invitation Sent",
        `Waiting for ${otherUser?.name || "user"} to accept...`,
        [
          {
            text: "Cancel",
            style: "destructive",
            onPress: async () => {
              try {
                await fetch(`/api/video/invitations/${invitationResponse.invitation.id}/cancel`, {
                  method: "POST",
                });
              } catch (e) {
                console.error("Failed to cancel invitation", e);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error("Video call error:", error);
      Alert.alert("Error", error.message || "Could not start video call");
    } finally {
      setCreatingVideoCall(false);
    }
  };

  // Accept incoming call
  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    setRespondingToCall(true);
    try {
      const res = await fetch(`/api/video/invitations/${incomingCall.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to accept call");
      }

      const { matchId: callMatchId } = await res.json();
      setIncomingCall(null);
      router.push(`/video/call?matchId=${callMatchId}`);
    } catch (error) {
      console.error("Accept call error:", error);
      Alert.alert("Error", error.message || "Could not accept call");
      setIncomingCall(null);
    } finally {
      setRespondingToCall(false);
    }
  };

  // Decline incoming call
  const handleDeclineCall = async () => {
    if (!incomingCall) return;

    setRespondingToCall(true);
    try {
      const res = await fetch(`/api/video/invitations/${incomingCall.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "decline",
          declineReason: declineReason.trim() || "Not available right now"
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to decline call");
      }

      Alert.alert("Call Declined", "The caller has been notified");
      setIncomingCall(null);
      setDeclineReason("");
    } catch (error) {
      console.error("Decline call error:", error);
      Alert.alert("Error", error.message || "Could not decline call");
      setIncomingCall(null);
    } finally {
      setRespondingToCall(false);
    }
  };

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            setVideoCooldown(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownSeconds]);

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
              <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                
                {/* Online/Offline Status Dot - clickable for instant call ONLY if users have video history */}
                {otherUser?.immediate_available && !otherUser?.availability_override && otherUser?.video_call_available !== false && otherUser?.hasVideoHistory ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (videoCooldown) {
                        Alert.alert("On Cooldown", `Next call available in ${formatCooldownTime(cooldownSeconds)}`);
                      } else {
                        setShowVideoCallModal(true);
                      }
                    }}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: COLORS.secondary,
                      marginLeft: 8,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: "#9CA3AF",
                      marginLeft: 8,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.gray600,
                  fontFamily: "Inter_400Regular",
                }}
              >
                {otherUser?.immediate_available && !otherUser?.availability_override && otherUser?.hasVideoHistory
                  ? "Tap dot to call • Profile" 
                  : otherUser?.immediate_available && !otherUser?.availability_override && !otherUser?.hasVideoHistory
                  ? "Online • Schedule first call • Profile"
                  : "Offline • Tap to view profile"}
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

      {/* Video Call Confirmation Modal */}
      <Modal visible={showVideoCallModal} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          padding: 24,
        }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
              Start Video Call?
            </Text>
            <Text style={{ color: "#374151", marginBottom: 16 }}>
              Call duration: <Text style={{ fontWeight: "700" }}>Free tier (5 minutes)</Text>
            </Text>
            <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
              💡 Upgrade to Casual ($9.99/mo) for 15-minute calls
            </Text>
            
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowVideoCallModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                }}
                disabled={creatingVideoCall}
              >
                <Text style={{ textAlign: "center", fontWeight: "600", color: "#374151" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleStartVideoCall}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: COLORS.secondary,
                }}
                disabled={creatingVideoCall}
              >
                {creatingVideoCall ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ textAlign: "center", fontWeight: "700", color: "#fff" }}>
                    Start Call
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Incoming Call Modal */}
      <Modal visible={!!incomingCall} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.8)",
          justifyContent: "center",
          padding: 24,
        }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" }}>
            {incomingCall?.caller_photo ? (
              <AuthenticatedImage
                source={{ uri: incomingCall.caller_photo }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  marginBottom: 16,
                }}
              />
            ) : (
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: COLORS.primary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}>
                <Text style={{ fontSize: 32, fontWeight: "700", color: "#fff" }}>
                  {incomingCall?.caller_name?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )}
            
            <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
              Incoming Video Call
            </Text>
            <Text style={{ fontSize: 16, color: "#374151", marginBottom: 4 }}>
              {incomingCall?.caller_name || "Someone"}
            </Text>
            <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 20 }}>
              {incomingCall?.secondsRemaining}s to respond
            </Text>
            
            <View style={{ width: "100%", gap: 12 }}>
              <TouchableOpacity
                onPress={handleAcceptCall}
                style={{
                  backgroundColor: "#10B981",
                  padding: 16,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                disabled={respondingToCall}
              >
                {respondingToCall ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="videocam" size={24} color="white" />
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                      Accept
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TextInput
                placeholder="Reason for declining (optional)"
                value={declineReason}
                onChangeText={setDeclineReason}
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}
                maxLength={100}
              />
              
              <TouchableOpacity
                onPress={handleDeclineCall}
                style={{
                  backgroundColor: "#DC2626",
                  padding: 16,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                disabled={respondingToCall}
              >
                <Ionicons name="close-circle" size={24} color="white" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                  Decline
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingAnimatedView>
  );
}

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Image } from "expo-image";

// Constants matching web implementation
const EXTENSION_COST = 8; // $8.00
const EXTENSION_MINUTES = 10;
const GRACE_PERIOD = 60; // seconds

export default function VideoCall() {
  const { matchId } = useLocalSearchParams();
  const router = useRouter();
  
  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [roomUrl, setRoomUrl] = useState(null);
  const [meetingToken, setMeetingToken] = useState(null);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [error, setError] = useState(null);
  
  // Timer state
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState(null);
  const [graceCountdown, setGraceCountdown] = useState(null);
  const [showExtendButton, setShowExtendButton] = useState(false);
  
  // Extension state
  const [currentExtension, setCurrentExtension] = useState(null);
  const [showExtendInitiateModal, setShowExtendInitiateModal] = useState(false);
  const [showExtendResponseModal, setShowExtendResponseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCheckoutUrl, setPaymentCheckoutUrl] = useState(null);
  
  // User state
  const [otherUserId, setOtherUserId] = useState(null);
  
  // Action state
  const [actionsOpen, setActionsOpen] = useState(false);
  const [loadingBlock, setLoadingBlock] = useState(false);
  
  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  
  // Post-call note modal
  const [showPostCallNoteModal, setShowPostCallNoteModal] = useState(false);
  const [postCallNote, setPostCallNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  
  // Refs
  const pollIntervalRef = useRef(null);
  const localTimerRef = useRef(null);
  const graceTimerRef = useRef(null);
  const noteModalShown = useRef(false);

  // Format time helper
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Poll session state
  const pollSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const res = await fetch(`/api/video/sessions/${sessionId}`);
      if (!res.ok) return;
      
      const data = await res.json();
      
      // Update remaining time
      if (data.session?.remainingSeconds !== undefined) {
        setLocalRemainingSeconds(data.session.remainingSeconds);
      }
      
      // Capture other user ID for blocking/reporting
      if (data.session && !otherUserId) {
        const callerId = data.session.caller_id;
        const calleeId = data.session.callee_id;
        // Note: We'd need current user ID here, fetched separately
        // For now, we'll get it from the match endpoint
      }
      
      // Check if session ended
      if (data.session?.state === "ended" && !noteModalShown.current) {
        if (!showExtendResponseModal && !showPaymentModal) {
          noteModalShown.current = true;
          clearInterval(pollIntervalRef.current);
          clearInterval(localTimerRef.current);
          clearInterval(graceTimerRef.current);
          setShowPostCallNoteModal(true);
        }
      }
      
      // Handle grace period (correct field: isInGracePeriod)
      if (data.session?.isInGracePeriod) {
        const graceExpires = new Date(data.session.graceExpiresAt).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((graceExpires - now) / 1000));
        setGraceCountdown(remaining);
      } else {
        setGraceCountdown(null);
      }
      
      // Handle extensions (correct field: pendingExtensions)
      const pendingExt = data.pendingExtensions?.[0];
      if (pendingExt) {
        setCurrentExtension(pendingExt);
        
        // isResponder (not isInitiator) means we received the request
        if (pendingExt.isResponder && pendingExt.status === "pending_acceptance") {
          setShowExtendResponseModal(true);
        } else {
          // Close responder modal for any non-pending status
          setShowExtendResponseModal(false);
          
          if (pendingExt.status === "accepted" && !pendingExt.isResponder) {
            // We initiated and it was accepted - show payment
            setShowPaymentModal(true);
            setPaymentCheckoutUrl(pendingExt.paymentUrl);
          } else if (pendingExt.status === "completed") {
            // Extension completed - clear everything
            setCurrentExtension(null);
            setShowPaymentModal(false);
          }
        }
      } else {
        // No pending extensions - clear all extension state
        setCurrentExtension(null);
        setShowExtendResponseModal(false);
        setShowPaymentModal(false);
      }
      
      // Show extend button when time is low
      const shouldShowExtend = data.session?.remainingSeconds <= 120 && 
                                data.session?.remainingSeconds > 0 && 
                                !pendingExt;
      setShowExtendButton(shouldShowExtend);
      
    } catch (err) {
      console.error("Poll session error:", err);
    }
  }, [sessionId, otherUserId, showExtendResponseModal, showPaymentModal]);

  // Create room and join
  useEffect(() => {
    let cancelled = false;
    
    const join = async () => {
      if (!matchId) return;
      
      try {
        setLoadingJoin(true);
        setError(null);
        
        // Create room
        const createRes = await fetch("/api/video/room/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: Number(matchId) }),
        });
        
        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          throw new Error(errData?.error || "Could not create room");
        }
        
        const room = await createRes.json();
        if (cancelled) return;
        
        setRoomUrl(room?.room_url || null);
        
        // Get session ID from room URL
        const urlParams = new URLSearchParams(room?.room_url?.split("?")[1] || "");
        const sid = urlParams.get("sessionId");
        if (sid) setSessionId(sid);
        
        // Generate token
        const tokenRes = await fetch("/api/video/token/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_name: room?.room_name,
            room_url: room?.room_url,
          }),
        });
        
        if (!tokenRes.ok) {
          const errData = await tokenRes.json().catch(() => ({}));
          throw new Error(errData?.error || "Could not get meeting token");
        }
        
        const tokenData = await tokenRes.json();
        if (cancelled) return;
        
        setMeetingToken(tokenData?.token || null);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoadingJoin(false);
      }
    };
    
    join();
    
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // Fetch other participant ID
  useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setOtherUserId(data?.match?.other_id || null);
      } catch (e) {
        console.error(e);
      }
    };
    
    if (matchId) load();
    
    return () => {
      mounted = false;
    };
  }, [matchId]);

  // Start session polling
  useEffect(() => {
    if (!sessionId) return;
    
    pollSession(); // Initial poll
    pollIntervalRef.current = setInterval(pollSession, 2000); // Poll every 2s
    
    return () => {
      clearInterval(pollIntervalRef.current);
    };
  }, [sessionId, pollSession]);

  // Local timer countdown
  useEffect(() => {
    if (localRemainingSeconds === null || localRemainingSeconds <= 0) {
      clearInterval(localTimerRef.current);
      return;
    }
    
    localTimerRef.current = setInterval(() => {
      setLocalRemainingSeconds((prev) => Math.max(0, (prev || 0) - 1));
    }, 1000);
    
    return () => {
      clearInterval(localTimerRef.current);
    };
  }, [localRemainingSeconds]);

  // Grace period countdown
  useEffect(() => {
    if (graceCountdown === null || graceCountdown <= 0) {
      clearInterval(graceTimerRef.current);
      return;
    }
    
    graceTimerRef.current = setInterval(() => {
      setGraceCountdown((prev) => Math.max(0, (prev || 0) - 1));
    }, 1000);
    
    return () => {
      clearInterval(graceTimerRef.current);
    };
  }, [graceCountdown]);

  // Handle end call
  const handleEndCall = async () => {
    if (sessionId) {
      try {
        await fetch(`/api/video/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "ended" }),
        });
      } catch (e) {
        console.error("Failed to update session state:", e);
      }
    }
    
    setShowPostCallNoteModal(true);
    setActionsOpen(false);
  };

  // Handle block and end
  const handleBlockAndEnd = async () => {
    if (!otherUserId || loadingBlock) return;
    
    Alert.alert(
      "Block User",
      "Are you sure you want to block this user and end the call?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block & End",
          style: "destructive",
          onPress: async () => {
            try {
              setLoadingBlock(true);
              setError(null);
              
              // End session first
              if (sessionId) {
                await fetch(`/api/video/sessions/${sessionId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ state: "ended" }),
                });
              }
              
              // Block user
              const res = await fetch("/api/blockers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blockedId: otherUserId }),
              });
              
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData?.error || "Failed to block user");
              }
              
              Alert.alert("Success", "User blocked and call ended");
              router.replace("/(tabs)/matches");
            } catch (e) {
              console.error(e);
              setError(e.message);
              Alert.alert("Error", e.message || "Failed to block user. Call ended.");
              router.replace(`/(tabs)/messages/${matchId}`);
            } finally {
              setLoadingBlock(false);
              setActionsOpen(false);
            }
          },
        },
      ]
    );
  };

  // Handle report
  const handleReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert("Error", "Please provide a reason for reporting");
      return;
    }
    
    try {
      setSubmittingReport(true);
      setError(null);
      
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedId: otherUserId,
          reason: reportReason.trim(),
          context: "video_call",
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Failed to submit report");
      }
      
      // End session after reporting
      if (sessionId) {
        await fetch(`/api/video/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "ended" }),
        });
      }
      
      Alert.alert("Success", "Report submitted. Call ended.");
      setShowReportModal(false);
      setReportReason("");
      router.replace("/(tabs)/matches");
    } catch (e) {
      console.error(e);
      setError(e.message);
      Alert.alert("Error", e.message || "Failed to submit report");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Handle extension initiation
  const handleInitiateExtension = async () => {
    try {
      setError(null);
      
      const res = await fetch(`/api/video/sessions/${sessionId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Failed to request extension");
      }
      
      setShowExtendInitiateModal(false);
      pollSession(); // Refresh to get extension
    } catch (e) {
      console.error(e);
      setError(e.message);
      Alert.alert("Error", e.message || "Failed to request extension");
    }
  };

  // Handle extension response
  const handleExtensionResponse = async (action) => {
    try {
      setError(null);
      
      const res = await fetch(`/api/video/sessions/${sessionId}/extend-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Failed to ${action} extension`);
      }
      
      if (action === "decline") {
        setShowExtendResponseModal(false);
        setCurrentExtension(null);
      }
      
      pollSession(); // Refresh
    } catch (e) {
      console.error(e);
      setError(e.message);
      Alert.alert("Error", e.message || `Failed to ${action} extension`);
    }
  };

  // Handle payment completion
  const handlePaymentReturn = useCallback(() => {
    setShowPaymentModal(false);
    setPaymentCheckoutUrl(null);
    pollSession(); // Refresh
  }, [pollSession]);

  // Save post-call note
  const saveNote = async () => {
    try {
      setSavingNote(true);
      setError(null);
      
      if (!otherUserId || !postCallNote.trim()) {
        throw new Error("Note cannot be empty");
      }
      
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: otherUserId, note: postCallNote.trim() }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Failed to save note");
      }
      
      Alert.alert("Success", "Note saved");
      setShowPostCallNoteModal(false);
      router.replace(`/(tabs)/messages/${matchId}`);
    } catch (e) {
      console.error(e);
      setError(e.message);
      Alert.alert("Error", e.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Daily Prebuilt via WebView */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {loadingJoin ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={{ color: "#fff", marginTop: 8, fontSize: 16 }}>Connecting…</Text>
          </View>
        ) : roomUrl && meetingToken ? (
          <WebView
            source={{ uri: `${roomUrl}?t=${encodeURIComponent(meetingToken)}` }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1, backgroundColor: "#000" }}
          />
        ) : (
          <Text style={{ color: "#fff", textAlign: "center", marginTop: 24, fontSize: 16 }}>
            {error || "Preparing call…"}
          </Text>
        )}
      </View>

      {/* Overlay: brand logo */}
      <View
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          backgroundColor: "rgba(255,255,255,0.08)",
          padding: 6,
          borderRadius: 12,
        }}
      >
        <Image
          source={{
            uri: "https://ucarecdn.com/a76d84f4-fea3-4a9d-84b8-cfe3569f1611/-/format/auto/",
          }}
          style={{ width: 56, height: 56, borderRadius: 8 }}
          contentFit="contain"
          transition={120}
          pointerEvents="none"
        />
      </View>

      {/* Overlay: timer */}
      <View style={{ position: "absolute", top: 48, alignSelf: "center" }}>
        {graceCountdown !== null ? (
          <View style={{ backgroundColor: "rgba(243, 156, 18, 0.9)", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              Time's up! Extend to continue ({formatTime(graceCountdown)})
            </Text>
          </View>
        ) : (
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "700" }}>
            {formatTime(localRemainingSeconds)}
          </Text>
        )}
      </View>

      {/* Extension button */}
      {showExtendButton && !currentExtension && (
        <View style={{ position: "absolute", top: 120, alignSelf: "center" }}>
          <TouchableOpacity
            onPress={() => setShowExtendInitiateModal(true)}
            style={{
              backgroundColor: "#F97316",
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 999,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              Extend Call (+${EXTENSION_COST} for {EXTENSION_MINUTES} min)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Waiting for extension acceptance */}
      {currentExtension && currentExtension.status === "pending_acceptance" && !currentExtension.isResponder && (
        <View style={{ position: "absolute", top: 120, alignSelf: "center", backgroundColor: "rgba(91, 59, 175, 0.9)", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 }}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Waiting for other party to accept extension...
          </Text>
        </View>
      )}

      {/* In-call action panel toggle */}
      <View style={{ position: "absolute", bottom: 24, right: 24 }}>
        {actionsOpen && (
          <View
            style={{
              backgroundColor: "#1F2937",
              padding: 12,
              borderRadius: 12,
              marginBottom: 8,
              width: 220,
            }}
          >
            <TouchableOpacity
              onPress={handleEndCall}
              style={{
                backgroundColor: "#F87171",
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                End Call
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowReportModal(true)}
              style={{
                backgroundColor: "#6B7280",
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                Report
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleBlockAndEnd}
              style={{
                backgroundColor: "#111827",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                {loadingBlock ? "Blocking..." : "Block & End"}
              </Text>
            </TouchableOpacity>
            
            {error ? (
              <Text style={{ color: "#FCA5A5", marginTop: 8, fontSize: 12 }}>
                {error}
              </Text>
            ) : null}
          </View>
        )}
        
        <TouchableOpacity
          onPress={() => setActionsOpen((v) => !v)}
          style={{
            backgroundColor: "#374151",
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {actionsOpen ? "Close" : "Actions"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Extension Request Modal */}
      <Modal visible={showExtendInitiateModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "100%" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
              Extend Call
            </Text>
            <Text style={{ color: "#374151", marginBottom: 8 }}>
              Request {EXTENSION_MINUTES} more minutes for ${EXTENSION_COST}.00?
            </Text>
            <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
              The other party must accept before payment is processed.
            </Text>
            
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowExtendInitiateModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                }}
              >
                <Text style={{ textAlign: "center", fontWeight: "600", color: "#374151" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleInitiateExtension}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#6855FF",
                }}
              >
                <Text style={{ textAlign: "center", fontWeight: "700", color: "#fff" }}>
                  Request
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Extension Response Modal */}
      <Modal visible={showExtendResponseModal && !!currentExtension} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "100%" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
              Extension Request
            </Text>
            <Text style={{ color: "#374151", marginBottom: 8 }}>
              The other party wants to extend the call for {EXTENSION_MINUTES} more minutes (${EXTENSION_COST}.00).
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#F97316", marginBottom: 16 }}>
              They will be charged after you accept.
            </Text>
            
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => handleExtensionResponse("decline")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#DC2626",
                }}
              >
                <Text style={{ textAlign: "center", fontWeight: "700", color: "#fff" }}>
                  Decline
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleExtensionResponse("accept")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#10B981",
                }}
              >
                <Text style={{ textAlign: "center", fontWeight: "700", color: "#fff" }}>
                  Accept
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal && !!paymentCheckoutUrl} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>Complete Payment</Text>
            <TouchableOpacity onPress={handlePaymentReturn}>
              <Text style={{ color: "#6855FF", fontWeight: "600", fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
          
          {paymentCheckoutUrl ? (
            <WebView
              source={{ uri: paymentCheckoutUrl }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" />
            </View>
          )}
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "100%" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
              Report User
            </Text>
            <Text style={{ color: "#374151", marginBottom: 12 }}>
              Please provide a reason for reporting this user. The call will end after submission.
            </Text>
            
            <TextInput
              placeholder="Describe the issue..."
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 8,
                padding: 10,
                minHeight: 100,
                textAlignVertical: "top",
                marginBottom: 16,
              }}
              placeholderTextColor="#9CA3AF"
            />
            
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason("");
                  setActionsOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                }}
                disabled={submittingReport}
              >
                <Text style={{ textAlign: "center", fontWeight: "600", color: "#374151" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleReport}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#DC2626",
                }}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ textAlign: "center", fontWeight: "700", color: "#fff" }}>
                    Submit Report
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post-Call Note Modal */}
      <Modal visible={showPostCallNoteModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
              After Call
            </Text>
            
            {error ? (
              <Text style={{ color: "#B91C1C", marginBottom: 8 }}>{error}</Text>
            ) : null}
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: "600", marginBottom: 8, fontSize: 16 }}>
                Personal Notes (private)
              </Text>
              <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 8 }}>
                Add a note about this person for your reference
              </Text>
              <TextInput
                placeholder="Add a note about this person"
                value={postCallNote}
                onChangeText={setPostCallNote}
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 8,
                  padding: 10,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                placeholderTextColor="#9CA3AF"
              />
              
              <TouchableOpacity
                onPress={saveNote}
                style={{
                  backgroundColor: "#2563EB",
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 8,
                }}
                disabled={savingNote}
              >
                {savingNote ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                    Save Note
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              onPress={() => {
                setShowPostCallNoteModal(false);
                router.replace(`/(tabs)/messages/${matchId}`);
              }}
              style={{ padding: 12 }}
            >
              <Text style={{ textAlign: "center", color: "#111827", fontWeight: "600" }}>
                Skip & Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

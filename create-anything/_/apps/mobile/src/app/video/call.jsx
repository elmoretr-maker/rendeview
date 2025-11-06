import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Image } from "expo-image";

export default function VideoCall() {
  const { minutes = 10, matchId } = useLocalSearchParams();
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(Number(minutes) * 60);
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellSeconds, setUpsellSeconds] = useState(20);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [otherId, setOtherId] = useState(null);
  const [loadingBlock, setLoadingBlock] = useState(false);
  const [showPostCall, setShowPostCall] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [error, setError] = useState(null);
  const [scheduleUiVisible, setScheduleUiVisible] = useState(false);
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  // NEW: Daily room + token state
  const [roomUrl, setRoomUrl] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [meetingToken, setMeetingToken] = useState(null);
  const [loadingJoin, setLoadingJoin] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setShowUpsell(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (!showUpsell) return;
    if (upsellSeconds <= 0) {
      // End call and show post-call panel
      setShowUpsell(false);
      setShowPostCall(true);
      return;
    }
    const t = setTimeout(() => setUpsellSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [showUpsell, upsellSeconds, router]);

  const fmt = (s) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const extend = useCallback(
    async (cents) => {
      // Start Stripe checkout for extension
      const redirectURL = process.env.EXPO_PUBLIC_BASE_URL;
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "extension", cents, redirectURL }),
      });
      if (!res.ok) return;
      const { url } = await res.json();
      if (url) {
        router.push({ pathname: "/stripe", params: { checkoutUrl: url } });
      }
    },
    [router],
  );

  // Fetch other participant id for blocking/notes
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setOtherId(data?.match?.other_id || null);
      } catch (e) {
        console.error(e);
      }
    };
    if (matchId) load();
    return () => {
      mounted = false;
    };
  }, [matchId]);

  // NEW: Create Daily room + token, then render Prebuilt via WebView
  useEffect(() => {
    let cancelled = false;
    const join = async () => {
      if (!matchId) return;
      try {
        setLoadingJoin(true);
        setError(null);
        const createRes = await fetch("/api/video/room/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: Number(matchId) }),
        });
        if (!createRes.ok) {
          const t = await createRes.json().catch(() => ({}));
          throw new Error(t?.error || "Could not create room");
        }
        const room = await createRes.json();
        if (cancelled) return;
        setRoomUrl(room?.room_url || null);
        setRoomName(room?.room_name || null);
        const tokenRes = await fetch("/api/video/token/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_name: room?.room_name,
            room_url: room?.room_url,
          }),
        });
        if (!tokenRes.ok) {
          const t = await tokenRes.json().catch(() => ({}));
          throw new Error(t?.error || "Could not get meeting token");
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

  const endCall = useCallback(() => {
    setShowUpsell(false);
    setShowPostCall(true);
  }, []);

  const endAndBlock = useCallback(async () => {
    if (!otherId || loadingBlock) return;
    try {
      setLoadingBlock(true);
      setError(null);
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: otherId }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || `Failed to block user`);
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoadingBlock(false);
      router.replace(`/(tabs)/messages/${matchId}`);
    }
  }, [otherId, loadingBlock, router, matchId]);

  const paySecondDate = useCallback(async () => {
    try {
      setError(null);
      const redirectURL = process.env.EXPO_PUBLIC_BASE_URL;
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "second-date", redirectURL }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || "Could not start payment");
      }
      const { url } = await res.json();
      if (url) {
        setScheduleUiVisible(true);
        router.push({ pathname: "/stripe", params: { checkoutUrl: url } });
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }, [router]);

  const sendSchedule = useCallback(async () => {
    try {
      setError(null);
      if (!startText || !endText || !matchId) {
        throw new Error("Please enter start and end times");
      }
      const res = await fetch("/api/schedule/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: Number(matchId),
          start: startText,
          end: endText,
        }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || "Failed to propose schedule");
      }
      setScheduleUiVisible(false);
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }, [matchId, startText, endText]);

  const saveNote = useCallback(async () => {
    try {
      setError(null);
      if (!otherId || !noteText.trim()) {
        throw new Error("Note cannot be empty");
      }
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: otherId, note: noteText.trim() }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || "Failed to save note");
      }
      setNoteSaved(true);
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }, [otherId, noteText]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Daily Prebuilt via WebView */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {loadingJoin ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator color="#fff" />
            <Text style={{ color: "#fff", marginTop: 8 }}>Connecting…</Text>
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
          <Text style={{ color: "#fff", textAlign: "center", marginTop: 24 }}>
            {error || "Preparing call…"}
          </Text>
        )}
      </View>

      {/* Overlay: brand logo (uses alternate mark) */}
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
      <View style={{ position: "absolute", top: 48 }}>
        <Text style={{ color: "#fff", fontSize: 32, fontWeight: "700" }}>
          {fmt(secondsLeft)}
        </Text>
      </View>

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
              onPress={endCall}
              style={{
                backgroundColor: "#F87171",
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "700",
                }}
              >
                End Call
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={endAndBlock}
              style={{
                backgroundColor: "#111827",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "700",
                }}
              >
                {loadingBlock ? "Blocking..." : "End Call & Block User"}
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

      <Modal visible={showUpsell} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 20,
              width: "100%",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
              Add more time?
            </Text>
            <Text style={{ color: "#6B7280", marginBottom: 16 }}>
              Your call ended. You have {upsellSeconds}s to extend.
            </Text>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                onPress={() => extend(500)}
                style={{
                  backgroundColor: "#ECE8FF",
                  padding: 12,
                  borderRadius: 8,
                  flex: 1,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "#6855FF",
                    fontWeight: "700",
                  }}
                >
                  +$5
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => extend(1000)}
                style={{
                  backgroundColor: "#ECE8FF",
                  padding: 12,
                  borderRadius: 8,
                  flex: 1,
                  marginHorizontal: 8,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "#6855FF",
                    fontWeight: "700",
                  }}
                >
                  +$10
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => extend(2000)}
                style={{
                  backgroundColor: "#ECE8FF",
                  padding: 12,
                  borderRadius: 8,
                  flex: 1,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "#6855FF",
                    fontWeight: "700",
                  }}
                >
                  +$20
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={endCall} style={{ marginTop: 16 }}>
              <Text
                style={{
                  textAlign: "center",
                  color: "#111827",
                  fontWeight: "600",
                }}
              >
                End call
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Post-call action panel */}
      <Modal visible={showPostCall} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20 }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
              After Call
            </Text>
            {error ? (
              <Text style={{ color: "#B91C1C", marginBottom: 8 }}>{error}</Text>
            ) : null}

            {/* Second Date Fee + Scheduling */}
            {!scheduleUiVisible ? (
              <TouchableOpacity
                onPress={paySecondDate}
                style={{
                  backgroundColor: "#10B981",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: "700",
                  }}
                >
                  Schedule New Date ($10)
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontWeight: "600", marginBottom: 8 }}>
                  Propose new time
                </Text>
                <Text
                  style={{ color: "#6B7280", fontSize: 12, marginBottom: 8 }}
                >
                  Enter ISO-like times, e.g. 2025-10-25 19:00
                </Text>
                <TextInput
                  placeholder="Start (YYYY-MM-DD HH:mm)"
                  value={startText}
                  onChangeText={setStartText}
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                  }}
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  placeholder="End (YYYY-MM-DD HH:mm)"
                  value={endText}
                  onChangeText={setEndText}
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                  }}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  onPress={sendSchedule}
                  style={{
                    backgroundColor: "#111827",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      textAlign: "center",
                      fontWeight: "700",
                    }}
                  >
                    Send Proposal
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Personal notes */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: "600", marginBottom: 8 }}>
                Personal Notes (private)
              </Text>
              <TextInput
                placeholder="Add a note about this person"
                value={noteText}
                onChangeText={setNoteText}
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
              >
                <Text
                  style={{
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: "700",
                  }}
                >
                  {noteSaved ? "Saved" : "Save Note"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => router.replace(`/(tabs)/messages/${matchId}`)}
              style={{ padding: 12 }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#111827",
                  fontWeight: "600",
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

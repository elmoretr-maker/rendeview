import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api/apiFetch";
import { containsExternalContact } from "@/utils/safetyFilters";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
  gray600: "#6B7280",
  blue: "#3B82F6",
  pink: "#EC4899",
  red: "#EF4444",
};

export default function ScheduleProposals() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [counterProposalId, setCounterProposalId] = useState(null);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("");
  const [counterDuration, setCounterDuration] = useState(30);
  const [messageProposalId, setMessageProposalId] = useState(null);
  const [messageText, setMessageText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["schedule-proposals"],
    queryFn: async () => {
      const res = await apiFetch("/api/schedule/list");
      if (!res.ok) throw new Error("Failed to load proposals");
      return res.json();
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ proposalId, action, counterDateTime }) => {
      const res = await apiFetch("/api/schedule/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action, counterDateTime }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to respond");
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["schedule-proposals"] });
      setCounterProposalId(null);
      setCounterDate("");
      setCounterTime("");
      setCounterDuration(30);

      if (variables.action === "accept") {
        Alert.alert("Success", "Video date confirmed! Get ready to connect.");
      } else if (variables.action === "substitute") {
        Alert.alert("Success", "Counter-proposal sent!");
      } else {
        Alert.alert("Success", "Proposal declined");
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to respond");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ matchId, message }) => {
      if (containsExternalContact(message)) {
        throw new Error(
          "For your safety, please do not share external contact info (emails or phone numbers). Keep scheduling conversations on the platform."
        );
      }

      const res = await apiFetch(`/api/messages/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }

      return res.json();
    },
    onSuccess: () => {
      setMessageProposalId(null);
      setMessageText("");
      Alert.alert("Success", "Scheduling message sent!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to send message");
    },
  });

  const proposals = data?.proposals || [];
  const pendingProposals = proposals.filter((p) => p.status === "pending" && !p.is_proposer);
  const sentProposals = proposals.filter((p) => p.is_proposer);
  const completedProposals = proposals.filter((p) =>
    ["accepted", "declined", "substituted"].includes(p.status)
  );

  // Generate time slots (every 30 minutes from 9 AM to 9 PM)
  const timeSlots = [];
  for (let hour = 9; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      timeSlots.push(timeStr);
    }
  }

  // Get next 14 days for date selection
  const dateOptions = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dateOptions.push({
      value: date.toISOString().split("T")[0],
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  };

  // Context-aware back button
  const handleBack = () => {
    if (messageProposalId) {
      setMessageProposalId(null);
      setMessageText("");
    } else if (counterProposalId) {
      setCounterProposalId(null);
      setCounterDate("");
      setCounterTime("");
      setCounterDuration(30);
    } else {
      router.back();
    }
  };

  const ProposalCard = ({ proposal }) => {
    const { date, time } = formatDateTime(proposal.proposed_start);
    const isCounter = counterProposalId === proposal.id;
    const isMessaging = messageProposalId === proposal.id;

    return (
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          {proposal.other_user.image && (
            <AuthenticatedImage
              uri={proposal.other_user.image}
              style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: COLORS.text }}>
              {proposal.other_user.name}
            </Text>
            {proposal.is_proposer && (
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.gray600 }}>
                Waiting for response
              </Text>
            )}
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.text, marginBottom: 4 }}>
            📅 {date}
          </Text>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.text }}>
            🕐 {time}
          </Text>
        </View>

        {proposal.status !== "pending" && (
          <View style={{ marginBottom: 12 }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 16,
                backgroundColor:
                  proposal.status === "accepted"
                    ? "#FDE2E8"
                    : proposal.status === "substituted"
                    ? "#EDE9FE"
                    : "#FEE2E2",
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                  color:
                    proposal.status === "accepted"
                      ? COLORS.pink
                      : proposal.status === "substituted"
                      ? COLORS.primary
                      : COLORS.red,
                }}
              >
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </Text>
            </View>
          </View>
        )}

        {!proposal.is_proposer && proposal.status === "pending" && (
          <View>
            {!isCounter && !isMessaging ? (
              <>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity
                    onPress={() =>
                      respondMutation.mutate({ proposalId: proposal.id, action: "accept" })
                    }
                    disabled={respondMutation.isPending}
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.pink,
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "white" }}
                    >
                      ✓ Accept
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setCounterProposalId(proposal.id);
                      setCounterDate("");
                      setCounterTime("");
                      setCounterDuration(30);
                      setMessageProposalId(null);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "white",
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.primary,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.primary }}
                    >
                      💬 Counter
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setMessageProposalId(proposal.id);
                      setMessageText("");
                      setCounterProposalId(null);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "white",
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.blue,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.blue }}
                    >
                      ✉️ Message
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      respondMutation.mutate({ proposalId: proposal.id, action: "decline" })
                    }
                    disabled={respondMutation.isPending}
                    style={{
                      flex: 1,
                      backgroundColor: "white",
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.red,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.red }}
                    >
                      ✕ Decline
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : isMessaging ? (
              <View>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: COLORS.text,
                    marginBottom: 8,
                  }}
                >
                  Send Scheduling Message
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: COLORS.gray600,
                    marginBottom: 8,
                  }}
                >
                  {200 - messageText.length} characters remaining
                </Text>
                <TextInput
                  value={messageText}
                  onChangeText={(text) => {
                    if (text.length <= 200) {
                      setMessageText(text);
                    }
                  }}
                  placeholder="Send a quick note about scheduling... (e.g., 'That time works!')"
                  multiline
                  maxLength={200}
                  style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    padding: 12,
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: COLORS.text,
                    minHeight: 80,
                    textAlignVertical: "top",
                    marginBottom: 4,
                  }}
                />
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 11,
                    color: COLORS.gray600,
                    fontStyle: "italic",
                    marginBottom: 12,
                  }}
                >
                  Note: For your safety, phone numbers and emails are not allowed
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setMessageProposalId(null);
                      setMessageText("");
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "white",
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.text }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      sendMessageMutation.mutate({
                        matchId: proposal.match_id,
                        message: messageText,
                      })
                    }
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    style={{
                      flex: 1,
                      backgroundColor: messageText.trim() ? COLORS.blue : "#D1D5DB",
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    {sendMessageMutation.isPending ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text
                        style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "white" }}
                      >
                        Send Message
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: COLORS.text,
                    marginBottom: 8,
                  }}
                >
                  📅 Select Date
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {dateOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setCounterDate(option.value)}
                      style={{
                        backgroundColor:
                          counterDate === option.value ? COLORS.primary : "white",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: counterDate === option.value ? COLORS.primary : "#D1D5DB",
                        minWidth: "30%",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 12,
                          color: counterDate === option.value ? "white" : COLORS.text,
                        }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: COLORS.text,
                    marginBottom: 8,
                  }}
                >
                  🕐 Select Time
                </Text>
                <ScrollView
                  horizontal={false}
                  style={{ maxHeight: 200, marginBottom: 16 }}
                  showsVerticalScrollIndicator={true}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {timeSlots.map((time) => (
                      <TouchableOpacity
                        key={time}
                        onPress={() => setCounterTime(time)}
                        style={{
                          backgroundColor:
                            counterTime === time ? COLORS.primary : "white",
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: counterTime === time ? COLORS.primary : "#D1D5DB",
                          minWidth: "22%",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 12,
                            color: counterTime === time ? "white" : COLORS.text,
                          }}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: COLORS.text,
                    marginBottom: 8,
                  }}
                >
                  Duration
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {[15, 30, 45, 60].map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      onPress={() => setCounterDuration(mins)}
                      style={{
                        flex: 1,
                        backgroundColor:
                          counterDuration === mins ? COLORS.primary : "white",
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: counterDuration === mins ? COLORS.primary : "#D1D5DB",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 12,
                          color: counterDuration === mins ? "white" : COLORS.text,
                        }}
                      >
                        {mins} min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {counterDate && counterTime && (
                  <View
                    style={{
                      backgroundColor: "#FDE2E8",
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 13,
                        color: COLORS.text,
                      }}
                    >
                      Counter-proposal: {counterDuration}-minute call on{" "}
                      {new Date(counterDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at {counterTime}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setCounterProposalId(null);
                      setCounterDate("");
                      setCounterTime("");
                      setCounterDuration(30);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "white",
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.text }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const startDateTime = new Date(`${counterDate}T${counterTime}`);
                      const endDateTime = new Date(
                        startDateTime.getTime() + counterDuration * 60000
                      );

                      respondMutation.mutate({
                        proposalId: proposal.id,
                        action: "substitute",
                        counterDateTime: {
                          start: startDateTime.toISOString(),
                          end: endDateTime.toISOString(),
                        },
                      });
                    }}
                    disabled={!counterDate || !counterTime || respondMutation.isPending}
                    style={{
                      flex: 1,
                      backgroundColor:
                        counterDate && counterTime ? COLORS.primary : "#D1D5DB",
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    {respondMutation.isPending ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text
                        style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "white" }}
                      >
                        Send Counter
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {proposal.status === "accepted" && (
          <TouchableOpacity
            onPress={() => router.push(`/video/call?matchId=${proposal.match_id}`)}
            style={{
              backgroundColor: COLORS.pink,
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <Text
              style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: "white" }}
            >
              Join Video Date
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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

  if (isLoading) {
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
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={{ marginRight: 12 }}
        >
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 24,
            color: COLORS.text,
          }}
        >
          Video Date Proposals
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {pendingProposals.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 18,
                color: COLORS.text,
                marginBottom: 12,
              }}
            >
              Pending Proposals ({pendingProposals.length})
            </Text>
            {pendingProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </View>
        )}

        {sentProposals.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 18,
                color: COLORS.text,
                marginBottom: 12,
              }}
            >
              Sent Proposals ({sentProposals.length})
            </Text>
            {sentProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </View>
        )}

        {completedProposals.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 18,
                color: COLORS.text,
                marginBottom: 12,
              }}
            >
              Past Proposals ({completedProposals.length})
            </Text>
            {completedProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </View>
        )}

        {proposals.length === 0 && (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 48,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: COLORS.text,
                marginBottom: 16,
              }}
            >
              No video date proposals yet
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/matches")}
              style={{
                backgroundColor: COLORS.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
              }}
            >
              <Text
                style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "white" }}
              >
                View Matches
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

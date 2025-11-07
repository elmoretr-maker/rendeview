import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { apiFetch } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  bg: "#F9FAFB",
  text: "#1F2937",
  textLight: "#6B7280",
  primary: "#9333EA",
  primaryLight: "#EDE7FF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  error: "#DC2626",
};

export default function SchedulePropose() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useLocalSearchParams();
  const targetId = Number(userId);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(30);

  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch user profile
  const { data, isLoading } = useQuery({
    queryKey: ["remote-profile", targetId],
    queryFn: async () => {
      const res = await apiFetch(`/api/profile/${targetId}`);
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  // Check if we have a match with this user
  const { data: matchesData } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await apiFetch("/api/matches-list");
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
  });

  const user = data?.user || {};
  const matches = matchesData?.matches || [];
  const match = matches.find((m) => m.user.id === targetId);
  const matchId = match?.match_id;

  const proposalMutation = useMutation({
    mutationFn: async () => {
      if (!matchId) {
        throw new Error("You must match with this person first");
      }
      if (!selectedDate || !selectedTime) {
        throw new Error("Please select both date and time");
      }

      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const res = await apiFetch("/api/schedule/propose", {
        method: "POST",
        body: JSON.stringify({
          matchId,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to propose schedule");
      }

      return res.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Video date proposal sent!", [
        { text: "OK", onPress: () => router.push("/(tabs)/matches/index") },
      ]);
      queryClient.invalidateQueries({ queryKey: ["schedule-proposals"] });
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to send proposal");
    },
  });

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

  if (!loaded && !errorFont) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, fontSize: 16, color: COLORS.text, fontFamily: "Inter_400Regular" }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}>
          Propose Video Date
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <View style={{ backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {user.primary_photo_url && (
              <Image
                source={{ uri: user.primary_photo_url }}
                style={{ width: 64, height: 64, borderRadius: 32, marginRight: 12 }}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold", marginBottom: 4 }}>
                {user.name}
              </Text>
              {!matchId && (
                <Text style={{ fontSize: 14, color: COLORS.error, fontFamily: "Inter_400Regular" }}>
                  You must match with this person first to schedule a video date
                </Text>
              )}
            </View>
          </View>
        </View>

        {matchId && (
          <>
            <View style={{ backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="calendar-outline" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}>
                  Select Date
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {dateOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSelectedDate(option.value)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: selectedDate === option.value ? COLORS.primary : COLORS.bg,
                      borderWidth: 1,
                      borderColor: selectedDate === option.value ? COLORS.primary : COLORS.border,
                      minWidth: "30%",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: selectedDate === option.value ? "#FFFFFF" : COLORS.text, textAlign: "center", fontFamily: "Inter_600SemiBold" }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="time-outline" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text, fontFamily: "Inter_700Bold" }}>
                  Select Time
                </Text>
              </View>
              <ScrollView horizontal={false} style={{ maxHeight: 256 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {timeSlots.map((time) => (
                    <TouchableOpacity
                      key={time}
                      onPress={() => setSelectedTime(time)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: selectedTime === time ? COLORS.primary : COLORS.bg,
                        borderWidth: 1,
                        borderColor: selectedTime === time ? COLORS.primary : COLORS.border,
                        minWidth: "22%",
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: selectedTime === time ? "#FFFFFF" : COLORS.text, textAlign: "center", fontFamily: "Inter_600SemiBold" }}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 12, fontFamily: "Inter_700Bold" }}>
                Duration
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[15, 30, 45, 60].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => setDuration(mins)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: duration === mins ? COLORS.primary : COLORS.bg,
                      borderWidth: 1,
                      borderColor: duration === mins ? COLORS.primary : COLORS.border,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: duration === mins ? "#FFFFFF" : COLORS.text, textAlign: "center", fontFamily: "Inter_600SemiBold" }}>
                      {mins} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selectedDate && selectedTime && (
              <View style={{ backgroundColor: "#FDF2F8", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 8, fontFamily: "Inter_600SemiBold" }}>
                  Proposal Summary
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: "Inter_400Regular" }}>
                  <Text style={{ fontWeight: "700", fontFamily: "Inter_700Bold" }}>{user.name}</Text> will receive a proposal for a {duration}-minute video date on{" "}
                  <Text style={{ fontWeight: "700", fontFamily: "Inter_700Bold" }}>
                    {new Date(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>{" "}
                  at <Text style={{ fontWeight: "700", fontFamily: "Inter_700Bold" }}>{selectedTime}</Text>
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => proposalMutation.mutate()}
              disabled={!selectedDate || !selectedTime || proposalMutation.isPending}
              style={{
                backgroundColor: (!selectedDate || !selectedTime || proposalMutation.isPending) ? COLORS.textLight : COLORS.primary,
                borderRadius: 12,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              {proposalMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="videocam" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" }}>
                {proposalMutation.isPending ? "Sending..." : "Send Proposal"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {!matchId && (
          <View style={{ paddingVertical: 48, alignItems: "center" }}>
            <Text style={{ fontSize: 16, color: COLORS.text, textAlign: "center", marginBottom: 16, fontFamily: "Inter_400Regular" }}>
              You need to match with {user.name} before proposing a video date.
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/profile/${targetId}`)}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" }}>
                View Profile & Like
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

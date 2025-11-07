import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
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
  pink: "#EC4899",
};

export default function BlockedUsers() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState({});

  const [loaded, errorFont] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["blockers"],
    queryFn: async () => {
      const res = await apiFetch("/api/blockers");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load blocked users");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ blockedId, notes }) => {
      const res = await apiFetch("/api/blockers", {
        method: "PATCH",
        body: JSON.stringify({ blockedId, notes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      return res.json();
    },
    onSuccess: (_, { blockedId }) => {
      queryClient.invalidateQueries({ queryKey: ["blockers"] });
      setEditingNotes((prev) => {
        const updated = { ...prev };
        delete updated[blockedId];
        return updated;
      });
      Alert.alert("Success", "Notes saved");
    },
    onError: () => Alert.alert("Error", "Could not save notes"),
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockedId) => {
      const res = await apiFetch("/api/blockers", {
        method: "DELETE",
        body: JSON.stringify({ blockedId }),
      });
      if (!res.ok) throw new Error("Failed to unblock");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockers"] });
      Alert.alert("Success", "User unblocked");
    },
    onError: () => Alert.alert("Error", "Could not unblock user"),
  });

  const handleNotesChange = (blockedId, value) => {
    setEditingNotes((prev) => ({
      ...prev,
      [blockedId]: value,
    }));
  };

  const handleSaveNotes = (blockedId) => {
    const notes = editingNotes[blockedId];
    updateNotesMutation.mutate({ blockedId, notes });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const blockers = data?.blockers || [];

  if (!loaded && !errorFont) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top }}>
        <View style={{ padding: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.primary, marginLeft: 8, fontFamily: "Inter_600SemiBold" }}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 16, fontSize: 16, color: COLORS.text, fontFamily: "Inter_400Regular" }}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top }}>
        <View style={{ padding: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.primary, marginLeft: 8, fontFamily: "Inter_600SemiBold" }}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 16, color: COLORS.text, fontFamily: "Inter_700Bold" }}>
            Blocked Users
          </Text>
          <Text style={{ color: COLORS.text, marginBottom: 16, fontFamily: "Inter_400Regular" }}>
            Session expired. Please sign in.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/welcome")}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top }}>
        <View style={{ padding: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.primary, marginLeft: 8, fontFamily: "Inter_600SemiBold" }}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 16, color: COLORS.text, fontFamily: "Inter_700Bold" }}>
            Blocked Users
          </Text>
          <Text style={{ color: COLORS.error, fontFamily: "Inter_400Regular" }}>Error loading blocked users</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top }}>
      <View style={{ padding: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.primary, marginLeft: 8, fontFamily: "Inter_600SemiBold" }}>
            Back
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.text, marginBottom: 4, fontFamily: "Inter_700Bold" }}>
            Blocked Users
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textLight, fontFamily: "Inter_400Regular" }}>
            Manage your blocked users and add private notes
          </Text>
        </View>

        {blockers.length === 0 ? (
          <View style={{ backgroundColor: COLORS.card, borderRadius: 12, padding: 48, alignItems: "center" }}>
            <Text style={{ fontSize: 16, color: COLORS.text, fontFamily: "Inter_400Regular" }}>No blocked users</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {blockers.map((item) => {
              const currentNotes =
                editingNotes[item.blocked_id] !== undefined
                  ? editingNotes[item.blocked_id]
                  : item.notes || "";
              const hasUnsavedChanges = editingNotes[item.blocked_id] !== undefined;

              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 12,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={{ width: 64, height: 64, borderRadius: 32, marginRight: 12 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          backgroundColor: COLORS.primaryLight,
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.primary, fontFamily: "Inter_700Bold" }}>
                          {(item.name || "U").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text, marginBottom: 4, fontFamily: "Inter_600SemiBold" }}>
                            {item.name || `User ${item.blocked_id}`}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="calendar-outline" size={14} color={COLORS.textLight} style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 12, color: COLORS.textLight, fontFamily: "Inter_400Regular" }}>
                              Blocked on {formatDate(item.created_at)}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              "Unblock User",
                              `Are you sure you want to unblock ${item.name || "this user"}?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Unblock",
                                  style: "destructive",
                                  onPress: () => unblockMutation.mutate(item.blocked_id),
                                },
                              ]
                            );
                          }}
                          disabled={unblockMutation.isPending}
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: COLORS.error + "15",
                          }}
                        >
                          {unblockMutation.isPending ? (
                            <ActivityIndicator size="small" color={COLORS.error} />
                          ) : (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Ionicons name="trash-outline" size={16} color={COLORS.error} style={{ marginRight: 4 }} />
                              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.error, fontFamily: "Inter_600SemiBold" }}>
                                Unblock
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.text, marginBottom: 6, fontFamily: "Inter_600SemiBold" }}>
                          Private Notes
                        </Text>
                        <TextInput
                          value={currentNotes}
                          onChangeText={(value) => handleNotesChange(item.blocked_id, value)}
                          placeholder="Add a note to remember why you blocked this user..."
                          placeholderTextColor={COLORS.textLight}
                          multiline
                          numberOfLines={3}
                          style={{
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 14,
                            color: COLORS.text,
                            backgroundColor: COLORS.bg,
                            textAlignVertical: "top",
                            fontFamily: "Inter_400Regular",
                            minHeight: 80,
                          }}
                        />
                        {hasUnsavedChanges && (
                          <TouchableOpacity
                            onPress={() => handleSaveNotes(item.blocked_id)}
                            disabled={updateNotesMutation.isPending}
                            style={{
                              marginTop: 8,
                              backgroundColor: COLORS.pink,
                              borderRadius: 8,
                              paddingVertical: 10,
                              paddingHorizontal: 16,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {updateNotesMutation.isPending ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="save-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }}>
                                  Save Notes
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

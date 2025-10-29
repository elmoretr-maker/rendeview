import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { useRouter } from "expo-router";

export default function Blockers() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["blockers"],
    queryFn: async () => {
      const res = await fetch("/api/blockers");
      if (!res.ok) throw new Error("Failed to load blockers");
      return res.json();
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockedId) => {
      const res = await fetch("/api/blockers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId }),
      });
      if (!res.ok) throw new Error("Failed to unblock");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blockers"] }),
    onError: () => Alert.alert("Error", "Could not unblock"),
  });

  const blockers = data?.blockers || [];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 12 }}>
        Blocked Users
      </Text>
      <TouchableOpacity
        onPress={() => {
          signOut();
          router.replace("/");
        }}
        accessibilityLabel="Sign Out"
        style={{
          alignSelf: "flex-end",
          marginBottom: 12,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: "#FEE2E2",
          borderWidth: 1,
          borderColor: "#FCA5A5",
        }}
      >
        <Text style={{ color: "#B91C1C", fontWeight: "700" }}>Sign Out</Text>
      </TouchableOpacity>
      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator />
        </View>
      ) : error ? (
        <Text>Error loading</Text>
      ) : (
        <FlatList
          data={blockers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: "#F3F4F6",
              }}
            >
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#EEE",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#EEE",
                  }}
                />
              )}
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontWeight: "600" }}>
                  {item.name || `User ${item.blocked_id}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => unblockMutation.mutate(item.blocked_id)}
                style={{
                  backgroundColor: "#ECE8FF",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#6855FF", fontWeight: "600" }}>
                  Unblock
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme, View, ActivityIndicator, Text } from "react-native";
import { Heart, MessageCircle, User, Search, Crown, Sparkles } from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import { useQuery } from "@tanstack/react-query";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { isReady } = useAuth();
  const bg = isDark ? "#121212" : "#FFFFFF";
  const border = isDark ? "#2A2A2A" : "#EAEAEA";
  const active = "#5B3BAF"; // Primary Accent
  const inactive = isDark ? "#9CA3AF" : "#2C3E50"; // Neutral Text

  // Query for new matches count (badge)
  const { data: newMatchesData } = useQuery({
    queryKey: ["newMatches"],
    queryFn: async () => {
      const res = await fetch("/api/new-matches");
      if (!res.ok) return { matches: [] };
      return res.json();
    },
    refetchInterval: 30000,
    enabled: isReady,
  });

  const newMatchCount = newMatchesData?.matches?.length || 0;

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={active} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopWidth: 1,
          borderTopColor: border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10,
        },
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: {
          fontSize: 12,
          paddingBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="discovery"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <Search color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="new-matches"
        options={{
          title: "New",
          tabBarIcon: ({ color }) => (
            <View style={{ position: "relative" }}>
              <Sparkles color={color} size={20} />
              {newMatchCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -8,
                    backgroundColor: "#00BFA6",
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {newMatchCount > 9 ? "9+" : newMatchCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="matches/index"
        options={{
          title: "Matches",
          tabBarIcon: ({ color }) => <Heart color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="membership"
        options={{
          title: "Member",
          tabBarIcon: ({ color }) => <Crown color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User color={color} size={20} />,
        }}
      />
      {/* Hidden dynamic routes to avoid tab bar bug */}
      <Tabs.Screen name="matches/likers" options={{ href: null }} />
      <Tabs.Screen name="messages/[matchId]" options={{ href: null }} />
    </Tabs>
  );
}

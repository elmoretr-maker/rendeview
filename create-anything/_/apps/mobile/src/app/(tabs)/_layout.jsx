import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme, View, ActivityIndicator } from "react-native";
import { Heart, MessageCircle, User, Search } from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { isReady } = useAuth();
  const bg = isDark ? "#121212" : "#FFFFFF";
  const border = isDark ? "#2A2A2A" : "#EAEAEA";
  const active = "#5B3BAF"; // Primary Accent
  const inactive = isDark ? "#9CA3AF" : "#2C3E50"; // Neutral Text

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
          tabBarIcon: ({ color }) => <Search color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="matches/index"
        options={{
          title: "Matches",
          tabBarIcon: ({ color }) => <Heart color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
      {/* Hidden dynamic routes to avoid tab bar bug */}
      <Tabs.Screen name="matches/likers" options={{ href: null }} />
      <Tabs.Screen name="messages/[matchId]" options={{ href: null }} />
    </Tabs>
  );
}

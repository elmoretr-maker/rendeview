import React from "react";
import { View, Text, Image, FlatList, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, getAbsoluteUrl } from "@/utils/api/apiFetch";

export default function Likers() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useQuery({
    queryKey: ["likers"],
    queryFn: async () => {
      const res = await apiFetch("/api/matches/likers");
      if (!res.ok) throw new Error("Failed to load likers");
      return res.json();
    },
  });

  const likers = data?.likers || [];

  return (
    <View style={{ flex:1, backgroundColor:'#FFFFFF', paddingTop: insets.top+12, paddingHorizontal:16 }}>
      <Text style={{ fontSize:24, fontWeight:'700', marginBottom:12 }}>Likers</Text>
      {isLoading ? (
        <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><ActivityIndicator/></View>
      ) : error ? (
        <Text>Error loading</Text>
      ) : (
        <FlatList
          data={likers}
          keyExtractor={(item, idx) => String(idx)}
          renderItem={({ item }) => (
            <View style={{ flexDirection:'row', alignItems:'center', paddingVertical:12, borderBottomWidth:1, borderColor:'#F3F4F6' }}>
              {item.user.photo ? (
                <Image source={{ uri: getAbsoluteUrl(item.user.photo) }} style={{ width:48, height:48, borderRadius:24, backgroundColor:'#EEE' }} />
              ) : (
                <View style={{ width:48, height:48, borderRadius:24, backgroundColor:'#EEE' }} />
              )}
              <View style={{ marginLeft:12 }}>
                <Text style={{ fontWeight:'600' }}>{item.user.name || `User ${item.user.id}`}</Text>
                <Text style={{ color:'#6B7280', fontSize:12 }}>liked you</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

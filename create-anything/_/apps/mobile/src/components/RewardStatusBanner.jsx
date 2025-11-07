import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: '#5B3BAF',
  text: '#2C3E50',
};

export function RewardStatusBanner() {
  const [rewardStatus, setRewardStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loaded, errorFont] = useFonts({ Inter_400Regular, Inter_600SemiBold });

  useEffect(() => {
    fetchRewardStatus();
  }, []);

  const fetchRewardStatus = async () => {
    try {
      const res = await fetch('/api/messages/reward-status');
      if (res.ok) {
        const data = await res.json();
        setRewardStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch reward status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !loaded) return null;
  if (!rewardStatus) return null;

  const {
    hasActiveReward,
    videoCallsThisMonth,
    remainingCallsNeeded,
    daysUntilMonthEnd,
  } = rewardStatus;

  const showWarning = !hasActiveReward && remainingCallsNeeded > 0 && daysUntilMonthEnd <= 7;

  if (hasActiveReward) {
    return (
      <View style={styles.bannerActive}>
        <Text style={styles.emojiActive}>🎉</Text>
        <View style={styles.textContainer}>
          <Text style={styles.titleActive}>50% Bonus Active!</Text>
          <Text style={styles.subtitleActive}>
            {videoCallsThisMonth}/3 video calls this month. Keep dating to maintain reward pricing!
          </Text>
        </View>
      </View>
    );
  }

  if (showWarning) {
    return (
      <View style={styles.bannerWarning}>
        <Text style={styles.emojiWarning}>⚠️</Text>
        <View style={styles.textContainer}>
          <Text style={styles.titleWarning}>Complete {remainingCallsNeeded} more video {remainingCallsNeeded === 1 ? 'call' : 'calls'}!</Text>
          <Text style={styles.subtitleWarning}>
            {daysUntilMonthEnd} {daysUntilMonthEnd === 1 ? 'day' : 'days'} left to unlock 50% bonus credits
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bannerInactive}>
      <Text style={styles.emojiInactive}>📹</Text>
      <View style={styles.textContainer}>
        <Text style={styles.titleInactive}>Complete 3 video calls for 50% bonus!</Text>
        <Text style={styles.subtitleInactive}>
          Progress: {videoCallsThisMonth}/3 video calls this month
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4EDDA',
    borderWidth: 1,
    borderColor: '#28A745',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  bannerWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFC107',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  bannerInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  emojiActive: {
    fontSize: 32,
    marginRight: 12,
  },
  emojiWarning: {
    fontSize: 32,
    marginRight: 12,
  },
  emojiInactive: {
    fontSize: 32,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleActive: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitleActive: {
    fontSize: 12,
    color: '#155724',
    opacity: 0.8,
    fontFamily: 'Inter_400Regular',
  },
  titleWarning: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitleWarning: {
    fontSize: 12,
    color: '#856404',
    opacity: 0.8,
    fontFamily: 'Inter_400Regular',
  },
  titleInactive: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitleInactive: {
    fontSize: 12,
    color: '#0D47A1',
    opacity: 0.8,
    fontFamily: 'Inter_400Regular',
  },
});

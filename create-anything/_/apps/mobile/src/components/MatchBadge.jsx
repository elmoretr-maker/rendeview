import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function MatchBadge({ size = 'md' }) {
  const sizes = {
    sm: {
      starSize: 12,
      fontSize: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4
    },
    md: {
      starSize: 14,
      fontSize: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 6
    },
    lg: {
      starSize: 16,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8
    }
  };

  const config = sizes[size] || sizes.md;

  return (
    <LinearGradient
      colors={['#FFD700', '#FFA500']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
        }
      ]}
    >
      <View style={[styles.content, { gap: config.gap }]}>
        <Star 
          size={config.starSize} 
          fill="#FFFFFF" 
          color="#FFFFFF" 
          strokeWidth={2}
        />
        <Text style={[styles.text, { fontSize: config.fontSize }]}>
          MATCH
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

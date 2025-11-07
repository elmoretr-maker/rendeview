import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { Star } from 'lucide-react';

export default function MatchBadge({ size = 'md' }) {
  const sizes = {
    sm: {
      starSize: 12,
      fontSize: '10px',
      px: 2,
      py: 0.5,
      gap: 1
    },
    md: {
      starSize: 14,
      fontSize: '12px',
      px: 2,
      py: 1,
      gap: 1.5
    },
    lg: {
      starSize: 16,
      fontSize: '14px',
      px: 3,
      py: 1,
      gap: 2
    }
  };

  const config = sizes[size] || sizes.md;

  return (
    <Flex
      align="center"
      gap={config.gap}
      bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
      px={config.px}
      py={config.py}
      borderRadius="full"
      shadow="sm"
      display="inline-flex"
    >
      <Star 
        size={config.starSize} 
        fill="#FFFFFF" 
        color="#FFFFFF" 
        strokeWidth={2}
      />
      <Text 
        fontSize={config.fontSize} 
        fontWeight="bold" 
        color="white"
        lineHeight="1"
        letterSpacing="0.5px"
      >
        MATCH
      </Text>
    </Flex>
  );
}

import React from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { getAbsoluteUrl } from '@/utils/api/apiFetch';

/**
 * AuthenticatedImage component that uses expo-image to load images
 * with proper authentication headers.
 * 
 * This solves the issue where React Native Image doesn't send cookies
 * for authenticated requests. expo-image natively supports headers and
 * automatically sends cookies via native image loaders (SDWebImage on iOS,
 * Glide on Android).
 */
export default function AuthenticatedImage({ source, style, contentFit = 'cover', ...props }) {
  if (!source?.uri) {
    return <View style={[style, { backgroundColor: '#EEE' }]} />;
  }

  const absoluteUrl = getAbsoluteUrl(source.uri);
  
  // Build headers for authenticated requests
  const headers = {
    'Cache-Control': 'no-cache',
  };

  return (
    <Image
      {...props}
      source={{ 
        uri: absoluteUrl,
        headers,
      }}
      style={style}
      contentFit={contentFit}
      cachePolicy="none"
      transition={200}
      placeholderContentFit="cover"
    />
  );
}

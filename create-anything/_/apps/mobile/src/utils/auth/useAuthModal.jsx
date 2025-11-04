import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { create } from 'zustand';
import { AuthWebView } from './AuthWebView';
import { useAuthStore, useAuthModal } from './store';


/**
 * This component renders a modal for authentication purposes.
 * To show it programmatically, you should either use the `useRequireAuth` hook or the `useAuthModal` hook.
 *
 * @example
 * ```js
 * import { useAuthModal } from '@/utils/useAuthModal';
 * function MyComponent() {
 * const { open } = useAuthModal();
 * return <Button title="Login" onPress={() => open({ mode: 'signin' })} />;
 * }
 * ```
 *
 * @example
 * ```js
 * import { useRequireAuth } from '@/utils/useAuth';
 * function MyComponent() {
 *   // automatically opens the auth modal if the user is not authenticated
 *   useRequireAuth();
 *   return <Text>Protected Content</Text>;
 * }
 *
 */
export const AuthModal = () => {
  const { isOpen, mode } = useAuthModal();
  const { auth } = useAuthStore();

  const snapPoints = useMemo(() => ['100%'], []);
  const proxyURL = process.env.EXPO_PUBLIC_PROXY_BASE_URL;
  const baseURL = process.env.EXPO_PUBLIC_BASE_URL;
  
  // Debug logging
  useEffect(() => {
    if (isOpen && !auth) {
      console.log('[AuthModal] Modal should be visible');
      console.log('[AuthModal] mode:', mode);
      console.log('[AuthModal] proxyURL:', proxyURL ? 'SET' : 'NOT SET');
      console.log('[AuthModal] baseURL:', baseURL ? 'SET' : 'NOT SET');
    }
  }, [isOpen, auth, mode, proxyURL, baseURL]);
  
  // If environment variables are missing, show error message
  if (!proxyURL || !baseURL) {
    console.error('[AuthModal] Missing environment variables:', { proxyURL, baseURL });
    
    return (
      <Modal
        visible={isOpen && !auth}
        transparent={true}
        animationType="slide"
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#E74C3C' }}>
            Configuration Error
          </Text>
          <Text style={{ textAlign: 'center', marginBottom: 20, color: '#2C3E50' }}>
            Missing environment variables. Please check your app configuration.
          </Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 8, color: '#2C3E50' }}>
            EXPO_PUBLIC_PROXY_BASE_URL: {proxyURL || 'NOT SET'}
          </Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 20, color: '#2C3E50' }}>
            EXPO_PUBLIC_BASE_URL: {baseURL || 'NOT SET'}
          </Text>
          <TouchableOpacity
            onPress={() => useAuthModal.getState().close()}
            style={{ backgroundColor: '#5B3BAF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={isOpen && !auth}
      transparent={true}
      animationType="slide"
      onRequestClose={() => useAuthModal.getState().close()}
    >
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          width: '100%',
          backgroundColor: '#fff',
          padding: 0,
        }}
      >
        <AuthWebView
          mode={mode}
          proxyURL={proxyURL}
          baseURL={baseURL}
        />
      </View>
    </Modal>
  );
};

export default useAuthModal;
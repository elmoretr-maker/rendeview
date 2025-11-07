import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/utils/auth/useUser';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: '#5B3BAF',
  text: '#2C3E50',
  error: '#E74C3C',
};

const TIER_DURATIONS = {
  free: 10,
  casual: 15,
  dating: 30,
  business: 60,
};

export function VideoMessageRecorder({ visible, conversationId, onClose, onSent }) {
  const { user } = useUser();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [quotaData, setQuotaData] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [loaded, errorFont] = useFonts({ Inter_400Regular, Inter_600SemiBold });

  const cameraRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const tier = user?.membership_tier || 'free';
  const maxDuration = TIER_DURATIONS[tier] || 10;

  useEffect(() => {
    if (visible) {
      fetchQuota();
      requestPermissions();
    } else {
      cleanup();
    }
  }, [visible]);

  const requestPermissions = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera Access Required', 'Please enable camera access to record videos.');
        onClose();
        return;
      }
    }
    if (!micPermission?.granted) {
      const result = await requestMicPermission();
      if (!result.granted) {
        Alert.alert('Microphone Access Required', 'Please enable microphone access to record videos.');
        onClose();
        return;
      }
    }
  };

  const fetchQuota = async () => {
    try {
      setLoadingQuota(true);
      const res = await fetch(`/api/messages/video-messages/quota?conversationId=${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setQuotaData(data);
      } else {
        Alert.alert('Error', 'Failed to fetch video quota');
        onClose();
      }
    } catch (err) {
      console.error('Failed to fetch video quota:', err);
      Alert.alert('Error', 'Failed to check video quota');
      onClose();
    } finally {
      setLoadingQuota(false);
    }
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setVideoUri(null);
    setRecording(false);
    setTimeRemaining(0);
  };

  const startRecording = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setRecording(true);
      setTimeRemaining(maxDuration);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = maxDuration - elapsed;
        
        if (remaining <= 0) {
          stopRecording();
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration,
      });

      if (video && video.uri) {
        setVideoUri(video.uri);
      }
    } catch (err) {
      console.error('Recording failed:', err);
      Alert.alert('Error', 'Failed to record video');
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && recording) {
      try {
        cameraRef.current.stopRecording();
      } catch (err) {
        console.error('Failed to stop recording:', err);
      }
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const reRecord = () => {
    setVideoUri(null);
    setTimeRemaining(0);
  };

  const sendVideoMessage = async () => {
    if (!videoUri) {
      Alert.alert('Error', 'No video to send');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: `video-${Date.now()}.mp4`,
      });
      formData.append('conversationId', conversationId);

      const res = await fetch('/api/messages/video-messages/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to upload video');
      }

      Alert.alert('Success', 'Video message sent!');
      if (onSent) onSent();
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
      Alert.alert('Error', err.message || 'Failed to send video message');
    } finally {
      setUploading(false);
    }
  };

  if (!visible) return null;
  if (!loaded && !errorFont) return null;

  const canRecord = quotaData?.canSend && quotaData?.remainingToday > 0;
  const { remainingToday = 0, dailyLimit = 0 } = quotaData || {};

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Record Video Message</Text>
          <View style={{ width: 28 }} />
        </View>

        {loadingQuota ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : !canRecord ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>🚫</Text>
            <Text style={styles.errorTitle}>Daily Limit Reached</Text>
            <Text style={styles.errorText}>
              You've used all {dailyLimit} video messages today. Come back tomorrow!
            </Text>
            <TouchableOpacity style={styles.errorButton} onPress={onClose}>
              <Text style={styles.errorButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        ) : videoUri ? (
          <View style={styles.previewContainer}>
            <Video
              source={{ uri: videoUri }}
              style={styles.videoPreview}
              useNativeControls
              shouldPlay
              isLooping
            />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.reRecordButton]}
                onPress={reRecord}
              >
                <Text style={styles.actionButtonText}>🔄 Re-record</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.sendButton]}
                onPress={sendVideoMessage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.sendButtonText}>📤 Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="front"
              mode="video"
            />

            {/* Recording indicator */}
            {recording && (
              <View style={styles.recordingOverlay}>
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>Recording</Text>
                </View>
                <Text style={styles.timerText}>{timeRemaining}s remaining</Text>
              </View>
            )}

            {/* Info card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                📹 Max duration: {maxDuration} seconds ({tier} tier)
              </Text>
              <Text style={styles.infoText}>
                💬 {remainingToday}/{dailyLimit} video messages today
              </Text>
            </View>

            {/* Record button */}
            <View style={styles.recordButtonContainer}>
              {recording ? (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopRecording}
                >
                  <View style={styles.stopIcon} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={startRecording}
                >
                  <View style={styles.recordIcon} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  errorText: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter_400Regular',
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  recordingOverlay: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  infoCard: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
    fontFamily: 'Inter_400Regular',
  },
  recordButtonContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  recordIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E74C3C',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  stopIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 4,
  },
  previewContainer: {
    flex: 1,
  },
  videoPreview: {
    flex: 1,
    backgroundColor: 'black',
  },
  previewActions: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reRecordButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  sendButton: {
    backgroundColor: COLORS.primary,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
});

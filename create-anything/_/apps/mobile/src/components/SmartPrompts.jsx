import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

const COLORS = {
  primary: '#5B3BAF',
  secondary: '#00BFA6',
  warning: '#FFC107',
  text: '#2C3E50',
  cardBg: '#F3F4F6',
};

export function LongMessagePrompt({ visible, onKeepTyping, onScheduleVideo, onDismiss }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.content}>
            <Text style={styles.emoji}>💬</Text>
            <Text style={styles.title}>Looks like you have a lot to say...</Text>
            <Text style={styles.subtitle}>
              Video calls let you connect more authentically than text. Why not schedule one?
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onScheduleVideo}
            >
              <Text style={styles.primaryButtonText}>📹 Schedule Video Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onKeepTyping}
            >
              <Text style={styles.secondaryButtonText}>Keep Typing (costs 1 credit)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function VideoSchedulingNudge({ visible, onScheduleVideo, onDismiss, messagesRemaining }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.content}>
            <Text style={styles.emoji}>📹</Text>
            <Text style={styles.title}>Getting to know each other?</Text>
            <Text style={styles.subtitle}>
              You've sent 8 messages to this person. Schedule a video call to unlock unlimited messaging!
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{messagesRemaining} messages remaining today</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onScheduleVideo}
            >
              <Text style={styles.primaryButtonText}>📹 Schedule Video Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function DecayModePrompt({ visible, onScheduleVideo, onDismiss }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.content}>
            <Text style={styles.emoji}>⏰</Text>
            <Text style={styles.title}>Time to video date!</Text>
            <Text style={styles.subtitle}>
              You've been chatting for 3+ days without scheduling a video call. Message limit reduced to 2/day.
            </Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                💡 Complete a video call to restore full messaging access
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onScheduleVideo}
            >
              <Text style={styles.primaryButtonText}>📹 Schedule Video Call Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>I'll wait until tomorrow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function PreVideoLimitReached({ visible, onScheduleVideo, onBuyCredits, onDismiss }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.content}>
            <Text style={styles.emoji}>🚫</Text>
            <Text style={styles.title}>Daily message limit reached</Text>
            <Text style={styles.subtitle}>
              You've sent 10 messages to this person today. Complete a video call to unlock more messages!
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ✨ After your first video call: Unlock bonus messages based on your tier (Casual: +25, Dating: +50, Business: +100)
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onScheduleVideo}
            >
              <Text style={styles.primaryButtonText}>📹 Schedule Video Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onBuyCredits}
            >
              <Text style={styles.secondaryButtonText}>💳 Buy Message Credits</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Wait until tomorrow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function RewardWarningPrompt({ visible, remainingCalls, daysRemaining, onDismiss }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.content}>
            <Text style={styles.emoji}>⚠️</Text>
            <Text style={styles.title}>Don't lose your 50% bonus!</Text>
            <Text style={styles.subtitle}>
              Complete {remainingCalls} more video {remainingCalls === 1 ? 'call' : 'calls'} in the next {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} to keep your reward pricing.
            </Text>
            <View style={styles.warningBox}>
              <Text style={[styles.warningText, { fontWeight: 'bold', marginBottom: 8 }]}>
                💰 Reward Pricing = 50% More Credits
              </Text>
              <Text style={[styles.warningText, { fontSize: 11 }]}>
                $1.99 = 30 credits (instead of 20){'\n'}
                $4.99 = 75 credits (instead of 50){'\n'}
                $9.99 = 150 credits (instead of 100)
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onDismiss}
            >
              <Text style={styles.primaryButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
  },
  badge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
    fontFamily: 'Inter_600SemiBold',
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    width: '100%',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    fontFamily: 'Inter_400Regular',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    width: '100%',
  },
  infoText: {
    fontSize: 12,
    color: '#0D47A1',
    fontFamily: 'Inter_400Regular',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
  },
  secondaryButton: {
    backgroundColor: COLORS.cardBg,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
  },
  dismissButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: COLORS.text,
    fontSize: 14,
    opacity: 0.6,
    fontFamily: 'Inter_400Regular',
  },
});

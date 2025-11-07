import React from 'react';

const COLORS = {
  primary: '#5B3BAF',
  secondary: '#00BFA6',
  warning: '#FFC107',
  text: '#2C3E50',
  cardBg: '#F3F4F6',
};

/**
 * LongMessagePrompt
 * Shown when user types 280+ characters
 * "Looks like you have a lot to say..."
 */
export function LongMessagePrompt({ onKeepTyping, onScheduleVideo, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-4">
          <span className="text-5xl mb-3 block">💬</span>
          <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>
            Looks like you have a lot to say...
          </h3>
          <p className="text-sm opacity-70" style={{ color: COLORS.text }}>
            Video calls let you connect more authentically than text. Why not schedule one?
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={onScheduleVideo}
            className="w-full px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: COLORS.primary }}
          >
            📹 Schedule Video Call
          </button>
          <button
            onClick={onKeepTyping}
            className="w-full px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
          >
            Keep Typing (costs 1 credit)
          </button>
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2 text-sm opacity-60 hover:opacity-100 transition-all"
            style={{ color: COLORS.text }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * VideoSchedulingNudge
 * Shown at message 8 (before hitting 10 message limit)
 * "Getting to know each other? Schedule video!"
 */
export function VideoSchedulingNudge({ onScheduleVideo, onDismiss, messagesRemaining }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-4">
          <span className="text-5xl mb-3 block">📹</span>
          <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>
            Getting to know each other?
          </h3>
          <p className="text-sm opacity-70 mb-3" style={{ color: COLORS.text }}>
            You've sent 8 messages to this person. Schedule a video call to unlock unlimited messaging!
          </p>
          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#FFF3CD', color: '#856404' }}>
            {messagesRemaining} messages remaining today
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={onScheduleVideo}
            className="w-full px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: COLORS.primary }}
          >
            📹 Schedule Video Call
          </button>
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2 text-sm opacity-60 hover:opacity-100 transition-all"
            style={{ color: COLORS.text }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * DecayModePrompt
 * Shown when conversation is in decay (no video after 3 days)
 * "Schedule a video call to unlock more messages!"
 */
export function DecayModePrompt({ onScheduleVideo, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-4">
          <span className="text-5xl mb-3 block">⏰</span>
          <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>
            Time to video date!
          </h3>
          <p className="text-sm opacity-70 mb-3" style={{ color: COLORS.text }}>
            You've been chatting for 3+ days without scheduling a video call. Message limit reduced to 2/day.
          </p>
          <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#FFF3CD', border: '1px solid ' + COLORS.warning }}>
            <p className="text-xs font-medium" style={{ color: '#856404' }}>
              💡 Complete a video call to restore full messaging access
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={onScheduleVideo}
            className="w-full px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: COLORS.primary }}
          >
            📹 Schedule Video Call Now
          </button>
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2 text-sm opacity-60 hover:opacity-100 transition-all"
            style={{ color: COLORS.text }}
          >
            I'll wait until tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PreVideoLimitReached
 * Shown when user hits 10 message limit before completing video
 */
export function PreVideoLimitReached({ onScheduleVideo, onBuyCredits, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-4">
          <span className="text-5xl mb-3 block">🚫</span>
          <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>
            Daily message limit reached
          </h3>
          <p className="text-sm opacity-70 mb-3" style={{ color: COLORS.text }}>
            You've sent 10 messages to this person today. Complete a video call to unlock more messages!
          </p>
          <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#E3F2FD', border: '1px solid #2196F3' }}>
            <p className="text-xs font-medium" style={{ color: '#0D47A1' }}>
              ✨ After your first video call: Unlock bonus messages based on your tier (Casual: +25, Dating: +50, Business: +100)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={onScheduleVideo}
            className="w-full px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: COLORS.primary }}
          >
            📹 Schedule Video Call
          </button>
          <button
            onClick={onBuyCredits}
            className="w-full px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
          >
            💳 Buy Message Credits
          </button>
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2 text-sm opacity-60 hover:opacity-100 transition-all"
            style={{ color: COLORS.text }}
          >
            Wait until tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * RewardWarningPrompt
 * Shown 7 days before month end if user hasn't completed 3 video calls
 */
export function RewardWarningPrompt({ remainingCalls, daysRemaining, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-4">
          <span className="text-5xl mb-3 block">⚠️</span>
          <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>
            Don't lose your 50% bonus!
          </h3>
          <p className="text-sm opacity-70 mb-3" style={{ color: COLORS.text }}>
            Complete {remainingCalls} more video {remainingCalls === 1 ? 'call' : 'calls'} in the next {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} to keep your reward pricing.
          </p>
          <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#FFF3CD', border: '1px solid ' + COLORS.warning }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#856404' }}>
              💰 Reward Pricing = 50% More Credits
            </p>
            <p className="text-xs opacity-80" style={{ color: '#856404' }}>
              $1.99 = 30 credits (instead of 20)<br/>
              $4.99 = 75 credits (instead of 50)<br/>
              $9.99 = 150 credits (instead of 100)
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all"
          style={{ backgroundColor: COLORS.primary }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

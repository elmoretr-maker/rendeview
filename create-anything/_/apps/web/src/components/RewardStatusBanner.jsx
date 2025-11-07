import React, { useEffect, useState } from 'react';

const COLORS = {
  primary: '#5B3BAF',
  secondary: '#00BFA6',
  warning: '#FFC107',
  success: '#28A745',
  text: '#2C3E50',
};

/**
 * RewardStatusBanner
 * 
 * Displays rolling monthly reward status for message credits:
 * - Shows if user has active 50% bonus
 * - Shows progress toward 3 video calls this month
 * - Shows 7-day warning if requirement not met
 */
export function RewardStatusBanner({ compact = false }) {
  const [rewardStatus, setRewardStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchRewardStatus = async () => {
      try {
        const res = await fetch('/api/rewards/status');
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

    fetchRewardStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRewardStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !rewardStatus || dismissed) {
    return null;
  }

  const {
    hasActiveReward,
    videoCallsThisMonth,
    requiredCalls,
    remainingCalls,
    daysUntilMonthEnd,
    showWarning,
    warningMessage
  } = rewardStatus;

  // Don't show if user has reward and no warning
  if (hasActiveReward && !showWarning) {
    return null;
  }

  // Compact version (for navigation bar or small spaces)
  if (compact) {
    return (
      <div 
        className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
        style={{ 
          backgroundColor: hasActiveReward ? '#D4EDDA' : '#FFF3CD',
          border: `1px solid ${hasActiveReward ? COLORS.success : COLORS.warning}`
        }}
      >
        <span>{hasActiveReward ? '🎉' : '📹'}</span>
        <span style={{ color: hasActiveReward ? '#155724' : '#856404' }}>
          {hasActiveReward 
            ? '50% Bonus Active!' 
            : `${videoCallsThisMonth}/${requiredCalls} video calls`
          }
        </span>
      </div>
    );
  }

  // Warning banner (7 days before month end)
  if (showWarning) {
    return (
      <div 
        className="p-4 rounded-lg flex items-start justify-between gap-3"
        style={{ backgroundColor: '#FFF3CD', border: '1px solid ' + COLORS.warning }}
      >
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-sm mb-1" style={{ color: '#856404' }}>
              Reward Status Expiring Soon!
            </p>
            <p className="text-xs" style={{ color: '#856404' }}>
              {warningMessage}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs opacity-60 hover:opacity-100"
          style={{ color: '#856404' }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Progress banner (not at warning yet)
  return (
    <div 
      className="p-4 rounded-lg"
      style={{ backgroundColor: '#E3F2FD', border: '1px solid #2196F3' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">📹</span>
        <div className="flex-1">
          <p className="font-bold text-sm mb-2" style={{ color: '#0D47A1' }}>
            Unlock 50% Message Credit Bonus
          </p>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${(videoCallsThisMonth / requiredCalls) * 100}%`,
                  backgroundColor: COLORS.primary
                }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: '#0D47A1' }}>
              {videoCallsThisMonth}/{requiredCalls}
            </span>
          </div>
          <p className="text-xs opacity-80" style={{ color: '#0D47A1' }}>
            Complete {remainingCalls} more video {remainingCalls === 1 ? 'call' : 'calls'} this month to get 50% bonus on all message credit purchases!
          </p>
        </div>
      </div>
    </div>
  );
}

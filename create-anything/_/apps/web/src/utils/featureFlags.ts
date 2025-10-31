/**
 * Feature Flag System
 * Allows critical features to be quickly disabled via environment variables
 * 
 * Usage:
 * - Set FEATURE_FLAG_<NAME>=false in .env to disable a feature
 * - Features are enabled by default unless explicitly disabled
 * 
 * Examples:
 * - FEATURE_FLAG_SCHEDULED_DOWNGRADES=false
 * - FEATURE_FLAG_VIDEO_EXTENSIONS=false
 * - FEATURE_FLAG_DAILY_PICKS=false
 */

export enum FeatureFlag {
  // Subscription Features
  SCHEDULED_DOWNGRADES = 'SCHEDULED_DOWNGRADES',
  PAYMENT_CHECKOUT = 'PAYMENT_CHECKOUT',
  SUBSCRIPTION_WEBHOOKS = 'SUBSCRIPTION_WEBHOOKS',
  
  // Video Call Features
  VIDEO_EXTENSIONS = 'VIDEO_EXTENSIONS',
  VIDEO_ROOM_CREATION = 'VIDEO_ROOM_CREATION',
  
  // Matching Features
  DAILY_PICKS = 'DAILY_PICKS',
  REVERSE_DISCOVERY = 'REVERSE_DISCOVERY',
  SMART_MATCHING = 'SMART_MATCHING',
  
  // Safety Features
  BLOCKING_USERS = 'BLOCKING_USERS',
  REPORTING_SYSTEM = 'REPORTING_SYSTEM',
  
  // Communication Features
  MESSAGING = 'MESSAGING',
  SCHEDULING = 'SCHEDULING',
}

interface FeatureFlagConfig {
  enabled: boolean;
  reason?: string;
  disabledAt?: Date;
}

class FeatureFlagManager {
  private flags: Map<FeatureFlag, FeatureFlagConfig> = new Map();

  constructor() {
    this.initializeFlags();
  }

  /**
   * Initialize feature flags from environment variables
   */
  private initializeFlags(): void {
    Object.values(FeatureFlag).forEach((flag) => {
      const envKey = `FEATURE_FLAG_${flag}`;
      const envValue = process.env[envKey];
      
      // Feature is enabled by default unless explicitly set to 'false'
      const enabled = envValue !== 'false' && envValue !== '0';
      
      this.flags.set(flag, {
        enabled,
        reason: enabled ? undefined : `Disabled via ${envKey}`,
        disabledAt: enabled ? undefined : new Date(),
      });
    });
  }

  /**
   * Check if a feature is enabled
   * @param flag The feature flag to check
   * @returns true if feature is enabled, false otherwise
   */
  isEnabled(flag: FeatureFlag): boolean {
    const config = this.flags.get(flag);
    return config?.enabled ?? true; // Default to enabled if not found
  }

  /**
   * Check if a feature is disabled
   * @param flag The feature flag to check
   * @returns true if feature is disabled, false otherwise
   */
  isDisabled(flag: FeatureFlag): boolean {
    return !this.isEnabled(flag);
  }

  /**
   * Get feature flag configuration
   * @param flag The feature flag to get config for
   * @returns The feature flag configuration
   */
  getConfig(flag: FeatureFlag): FeatureFlagConfig {
    return this.flags.get(flag) ?? { enabled: true };
  }

  /**
   * Get all feature flags and their status
   * @returns Map of all feature flags and their configurations
   */
  getAllFlags(): Map<FeatureFlag, FeatureFlagConfig> {
    return new Map(this.flags);
  }

  /**
   * Temporarily enable a feature (runtime only, not persisted)
   * Use this for testing or emergency overrides
   * @param flag The feature flag to enable
   */
  enable(flag: FeatureFlag): void {
    this.flags.set(flag, {
      enabled: true,
      reason: 'Enabled at runtime',
    });
  }

  /**
   * Temporarily disable a feature (runtime only, not persisted)
   * Use this for emergency feature shutdowns
   * @param flag The feature flag to disable
   * @param reason Optional reason for disabling
   */
  disable(flag: FeatureFlag, reason?: string): void {
    this.flags.set(flag, {
      enabled: false,
      reason: reason || 'Disabled at runtime',
      disabledAt: new Date(),
    });
  }

  /**
   * Get status message for a disabled feature
   * @param flag The feature flag
   * @returns User-friendly message explaining why feature is disabled
   */
  getDisabledMessage(flag: FeatureFlag): string {
    const config = this.getConfig(flag);
    
    if (config.enabled) {
      return 'Feature is currently enabled';
    }

    const messages: Record<FeatureFlag, string> = {
      [FeatureFlag.SCHEDULED_DOWNGRADES]: 'Scheduled downgrades are temporarily unavailable. Please try again later or contact support.',
      [FeatureFlag.PAYMENT_CHECKOUT]: 'Payment processing is temporarily unavailable. Please try again later.',
      [FeatureFlag.SUBSCRIPTION_WEBHOOKS]: 'Subscription updates are temporarily unavailable.',
      [FeatureFlag.VIDEO_EXTENSIONS]: 'Video call extensions are temporarily unavailable.',
      [FeatureFlag.VIDEO_ROOM_CREATION]: 'Video call creation is temporarily unavailable. Please try again later.',
      [FeatureFlag.DAILY_PICKS]: 'Daily picks are temporarily unavailable.',
      [FeatureFlag.REVERSE_DISCOVERY]: 'Profile viewers feature is temporarily unavailable.',
      [FeatureFlag.SMART_MATCHING]: 'Smart matching is temporarily unavailable.',
      [FeatureFlag.BLOCKING_USERS]: 'User blocking is temporarily unavailable.',
      [FeatureFlag.REPORTING_SYSTEM]: 'Reporting system is temporarily unavailable.',
      [FeatureFlag.MESSAGING]: 'Messaging is temporarily unavailable. Please try again later.',
      [FeatureFlag.SCHEDULING]: 'Meeting scheduling is temporarily unavailable.',
    };

    return messages[flag] || 'This feature is temporarily unavailable.';
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

/**
 * Helper function to check if a feature is enabled
 * @param flag The feature flag to check
 * @returns true if enabled, false otherwise
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags.isEnabled(flag);
}

/**
 * Helper function to check if a feature is disabled
 * @param flag The feature flag to check
 * @returns true if disabled, false otherwise
 */
export function isFeatureDisabled(flag: FeatureFlag): boolean {
  return featureFlags.isDisabled(flag);
}

/**
 * Middleware function for API routes to check feature flags
 * Returns a 503 response if feature is disabled
 * @param flag The feature flag to check
 * @returns Response object if feature is disabled, null if enabled
 */
export function checkFeatureFlag(flag: FeatureFlag): Response | null {
  if (featureFlags.isDisabled(flag)) {
    return Response.json(
      {
        error: 'Feature temporarily unavailable',
        message: featureFlags.getDisabledMessage(flag),
        code: 'FEATURE_DISABLED',
      },
      { status: 503 }
    );
  }
  return null;
}

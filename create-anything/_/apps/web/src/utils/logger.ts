/**
 * Structured Logging System
 * Implements comprehensive logging for critical business events
 * to aid in production debugging and monitoring
 * 
 * Usage:
 * logger.info('User upgraded subscription', { userId, tier });
 * logger.error('Payment failed', { userId, error });
 * logger.business('match_created', { userId1, userId2 });
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  BUSINESS = 'business', // Special level for business events
}

export enum BusinessEvent {
  // Subscription Events
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPGRADED = 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED = 'subscription_downgraded',
  SUBSCRIPTION_CANCELED = 'subscription_canceled',
  SCHEDULED_DOWNGRADE_SET = 'scheduled_downgrade_set',
  SCHEDULED_DOWNGRADE_CANCELED = 'scheduled_downgrade_canceled',
  
  // Payment Events
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  
  // Matching Events
  MATCH_CREATED = 'match_created',
  MATCH_UNLIKED = 'match_unliked',
  PROFILE_LIKED = 'profile_liked',
  PROFILE_PASSED = 'profile_passed',
  
  // Video Call Events
  VIDEO_CALL_STARTED = 'video_call_started',
  VIDEO_CALL_ENDED = 'video_call_ended',
  VIDEO_CALL_EXTENDED = 'video_call_extended',
  VIDEO_ROOM_CREATED = 'video_room_created',
  
  // Message Events
  MESSAGE_SENT = 'message_sent',
  CONVERSATION_STARTED = 'conversation_started',
  
  // Safety Events
  USER_BLOCKED = 'user_blocked',
  USER_REPORTED = 'user_reported',
  USER_FLAGGED_FOR_ADMIN = 'user_flagged_for_admin',
  ACCOUNT_SUSPENDED = 'account_suspended',
  
  // Profile Events
  PROFILE_CREATED = 'profile_created',
  PROFILE_UPDATED = 'profile_updated',
  MEDIA_UPLOADED = 'media_uploaded',
  
  // Scheduling Events
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_CONFIRMED = 'meeting_confirmed',
  MEETING_CANCELED = 'meeting_canceled',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
  userId?: number | string;
  requestId?: string;
  event?: BusinessEvent;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Format and output log entry
   */
  private log(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);
    
    // In development, use console with colors
    if (this.isDevelopment) {
      this.consoleLog(entry.level, formatted);
    } else {
      // In production, output JSON for log aggregation
      console.log(JSON.stringify(formatted));
    }
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry): LogEntry {
    return {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Console log with colors for development
   */
  private consoleLog(level: LogLevel, entry: LogEntry): void {
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.BUSINESS]: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    console.log(
      `${color}[${level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}`,
      entry.data ? entry.data : ''
    );
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: Record<string, any>): void {
    if (!this.isDevelopment) return; // Only log debug in development
    
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      data,
    });
  }

  /**
   * Info level logging
   */
  info(message: string, data?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      data,
    });
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      data,
    });
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | any, data?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      data,
    };

    if (error instanceof Error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? undefined : error.stack,
      };
    } else if (error) {
      logEntry.data = { ...logEntry.data, error };
    }

    this.log(logEntry);
  }

  /**
   * Business event logging
   * Special logging for critical business events
   */
  business(event: BusinessEvent, data?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.BUSINESS,
      message: `Business Event: ${event}`,
      event,
      data,
    });
  }

  /**
   * Subscription event logging
   */
  logSubscriptionEvent(
    event: BusinessEvent,
    userId: number | string,
    tier: string,
    additionalData?: Record<string, any>
  ): void {
    this.business(event, {
      userId,
      tier,
      ...additionalData,
    });
  }

  /**
   * Payment event logging
   */
  logPaymentEvent(
    event: BusinessEvent,
    userId: number | string,
    amount: number,
    currency: string = 'usd',
    additionalData?: Record<string, any>
  ): void {
    this.business(event, {
      userId,
      amount,
      currency,
      ...additionalData,
    });
  }

  /**
   * Match event logging
   */
  logMatchEvent(
    event: BusinessEvent,
    userId: number | string,
    targetUserId: number | string,
    additionalData?: Record<string, any>
  ): void {
    this.business(event, {
      userId,
      targetUserId,
      ...additionalData,
    });
  }

  /**
   * Video call event logging
   */
  logVideoCallEvent(
    event: BusinessEvent,
    sessionId: number | string,
    userId: number | string,
    additionalData?: Record<string, any>
  ): void {
    this.business(event, {
      sessionId,
      userId,
      ...additionalData,
    });
  }

  /**
   * Safety event logging
   */
  logSafetyEvent(
    event: BusinessEvent,
    userId: number | string,
    targetUserId?: number | string,
    reason?: string,
    additionalData?: Record<string, any>
  ): void {
    this.business(event, {
      userId,
      targetUserId,
      reason,
      ...additionalData,
    });
  }
}

// Singleton instance
export const logger = new Logger();

// Export convenience functions
export function logInfo(message: string, data?: Record<string, any>): void {
  logger.info(message, data);
}

export function logError(message: string, error?: Error | any, data?: Record<string, any>): void {
  logger.error(message, error, data);
}

export function logBusinessEvent(event: BusinessEvent, data?: Record<string, any>): void {
  logger.business(event, data);
}

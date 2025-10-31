import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { CACHE_DURATIONS } from "../../config/constants";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  white: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.7)",
  warning: "#FF9800",
  danger: "#F44336",
};

interface SessionTimeoutMonitorProps {
  /**
   * Session timeout in milliseconds
   * Defaults to 30 minutes from central config
   */
  timeout?: number;
  
  /**
   * Warning time before timeout in milliseconds
   * Defaults to 5 minutes from central config
   */
  warningTime?: number;
  
  /**
   * Callback when session expires
   */
  onExpire?: () => void;
}

export function SessionTimeoutMonitor({
  timeout = CACHE_DURATIONS.SESSION_TIMEOUT,
  warningTime = CACHE_DURATIONS.SESSION_WARNING,
  onExpire,
}: SessionTimeoutMonitorProps) {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimers = useCallback(() => {
    // Clear all existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setShowWarning(false);
    setShowExpired(false);
    
    // Set warning timer (fires before session expires)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(warningTime);
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1000) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }, timeout - warningTime);
    
    // Set session expiry timer
    timeoutRef.current = setTimeout(() => {
      setShowWarning(false);
      setShowExpired(true);
      if (onExpire) onExpire();
      
      // Clear countdown
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }, timeout);
  }, [timeout, warningTime, onExpire]);

  const handleActivity = useCallback(() => {
    // Reset timers on user activity
    if (!showExpired) {
      resetTimers();
    }
  }, [resetTimers, showExpired]);

  const handleExtendSession = useCallback(async () => {
    try {
      // Ping the server to extend the session
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });
      
      if (response.ok) {
        resetTimers();
        setShowWarning(false);
      } else {
        // Session is invalid, show expired modal
        setShowWarning(false);
        setShowExpired(true);
      }
    } catch (error) {
      console.error("Failed to extend session:", error);
      setShowWarning(false);
      setShowExpired(true);
    }
  }, [resetTimers]);

  const handleRelogin = useCallback(() => {
    // Redirect to login page
    navigate("/login");
  }, [navigate]);

  // Client-side only mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (!isMounted) return;
    
    // Initialize timers
    resetTimers();
    
    // Track user activity to reset session
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isMounted, resetTimers, handleActivity]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Don't render on server or if nothing to show
  if (!isMounted || (!showWarning && !showExpired)) return null;

  return (
    <>
      {/* Warning Modal */}
      {showWarning && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.white,
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                textAlign: "center",
                marginBottom: "16px",
              }}
            >
              ⏰
            </div>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: COLORS.text,
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              Session Expiring Soon
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: COLORS.text,
                marginBottom: "24px",
                textAlign: "center",
              }}
            >
              Your session will expire in{" "}
              <strong style={{ color: COLORS.warning }}>
                {formatTime(timeRemaining)}
              </strong>
              . Do you want to stay signed in?
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexDirection: "column",
              }}
            >
              <button
                onClick={handleExtendSession}
                style={{
                  backgroundColor: COLORS.primary,
                  color: COLORS.white,
                  padding: "14px 24px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Stay Signed In
              </button>
              <button
                onClick={handleRelogin}
                style={{
                  backgroundColor: "transparent",
                  color: COLORS.text,
                  padding: "14px 24px",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.text}`,
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expired Modal */}
      {showExpired && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.white,
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                textAlign: "center",
                marginBottom: "16px",
              }}
            >
              🔒
            </div>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: COLORS.danger,
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              Session Expired
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: COLORS.text,
                marginBottom: "24px",
                textAlign: "center",
              }}
            >
              For your security, your session has expired due to inactivity.
              Please sign in again to continue.
            </p>
            <button
              onClick={handleRelogin}
              style={{
                backgroundColor: COLORS.primary,
                color: COLORS.white,
                padding: "14px 24px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                width: "100%",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Sign In Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

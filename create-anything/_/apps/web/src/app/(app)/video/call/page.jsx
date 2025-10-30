import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Phone, 
  Flag, 
  AlertTriangle,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
  warning: "#F39C12",
  success: "#27AE60",
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const EXTENSION_COST = 8;
const EXTENSION_MINUTES = 10;
const GRACE_PERIOD_SECONDS = 20;

function PaymentForm({ clientSecret, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || processing) return;

    setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {},
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message);
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Payment failed");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-50"
          style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md transition-all disabled:opacity-50"
          style={{ backgroundColor: COLORS.primary }}
        >
          {processing ? "Processing..." : `Pay $${EXTENSION_COST}.00`}
        </button>
      </div>
    </form>
  );
}

export default function VideoCall() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const matchId = searchParams.get("matchId");
  const roomUrl = searchParams.get("roomUrl");

  const [isMounted, setIsMounted] = useState(false);
  const [currentRoomUrl, setCurrentRoomUrl] = useState(roomUrl);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [error, setError] = useState(null);

  const [sessionData, setSessionData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState(null);
  const [graceCountdown, setGraceCountdown] = useState(null);

  const [showExtendInitiateModal, setShowExtendInitiateModal] = useState(false);
  const [showExtendResponseModal, setShowExtendResponseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState(null);
  const [currentExtension, setCurrentExtension] = useState(null);

  const pollIntervalRef = useRef(null);
  const localTimerRef = useRef(null);
  const graceTimerRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pollSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/video/sessions/${sessionId}`);
      if (!res.ok) return;

      const data = await res.json();
      setSessionData(data);

      if (data.session.remainingSeconds !== undefined) {
        setLocalRemainingSeconds(data.session.remainingSeconds);
      }

      if (data.session.state === "ended") {
        navigate("/profile");
        return;
      }

      if (data.session.isInGracePeriod) {
        const graceExpires = new Date(data.session.graceExpiresAt).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((graceExpires - now) / 1000));
        setGraceCountdown(remaining);
      } else {
        setGraceCountdown(null);
      }

      const pendingExt = data.pendingExtensions?.[0];
      if (pendingExt) {
        setCurrentExtension(pendingExt);
        if (pendingExt.isResponder && pendingExt.status === "pending_acceptance") {
          setShowExtendResponseModal(true);
        }
      } else {
        setCurrentExtension(null);
        setShowExtendResponseModal(false);
        setShowPaymentModal(false);
      }
    } catch (err) {
      console.error("Poll session error:", err);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    const interval = sessionData?.pendingExtensions?.length > 0 || graceCountdown !== null
      ? 500
      : 2000;

    pollIntervalRef.current = setInterval(pollSession, interval);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [pollSession, sessionData, graceCountdown]);

  useEffect(() => {
    localTimerRef.current = setInterval(() => {
      setLocalRemainingSeconds((prev) => {
        if (prev === null || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (localTimerRef.current) clearInterval(localTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (graceCountdown !== null && graceCountdown > 0) {
      graceTimerRef.current = setInterval(() => {
        setGraceCountdown((prev) => {
          if (prev === null || prev <= 0) {
            navigate("/profile");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (graceTimerRef.current) {
      clearInterval(graceTimerRef.current);
    }
    return () => {
      if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    };
  }, [graceCountdown, navigate]);

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/video/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create room");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setCurrentRoomUrl(data.room_url);
      setSessionId(data.video_session_id);
      toast.success("Video room created!");
    },
    onError: (error) => {
      setError(error.message || "Failed to create video room");
      toast.error(error.message || "Failed to create video room");
    },
  });

  useEffect(() => {
    if (!roomUrl && matchId) {
      createRoomMutation.mutate();
    } else if (!roomUrl && !matchId) {
      setError("No match ID or room URL provided");
    } else if (roomUrl) {
      const urlParams = new URLSearchParams(window.location.search);
      const sid = urlParams.get("sessionId");
      if (sid) setSessionId(sid);
    }
  }, [matchId, roomUrl]);

  const handleEndCall = async () => {
    if (sessionId) {
      try {
        await fetch(`/api/video/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "ended" }),
        });
      } catch (e) {
        console.error("Failed to update session state:", e);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
    toast.success("Call ended");
    navigate("/profile");
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason for reporting");
      return;
    }

    toast.success("Report submitted. Thank you for keeping our community safe.");
    setShowReportModal(false);
    setReportReason("");
    handleEndCall();
  };

  const handleInitiateExtension = async () => {
    if (!sessionId) return;
    setShowExtendInitiateModal(false);

    try {
      const res = await fetch(`/api/video/sessions/${sessionId}/extensions`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to request extension");
        return;
      }

      const data = await res.json();
      toast.success("Extension request sent!");
      setCurrentExtension(data.extension);
      pollSession();
    } catch (err) {
      console.error("Extension request error:", err);
      toast.error("Failed to send extension request");
    }
  };

  const handleExtensionResponse = async (action) => {
    if (!currentExtension) return;

    try {
      const res = await fetch(
        `/api/video/sessions/${sessionId}/extensions/${currentExtension.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || `Failed to ${action} extension`);
        return;
      }

      const data = await res.json();

      if (action === "decline") {
        toast.info("Extension declined");
        setShowExtendResponseModal(false);
        setCurrentExtension(null);
      } else if (action === "accept") {
        toast.success("Extension accepted! Waiting for payment...");
        setShowExtendResponseModal(false);

        if (data.extension.paymentIntentClientSecret) {
          setPaymentClientSecret(data.extension.paymentIntentClientSecret);
          if (currentExtension.isInitiator) {
            setShowPaymentModal(true);
          }
        }
      }

      pollSession();
    } catch (err) {
      console.error("Extension response error:", err);
      toast.error(`Failed to ${action} extension`);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    if (!currentExtension || !sessionId) return;

    try {
      const res = await fetch(
        `/api/video/sessions/${sessionId}/extensions/${currentExtension.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to confirm payment");
        return;
      }

      toast.success(`${EXTENSION_MINUTES} minutes added to call!`);
      setShowPaymentModal(false);
      setPaymentClientSecret(null);
      setCurrentExtension(null);
      pollSession();
    } catch (err) {
      console.error("Payment confirmation error:", err);
      toast.error("Failed to confirm payment");
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const remaining = localRemainingSeconds ?? 0;
  const isNearEnd = remaining <= 60 && remaining > 0;
  const showExtendButton = remaining <= 120 || graceCountdown !== null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: COLORS.bg }}>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>Video Call Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/profile")}
            className="mt-4 px-6 py-3 rounded-xl font-bold text-white shadow-lg"
            style={{ backgroundColor: COLORS.primary }}
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#000" }}>
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black to-transparent">
        <h1 className="text-xl font-bold text-white">Video Date</h1>
        <div className="flex flex-col items-end gap-1">
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-sm"
            style={{ 
              backgroundColor: isNearEnd || graceCountdown !== null
                ? 'rgba(231, 76, 60, 0.8)'
                : 'rgba(0, 0, 0, 0.6)'
            }}
          >
            <Clock size={16} className="text-white" />
            <span className="font-bold text-white">
              {graceCountdown !== null ? `Grace: ${formatTime(graceCountdown)}` : formatTime(remaining)}
            </span>
          </div>
          {graceCountdown === null && (
            <div className="px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
              {sessionData?.session?.extendedSecondsTotal > 0 && `+${Math.floor(sessionData.session.extendedSecondsTotal / 60)}min extended`}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {currentRoomUrl ? (
          <iframe
            src={currentRoomUrl}
            allow="camera; microphone; fullscreen; display-capture"
            className="w-full h-full border-0"
            title="Video Call"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
              <p className="text-white text-lg">
                {createRoomMutation.isPending ? "Creating video room..." : "Loading video call..."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-t from-black to-transparent p-6">
        {graceCountdown !== null && (
          <div className="mb-4 p-4 rounded-xl text-center" style={{ backgroundColor: 'rgba(243, 156, 18, 0.9)' }}>
            <p className="text-white font-bold">Time's up! Extend to continue ({formatTime(graceCountdown)} remaining)</p>
          </div>
        )}

        {showExtendButton && !currentExtension && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={() => setShowExtendInitiateModal(true)}
              className="px-8 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all flex items-center gap-3 font-bold text-white"
              style={{ backgroundColor: COLORS.warning }}
            >
              <DollarSign size={24} />
              Extend Call (+${EXTENSION_COST} for {EXTENSION_MINUTES} min)
            </button>
          </div>
        )}

        {currentExtension && currentExtension.status === "pending_acceptance" && currentExtension.isInitiator && (
          <div className="mb-4 p-4 rounded-xl text-center" style={{ backgroundColor: 'rgba(91, 59, 175, 0.9)' }}>
            <p className="text-white font-semibold">Waiting for other party to accept extension...</p>
          </div>
        )}

        <div className="flex justify-center mb-4">
          <button
            onClick={handleEndCall}
            className="px-8 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all flex items-center gap-3 font-bold text-white"
            style={{ backgroundColor: COLORS.error }}
          >
            <Phone size={24} />
            End Call
          </button>
        </div>

        <div className="flex gap-4 max-w-2xl mx-auto">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
          >
            <Flag size={20} />
            Report
          </button>
        </div>
      </div>

      {showExtendInitiateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowExtendInitiateModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>
              Extend Call
            </h2>
            <p className="mb-4" style={{ color: COLORS.text }}>
              Request {EXTENSION_MINUTES} more minutes for ${EXTENSION_COST}.00?
            </p>
            <p className="mb-4 text-sm opacity-70" style={{ color: COLORS.text }}>
              The other party must accept before payment is processed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExtendInitiateModal(false)}
                className="flex-1 px-4 py-3 rounded-xl font-bold shadow-md"
                style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
              >
                Cancel
              </button>
              <button
                onClick={handleInitiateExtension}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md"
                style={{ backgroundColor: COLORS.primary }}
              >
                Request Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {showExtendResponseModal && currentExtension && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: COLORS.text }}>
              <Clock size={28} />
              Extension Request
            </h2>
            <p className="mb-4" style={{ color: COLORS.text }}>
              The other party wants to extend the call for {EXTENSION_MINUTES} more minutes (${EXTENSION_COST}.00).
            </p>
            <p className="mb-4 text-sm font-semibold" style={{ color: COLORS.warning }}>
              They will be charged after you accept.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExtensionResponse("decline")}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2"
                style={{ backgroundColor: COLORS.error }}
              >
                <XCircle size={20} />
                Decline
              </button>
              <button
                onClick={() => handleExtensionResponse("accept")}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2"
                style={{ backgroundColor: COLORS.success }}
              >
                <CheckCircle size={20} />
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {isMounted && showPaymentModal && paymentClientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>
              Complete Payment
            </h2>
            <p className="mb-4" style={{ color: COLORS.text }}>
              Pay ${EXTENSION_COST}.00 to add {EXTENSION_MINUTES} minutes to your call.
            </p>
            <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
              <PaymentForm
                clientSecret={paymentClientSecret}
                onSuccess={handlePaymentSuccess}
                onCancel={() => {
                  setShowPaymentModal(false);
                  setPaymentClientSecret(null);
                }}
              />
            </Elements>
          </div>
        </div>
      )}

      {showReportModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={28} style={{ color: COLORS.error }} />
              <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                Report Issue
              </h2>
            </div>
            <p className="mb-4 opacity-70" style={{ color: COLORS.text }}>
              Help us keep the community safe. Please describe the issue you experienced.
            </p>
            <textarea
              placeholder="Describe the issue..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-3 rounded-xl border-2 resize-none mb-4 focus:outline-none focus:border-purple-500"
              style={{ borderColor: COLORS.cardBg }}
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: COLORS.error }}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

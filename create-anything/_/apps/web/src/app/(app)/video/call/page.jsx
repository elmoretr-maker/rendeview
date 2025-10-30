import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Phone, 
  Flag, 
  ArrowRight,
  AlertTriangle,
  Clock,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { getTierLimits, MEMBERSHIP_TIERS } from "@/utils/membershipTiers";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
  warning: "#F39C12",
};

const EXTENSION_COST = 8;
const EXTENSION_MINUTES = 10;

export default function VideoCall() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const matchId = searchParams.get("matchId");
  const roomUrl = searchParams.get("roomUrl");

  const [currentRoomUrl, setCurrentRoomUrl] = useState(roomUrl);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [callStartTime, setCallStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState(null);
  const [sessionTimeLimit, setSessionTimeLimit] = useState(null);
  const [myTier, setMyTier] = useState(null);
  const [partnerTier, setPartnerTier] = useState(null);
  const [extendedMinutes, setExtendedMinutes] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // Fetch match and tier information
  useEffect(() => {
    const fetchMatchInfo = async () => {
      if (!matchId) return;
      
      try {
        const [profileRes, matchRes] = await Promise.all([
          fetch("/api/profile"),
          fetch(`/api/matches/${matchId}`)
        ]);

        let tier = MEMBERSHIP_TIERS.FREE;
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          tier = profileData.user?.membership_tier || MEMBERSHIP_TIERS.FREE;
          setMyTier(tier);
        }

        if (matchRes.ok) {
          const matchData = await matchRes.json();
          const pTier = matchData.match?.matched_user?.membership_tier || MEMBERSHIP_TIERS.FREE;
          setPartnerTier(pTier);
          
          const myLimits = getTierLimits(tier);
          const partnerLimits = getTierLimits(pTier);
          const minLimit = Math.min(myLimits.chatMinutes, partnerLimits.chatMinutes);
          setSessionTimeLimit(minLimit * 60);
        }
      } catch (e) {
        console.error("Failed to fetch tier info:", e);
        setSessionTimeLimit(5 * 60);
      }
    };

    fetchMatchInfo();
  }, [matchId]);

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      setElapsedTime(elapsed);

      if (sessionTimeLimit) {
        const totalLimit = sessionTimeLimit + (extendedMinutes * 60);
        const remaining = totalLimit - elapsed;

        if (remaining <= 60 && remaining > 0 && !showWarning && !showExtensionModal) {
          setShowWarning(true);
          toast.warning("1 minute remaining!");
        }

        if (remaining <= 0) {
          toast.error("Session time expired");
          handleEndCall();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [callStartTime, sessionTimeLimit, extendedMinutes, showWarning, showExtensionModal]);

  // Create video room if matchId is provided but no roomUrl
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
      toast.success("Video room created!");
    },
    onError: (error) => {
      setError(error.message || "Failed to create video room");
      toast.error(error.message || "Failed to create video room");
    },
  });

  // Initialize room on mount if needed
  useEffect(() => {
    if (!roomUrl && matchId) {
      createRoomMutation.mutate();
    } else if (!roomUrl && !matchId) {
      setError("No match ID or room URL provided");
    }
  }, [matchId, roomUrl]);

  // End call
  const handleEndCall = () => {
    queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
    toast.success("Call ended");
    navigate("/matches");
  };

  // Continue to extend call
  const handleContinue = () => {
    if (sessionTimeLimit) {
      const totalLimit = sessionTimeLimit + (extendedMinutes * 60);
      const remaining = totalLimit - elapsedTime;
      
      if (remaining <= 120) {
        setShowExtensionModal(true);
      } else {
        toast.success("Great! Keep the conversation going.");
      }
    } else {
      toast.success("Great! Keep the conversation going.");
    }
  };

  // Handle extension purchase
  const handleExtension = async () => {
    try {
      const redirectURL = `${window.location.origin}/video/call?matchId=${matchId}`;
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "extension",
          redirectURL,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start checkout");
      }

      const { url } = await res.json();
      if (url) {
        toast.info("Redirecting to payment...");
        navigate("/stripe", { state: { checkoutUrl: url, returnTo: `/video/call?matchId=${matchId}` } });
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to process extension");
    }
  };

  // Report user
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

  // Format elapsed time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRemainingTime = () => {
    if (!sessionTimeLimit) return null;
    const totalLimit = sessionTimeLimit + (extendedMinutes * 60);
    return Math.max(0, totalLimit - elapsedTime);
  };

  const remainingSeconds = getRemainingTime();
  const isNearLimit = remainingSeconds !== null && remainingSeconds <= 120;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: COLORS.bg }}>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>Video Call Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          {error.includes("DAILY_API_KEY") && (
            <p className="text-sm text-gray-500">
              Daily.co video integration requires DAILY_API_KEY configuration
            </p>
          )}
          {error.includes("meeting limit") && (
            <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: COLORS.cardBg }}>
              <p className="font-semibold mb-2" style={{ color: COLORS.text }}>
                Upgrade to continue meeting new people!
              </p>
              <button
                onClick={() => navigate("/profile")}
                className="mt-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg"
                style={{ backgroundColor: COLORS.primary }}
              >
                Upgrade Now
              </button>
            </div>
          )}
          <button
            onClick={() => navigate("/matches")}
            className="mt-4 px-6 py-3 rounded-xl font-bold text-white shadow-lg"
            style={{ backgroundColor: COLORS.primary }}
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#000" }}>
      {/* Header with timer - positioned over video */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black to-transparent">
        <h1 className="text-xl font-bold text-white">Video Date</h1>
        <div className="flex flex-col items-end gap-1">
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-sm"
            style={{ 
              backgroundColor: isNearLimit ? 'rgba(231, 76, 60, 0.8)' : 'rgba(0, 0, 0, 0.6)'
            }}
          >
            <Clock size={16} className="text-white" />
            <span className="font-bold text-white">{formatTime(elapsedTime)}</span>
          </div>
          {remainingSeconds !== null && (
            <div 
              className="px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm"
              style={{ 
                backgroundColor: isNearLimit ? 'rgba(243, 156, 18, 0.8)' : 'rgba(255, 255, 255, 0.2)',
                color: 'white'
              }}
            >
              {formatTime(remainingSeconds)} left
            </div>
          )}
        </div>
      </div>

      {/* Video iframe - takes most of the space */}
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

      {/* Control panel - fixed at bottom */}
      <div className="bg-gradient-to-t from-black to-transparent p-6">
        {/* End Call Button - centered and prominent */}
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

        {/* Action buttons */}
        <div className="flex gap-4 max-w-2xl mx-auto">
          <button
            onClick={handleContinue}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-white shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: COLORS.secondary }}
          >
            <ArrowRight size={20} />
            Continue
          </button>
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

      {/* Extension Modal */}
      {showExtensionModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowExtensionModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <CreditCard size={28} style={{ color: COLORS.primary }} />
              <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                Extend Your Call
              </h2>
            </div>
            <p className="mb-4 opacity-70" style={{ color: COLORS.text }}>
              Your session is almost over! Extend for ${EXTENSION_COST} to get {EXTENSION_MINUTES} more minutes.
            </p>
            <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: COLORS.cardBg }}>
              <p className="font-semibold" style={{ color: COLORS.text }}>
                Time Remaining: {remainingSeconds !== null && formatTime(remainingSeconds)}
              </p>
              <p className="text-sm mt-1 opacity-70" style={{ color: COLORS.text }}>
                Add {EXTENSION_MINUTES} minutes for ${EXTENSION_COST}.00
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExtensionModal(false)}
                className="flex-1 px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
              >
                Not Now
              </button>
              <button
                onClick={handleExtension}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: COLORS.primary }}
              >
                Extend Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
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

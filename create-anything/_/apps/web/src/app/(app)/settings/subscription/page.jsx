import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Crown, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { TIER_LIMITS, MEMBERSHIP_TIERS } from "@/utils/membershipTiers";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
  accent: "#00BFA6",
};

const TIERS = [
  {
    key: MEMBERSHIP_TIERS.FREE,
    title: "Free",
    price: TIER_LIMITS.free.price,
    photos: TIER_LIMITS.free.photos,
    videos: TIER_LIMITS.free.videos,
    videoDuration: TIER_LIMITS.free.videoMaxDuration,
    chatMinutes: TIER_LIMITS.free.chatMinutes,
    maxMeetings: TIER_LIMITS.free.maxMeetings,
    desc: "Get started with basic features",
  },
  {
    key: MEMBERSHIP_TIERS.CASUAL,
    title: "Casual",
    price: TIER_LIMITS.casual.price,
    photos: TIER_LIMITS.casual.photos,
    videos: TIER_LIMITS.casual.videos,
    videoDuration: TIER_LIMITS.casual.videoMaxDuration,
    chatMinutes: TIER_LIMITS.casual.chatMinutes,
    desc: "Expand your profile & chat time",
  },
  {
    key: MEMBERSHIP_TIERS.DATING,
    title: "Dating",
    price: TIER_LIMITS.dating.price,
    photos: TIER_LIMITS.dating.photos,
    videos: TIER_LIMITS.dating.videos,
    videoDuration: TIER_LIMITS.dating.videoMaxDuration,
    chatMinutes: TIER_LIMITS.dating.chatMinutes,
    desc: "Priority matching & longer chats",
  },
  {
    key: MEMBERSHIP_TIERS.BUSINESS,
    title: "Business",
    price: TIER_LIMITS.business.price,
    photos: TIER_LIMITS.business.photos,
    videos: TIER_LIMITS.business.videos,
    videoDuration: TIER_LIMITS.business.videoMaxDuration,
    chatMinutes: TIER_LIMITS.business.chatMinutes,
    desc: "Maximum exposure & unlimited features",
  },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState(null);
  const [error, setError] = useState(null);

  const [scheduledTier, setScheduledTier] = useState(null);
  const [tierChangeAt, setTierChangeAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (mounted) {
          setCurrentTier(data?.user?.membership_tier || "free");
          setScheduledTier(data?.user?.scheduled_tier || null);
          setTierChangeAt(data?.user?.tier_change_at || null);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setError("Failed to load subscription info");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const upgradeTier = useCallback(
    async (key) => {
      try {
        setLoading(true);
        setError(null);
        
        if (key === "free") {
          toast.info("You're already on the Free plan");
          return;
        }
        
        const redirectURL = `${window.location.origin}/settings/subscription`;
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "subscription",
            tier: key,
            redirectURL,
          }),
        });
        
        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t?.error || "Could not start checkout");
        }
        
        const { url } = await res.json();
        if (url) {
          navigate("/stripe", { state: { checkoutUrl: url, returnTo: "/settings/subscription" } });
        } else {
          throw new Error("Missing checkout url");
        }
      } catch (e) {
        console.error(e);
        setError(e.message);
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  const cancelScheduledDowngrade = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const confirmed = window.confirm(
        "Cancel your scheduled downgrade? You will continue on your current plan and will be charged at renewal."
      );

      if (!confirmed) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/payments/cancel-downgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || "Could not cancel downgrade");
      }

      const data = await res.json();
      toast.success(data.message || "Scheduled downgrade cancelled successfully");
      setScheduledTier(null);
      setTierChangeAt(null);
      window.location.reload();
    } catch (e) {
      console.error(e);
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const downgradeTier = useCallback(
    async (key) => {
      if (key === currentTier) {
        toast.info("You're already on this plan");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const confirmed = window.confirm(
          `Are you sure you want to downgrade to the ${TIERS.find(t => t.key === key)?.title} plan? The change will take effect at the end of your current billing cycle. You'll keep your current benefits until then.`
        );
        
        if (!confirmed) {
          setLoading(false);
          return;
        }
        
        const res = await fetch("/api/payments/downgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: key }),
        });
        
        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t?.error || "Could not downgrade");
        }
        
        const data = await res.json();
        toast.success(data.message || "Downgrade scheduled successfully");
        setScheduledTier(data.scheduledTier);
        setTierChangeAt(data.tierChangeAt);
        window.location.reload();
      } catch (e) {
        console.error(e);
        setError(e.message);
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    },
    [currentTier],
  );

  const getTierRank = (tierKey) => {
    const ranks = { free: 0, casual: 1, dating: 2, business: 3 };
    return ranks[tierKey] || 0;
  };

  const currentTierRank = getTierRank(currentTier);

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.lightGray }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Crown size={32} style={{ color: COLORS.primary }} />
            <h1 className="text-3xl font-bold" style={{ color: COLORS.text }}>
              Subscription Management
            </h1>
          </div>
          <p className="text-lg opacity-70" style={{ color: COLORS.text }}>
            Manage your membership plan and billing
          </p>
        </div>

        {/* Current Plan */}
        {currentTier && (
          <div 
            className="mb-6 p-6 rounded-xl border-2"
            style={{ 
              backgroundColor: COLORS.white, 
              borderColor: COLORS.primary 
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium opacity-70" style={{ color: COLORS.text }}>
                  Current Plan
                </p>
                <h2 className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                  {TIERS.find(t => t.key === currentTier)?.title || "Free"}
                </h2>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: COLORS.lightGray }}>
                <Check size={20} style={{ color: COLORS.accent }} />
                <span className="font-semibold" style={{ color: COLORS.accent }}>Active</span>
              </div>
            </div>
            
            {TIERS.find(t => t.key === currentTier) && (
              <div className="space-y-2 text-sm" style={{ color: COLORS.text }}>
                <p>✓ {TIERS.find(t => t.key === currentTier).photos} Profile Photos</p>
                <p>✓ {TIERS.find(t => t.key === currentTier).videos} Video{TIERS.find(t => t.key === currentTier).videos !== 1 ? 's' : ''} ({TIERS.find(t => t.key === currentTier).videoDuration}s max each)</p>
                <p>✓ {TIERS.find(t => t.key === currentTier).chatMinutes} Minutes Video Chat</p>
                {TIERS.find(t => t.key === currentTier).maxMeetings !== undefined && 
                 TIERS.find(t => t.key === currentTier).maxMeetings !== Infinity && (
                  <p>✓ {TIERS.find(t => t.key === currentTier).maxMeetings} Meeting Limit</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scheduled Downgrade Alert */}
        {scheduledTier && tierChangeAt && (
          <div 
            className="mb-6 p-6 rounded-xl border-2"
            style={{ 
              backgroundColor: "#FFF7ED", 
              borderColor: "#FB923C" 
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FED7AA" }}>
                <svg className="w-6 h-6" style={{ color: "#EA580C" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#EA580C" }}>
                  Scheduled Downgrade
                </h3>
                <p className="text-sm" style={{ color: "#9A3412" }}>
                  Your plan will change on {new Date(tierChangeAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: "#FFEDD5" }}>
              <p className="text-sm font-medium mb-2" style={{ color: "#9A3412" }}>
                Current: {TIERS.find(t => t.key === currentTier)?.title}
              </p>
              <p className="text-sm font-medium" style={{ color: "#9A3412" }}>
                Scheduled: {TIERS.find(t => t.key === scheduledTier)?.title}
              </p>
            </div>
            <p className="mt-4 text-sm" style={{ color: "#9A3412" }}>
              You will retain your current {TIERS.find(t => t.key === currentTier)?.title} benefits until {new Date(tierChangeAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </p>
            <button
              onClick={cancelScheduledDowngrade}
              disabled={loading}
              className="mt-4 w-full px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ 
                backgroundColor: "#FFFFFF", 
                color: "#EA580C",
                border: "2px solid #FB923C"
              }}
            >
              {loading ? "Cancelling..." : "Cancel Scheduled Downgrade"}
            </button>
          </div>
        )}

        {/* Billing Management */}
        {currentTier && currentTier !== "free" && (
          <div className="mb-6 p-6 rounded-xl" style={{ backgroundColor: COLORS.white }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.text }}>
              Billing Management
            </h3>
            <p className="text-sm opacity-70 mb-4" style={{ color: COLORS.text }}>
              View billing history, update payment method, or cancel subscription
            </p>
            <button
              onClick={() => navigate("/account/billing")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold"
              style={{ backgroundColor: COLORS.primary }}
            >
              Manage Billing
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Available Plans */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
            {currentTier === "free" ? "Upgrade Your Plan" : "Available Plans"}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {TIERS.map((t) => {
              const isCurrent = t.key === currentTier;
              const isDowngrade = getTierRank(t.key) < currentTierRank;
              const isUpgrade = getTierRank(t.key) > currentTierRank;

              return (
                <div
                  key={t.key}
                  className="border rounded-xl p-4"
                  style={{
                    borderColor: isCurrent ? COLORS.primary : "#E5E7EB",
                    backgroundColor: isCurrent ? "#F9F5FF" : COLORS.white,
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold" style={{ color: COLORS.text }}>
                      {t.title}
                    </span>
                    <span className="text-base font-bold" style={{ color: COLORS.primary }}>
                      {t.price}
                    </span>
                  </div>
                  <p className="opacity-80 mb-3 text-sm" style={{ color: COLORS.text }}>
                    {t.desc}
                  </p>
                  
                  <div className="mb-4 space-y-1 text-sm" style={{ color: COLORS.text }}>
                    <p>• {t.photos} Profile Photos</p>
                    <p>• {t.videos} Video{t.videos !== 1 ? 's' : ''} ({t.videoDuration}s max each)</p>
                    <p>• {t.chatMinutes} Minutes Video Chat</p>
                    {t.maxMeetings !== undefined && t.maxMeetings !== Infinity && (
                      <p>• {t.maxMeetings} Meeting Limit</p>
                    )}
                  </div>
                  
                  {isCurrent ? (
                    <div className="w-full py-2 text-center font-semibold rounded-lg" style={{ backgroundColor: COLORS.lightGray, color: COLORS.text }}>
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => isDowngrade ? downgradeTier(t.key) : upgradeTier(t.key)}
                      disabled={loading}
                      className="w-full py-2 rounded-lg text-white font-semibold disabled:opacity-50"
                      style={{ backgroundColor: COLORS.primary }}
                    >
                      {loading
                        ? "Please wait..."
                        : isDowngrade
                          ? `Downgrade to ${t.title}`
                          : isUpgrade
                            ? `Upgrade to ${t.title}`
                            : `Switch to ${t.title}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Call Extensions */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: COLORS.white }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.text }}>
            Call Extensions
          </h3>
          <p className="text-sm opacity-70 mb-3" style={{ color: COLORS.text }}>
            Extend any video call beyond your tier's limit
          </p>
          <p className="font-semibold" style={{ color: COLORS.accent }}>
            • $8.00 for 10 minutes
          </p>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

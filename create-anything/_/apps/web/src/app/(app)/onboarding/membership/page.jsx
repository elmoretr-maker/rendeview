import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
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
    highlight: false,
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
    highlight: true,
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
    highlight: false,
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
    highlight: false,
  },
];

export default function MembershipScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState(null);

  const totalSteps = 4;
  const stepIndex = 3;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Failed to load pricing");
        const data = await res.json();
        if (mounted) setPricing(data?.settings?.pricing || null);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const chooseTier = useCallback(
    async (key) => {
      try {
        setLoading(true);
        setError(null);
        if (key === "free") {
          const res = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membership_tier: "free" }),
          });
          if (!res.ok) throw new Error("Failed to set tier");
          navigate("/onboarding/profile");
          return;
        }
        const redirectURL = window.location.origin;
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
          navigate("/stripe", { state: { checkoutUrl: url } });
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.white }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/onboarding/consent")}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1.5 bg-gray-200 rounded-full">
            <div
              className="h-1.5 rounded-full"
              style={{ backgroundColor: COLORS.primary, width: progressPct }}
            />
          </div>
          <p className="text-sm mt-2 opacity-70" style={{ color: COLORS.text }}>
            Step {stepIndex} of {totalSteps}
          </p>
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.text }}>
          Choose your plan
        </h1>
        <p className="opacity-70 mb-6" style={{ color: COLORS.text }}>
          Unlock video chat with a membership. You can upgrade anytime.
        </p>

        {TIERS.map((t) => (
          <div
            key={t.key}
            className="border rounded-xl p-4 mb-3"
            style={{
              borderColor: "#E5E7EB",
              backgroundColor: t.highlight ? "#F9F5FF" : COLORS.white,
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
            <p className="opacity-80 mb-2" style={{ color: COLORS.text }}>
              {t.desc}
            </p>
            
            <div className="mb-3 space-y-1 text-sm" style={{ color: COLORS.text }}>
              <p>• {t.photos} Profile Photos</p>
              <p>• {t.videos} Video{t.videos !== 1 ? 's' : ''} ({t.videoDuration}s max each)</p>
              <p>• {t.chatMinutes} Minutes Video Chat</p>
              {t.maxMeetings !== undefined && t.maxMeetings !== Infinity && (
                <p className="font-semibold" style={{ color: COLORS.accent }}>
                  • {t.maxMeetings} Meeting Limit
                </p>
              )}
            </div>
            
            <button
              onClick={() => chooseTier(t.key)}
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-bold disabled:opacity-50"
              style={{ backgroundColor: COLORS.primary }}
            >
              {loading
                ? "Please wait..."
                : t.key === "free"
                  ? "Continue with Free"
                  : `Choose ${t.title}`}
            </button>
          </div>
        ))}

        <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: COLORS.lightGray }}>
          <h3 className="text-base font-bold mb-2" style={{ color: COLORS.text }}>
            Call Extensions
          </h3>
          <p className="font-semibold" style={{ color: COLORS.accent }}>
            • $8.00 for 10 minutes
          </p>
          <p className="text-sm mt-1 opacity-80" style={{ color: COLORS.text }}>
            Extend any video call beyond your tier's limit
          </p>
        </div>

        {pricing?.second_date_cents != null && (
          <div className="mt-3">
            <p className="font-bold" style={{ color: COLORS.accent }}>
              Second Date Fee: ${(pricing.second_date_cents / 100).toFixed(2)} USD
            </p>
          </div>
        )}

        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>
    </div>
  );
}

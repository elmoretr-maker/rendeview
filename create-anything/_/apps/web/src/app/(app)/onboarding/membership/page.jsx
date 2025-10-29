import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
  accent: "#00BFA6",
};

const TIERS = [
  {
    key: "casual",
    title: "Casual",
    price: "Free",
    desc: "Browse, see & send likes",
    highlight: false,
  },
  {
    key: "active",
    title: "Active User",
    price: "$14.99/mo",
    desc: "Unlock video chat & scheduling",
    highlight: true,
  },
  {
    key: "dating",
    title: "Dating",
    price: "$29.99/mo",
    desc: "Priority matching & video",
    highlight: false,
  },
  {
    key: "business",
    title: "Business",
    price: "$49.99/mo",
    desc: "Max exposure & tools",
    highlight: false,
  },
];

export default function MembershipScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState(null);

  const totalSteps = 5;
  const stepIndex = 1;
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
        if (key === "casual") {
          const res = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membership_tier: "casual" }),
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
            <p className="opacity-80 mb-3" style={{ color: COLORS.text }}>
              {t.desc}
            </p>
            <button
              onClick={() => chooseTier(t.key)}
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-bold disabled:opacity-50"
              style={{ backgroundColor: COLORS.primary }}
            >
              {loading
                ? "Please wait..."
                : t.key === "casual"
                  ? "Continue with Casual"
                  : `Choose ${t.title}`}
            </button>
          </div>
        ))}

        <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: COLORS.lightGray }}>
          <h3 className="text-base font-bold mb-2" style={{ color: COLORS.text }}>
            Call extensions
          </h3>
          <p style={{ color: COLORS.text }}>• $5 for 5 minutes</p>
          <p style={{ color: COLORS.text }}>• $10 for 15 minutes</p>
          <p style={{ color: COLORS.text }}>• $20 for 30 minutes</p>
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

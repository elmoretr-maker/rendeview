import React, { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

export default function Consent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  
  const returnTo = searchParams.get("returnTo") || "/discovery";

  const totalSteps = 5;
  const stepIndex = 5;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const accept = useCallback(async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_accepted: true }),
      });
      if (!res.ok) {
        throw new Error("Failed to save consent");
      }
      navigate(returnTo, { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Could not save consent");
    } finally {
      setSaving(false);
    }
  }, [navigate, returnTo]);

  const decline = useCallback(() => {
    navigate(`/onboarding/data-consent-required?returnTo=${encodeURIComponent(returnTo)}`);
  }, [navigate, returnTo]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#FFFFFF" }}>
      {/* Progress bar */}
      <div className="absolute top-8 left-6 right-6 max-w-2xl mx-auto">
        <div className="h-1.5 bg-gray-200 rounded-full">
          <div
            className="h-1.5 rounded-full"
            style={{ backgroundColor: "#5B3BAF", width: progressPct }}
          />
        </div>
        <p className="text-sm mt-2 text-gray-600">
          Step {stepIndex} of {totalSteps}
        </p>
      </div>

      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-3">Data Consent</h1>
        <p className="text-gray-600 mb-6">
          We use your location and interests to ensure perfect matches and reliable scheduling. 
          By consenting, you unlock all features for a superior dating experience.
        </p>

        <button
          onClick={accept}
          disabled={saving}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-base mb-3 disabled:opacity-60"
          style={{ backgroundColor: "#00BFA6" }}
        >
          {saving ? "Saving..." : "Accept & Finish"}
        </button>
        
        <button
          onClick={decline}
          className="w-full py-3.5 rounded-xl font-semibold text-base"
          style={{ backgroundColor: "#F3F4F6", color: "#111827" }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

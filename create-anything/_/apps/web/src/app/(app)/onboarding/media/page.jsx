import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
};

export default function MediaOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const totalSteps = 5;
  const stepIndex = 3;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const handleContinue = () => {
    navigate("/onboarding/consent");
  };

  return (
    <div className="min-h-screen px-6" style={{ backgroundColor: COLORS.white }}>
      <div className="max-w-2xl mx-auto py-8">
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

        <h1 className="text-2xl font-bold">Add photos & video</h1>
        <p className="text-gray-600 mt-2">Share your best photos and a short video</p>

        <div className="mt-6 space-y-4">
          <div className="p-8 border-2 border-dashed rounded-xl text-center" style={{ borderColor: COLORS.lightGray }}>
            <p className="text-gray-500 mb-2">📷 Photos</p>
            <p className="text-sm text-gray-400">File upload requires additional integration</p>
          </div>

          <div className="p-8 border-2 border-dashed rounded-xl text-center" style={{ borderColor: COLORS.lightGray }}>
            <p className="text-gray-500 mb-2">🎥 Video</p>
            <p className="text-sm text-gray-400">Video upload requires additional integration</p>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-semibold mt-6 disabled:opacity-60"
          style={{ backgroundColor: COLORS.primary }}
        >
          Continue to Consent
        </button>

        <p className="text-xs text-center mt-4 text-gray-400">
          For QA: File uploads can be configured separately
        </p>
      </div>
    </div>
  );
}

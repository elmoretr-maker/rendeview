import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
};

export default function VideoOnboarding() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const totalSteps = 5;
  const stepIndex = 4;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const onNext = useCallback(async () => {
    // For now, skip actual upload and proceed
    toast.info("Video upload feature requires additional setup");
    navigate("/onboarding/consent");
  }, [navigate]);

  const handleSkip = () => {
    navigate("/onboarding/consent");
  };

  return (
    <div className="min-h-screen px-6" style={{ backgroundColor: COLORS.white }}>
      <div className="max-w-2xl mx-auto py-8">
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

        <h1 className="text-2xl font-bold">Add a profile video</h1>
        <p className="text-gray-600 mt-2">Upload a short video to introduce yourself</p>

        <div className="mt-6 p-12 border-2 border-dashed rounded-xl text-center" style={{ borderColor: COLORS.lightGray }}>
          <p className="text-4xl mb-4">🎥</p>
          <p className="text-gray-500 mb-2">Video upload interface</p>
          <p className="text-sm text-gray-400">Requires file upload integration</p>
        </div>

        <button
          onClick={onNext}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-semibold mt-6 disabled:opacity-60"
          style={{ backgroundColor: COLORS.primary }}
        >
          {loading ? "Uploading..." : "Next: Data Consent"}
        </button>

        <button
          onClick={handleSkip}
          className="w-full py-3.5 rounded-xl font-semibold text-gray-600 mt-3"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

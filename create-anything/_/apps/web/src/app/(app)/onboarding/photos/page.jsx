import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
};

export default function PhotosOnboarding() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const totalSteps = 5;
  const stepIndex = 3;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const onNext = useCallback(async () => {
    if (assets.length < 3) {
      toast.error("Please add at least 3 photos");
      return;
    }
    // For now, skip actual upload and proceed
    toast.info("Photo upload feature requires additional setup");
    navigate("/onboarding/video");
  }, [assets, navigate]);

  const handleSkip = () => {
    navigate("/onboarding/video");
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

        <h1 className="text-2xl font-bold">Add your photos</h1>
        <p className="text-gray-600 mt-2">Add at least 3 photos to continue</p>

        <div className="mt-6 p-8 border-2 border-dashed rounded-xl text-center" style={{ borderColor: COLORS.lightGray }}>
          <p className="text-gray-500 mb-4">File upload UI requires additional integration</p>
          <p className="text-sm text-gray-400">For QA: Use Skip button to continue flow</p>
        </div>

        {error && <p className="text-red-500 mt-2">{error}</p>}

        <button
          onClick={onNext}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-semibold mt-6 disabled:opacity-60"
          style={{ backgroundColor: COLORS.primary }}
        >
          {loading ? "Uploading..." : "Next: Add Video"}
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

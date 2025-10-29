import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function ProfileOnboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const totalSteps = 5;
  const stepIndex = 2;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const onNext = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        throw new Error("Failed to save profile");
      }
      navigate("/onboarding/media");
    } catch (e) {
      console.error(e);
      setError("Could not save profile");
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  }, [name, navigate]);

  return (
    <div className="min-h-screen px-6" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="max-w-2xl mx-auto py-8">
        {/* Progress bar */}
        <div className="mb-6">
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

        <h1 className="text-2xl font-bold mt-4">Tell us about you</h1>
        <p className="text-gray-600 mt-2">We use this to personalize your experience.</p>

        <label className="block mt-6 mb-2 font-semibold">Display name</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-lg px-3 py-3"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {error && <p className="text-red-500 mt-2">{error}</p>}

        <button
          onClick={onNext}
          disabled={saving || !name.trim()}
          className="w-full py-3.5 rounded-xl text-white font-semibold mt-6 disabled:opacity-60"
          style={{ backgroundColor: "#5B3BAF" }}
        >
          {saving ? "Saving..." : "Next: Add Photos"}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full py-3.5 rounded-xl font-semibold text-gray-600 mt-3"
        >
          Back
        </button>
      </div>
    </div>
  );
}

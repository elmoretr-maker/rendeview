import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Trash2, Upload } from "lucide-react";
import { getTierLimits, getRemainingVideoSlots, getMaxVideoDuration, MEMBERSHIP_TIERS } from "@/utils/membershipTiers";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
};

export default function VideoOnboarding() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [membershipTier, setMembershipTier] = useState(MEMBERSHIP_TIERS.FREE);

  const totalSteps = 5;
  const stepIndex = 4;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        const u = data.user || {};
        setMembershipTier(u.membership_tier || MEMBERSHIP_TIERS.FREE);
        const m = Array.isArray(data.media) ? data.media : [];
        setVideos(m.filter(x => x.type === 'video'));
      } catch (e) {
        console.error(e);
        setError("Failed to fetch videos");
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const handleVideoUpload = useCallback(async () => {
    const limits = getTierLimits(membershipTier);
    const remaining = getRemainingVideoSlots(membershipTier, videos.length);
    
    if (remaining <= 0) {
      toast.error(`Video limit reached (${limits.videos} max). Upgrade to add more!`);
      throw new Error("Video limit reached");
    }
    
    try {
      const res = await fetch("/api/objects/upload", { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Failed to get upload URL");
        throw new Error("Upload URL request failed");
      }
      const data = await res.json();
      return { method: "PUT", url: data.uploadURL };
    } catch (e) {
      console.error(e);
      if (e.message !== "Video limit reached") {
        toast.error("Failed to initiate upload");
      }
      throw e;
    }
  }, [videos, membershipTier]);

  const handleVideoComplete = useCallback(async (result) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        const res = await fetch("/api/profile/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaURL: uploadURL, type: "video" }),
        });
        if (!res.ok) throw new Error("Failed to save video");
        toast.success("Video uploaded successfully");
        window.location.reload();
      } catch (e) {
        console.error(e);
        toast.error("Failed to save video");
      }
    }
  }, []);

  const deleteVideo = useCallback(async (videoUrl) => {
    try {
      const res = await fetch(`/api/profile/media?url=${encodeURIComponent(videoUrl)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete video");
      toast.success("Video deleted");
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error("Could not delete video");
    }
  }, []);

  const onNext = useCallback(() => {
    navigate("/onboarding/consent");
  }, [navigate]);

  const handleSkip = () => {
    navigate("/onboarding/consent");
  };

  const tierLimits = getTierLimits(membershipTier);
  const remainingVideos = getRemainingVideoSlots(membershipTier, videos.length);
  const maxDuration = getMaxVideoDuration(membershipTier);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.white }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: COLORS.primary }}></div>
          <p className="mt-4" style={{ color: COLORS.text }}>Loading...</p>
        </div>
      </div>
    );
  }

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
        <p className="text-gray-600 mt-2">
          Upload a short video to introduce yourself ({tierLimits.videos} max, {maxDuration}s each for {membershipTier} tier)
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold" style={{ color: COLORS.text }}>
              Your Videos ({videos.length}/{tierLimits.videos})
            </p>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={52428800}
              allowedFileTypes={['video/*']}
              onGetUploadParameters={handleVideoUpload}
              onComplete={handleVideoComplete}
              buttonClassName="px-4 py-2 rounded-lg text-white font-semibold shadow-md flex items-center gap-2"
              buttonStyle={{ backgroundColor: remainingVideos > 0 ? COLORS.primary : '#9CA3AF' }}
            >
              <Upload size={18} />
              {remainingVideos > 0 ? 'Upload Video' : 'Limit Reached'}
            </ObjectUploader>
          </div>

          {videos.length > 0 ? (
            <div className="space-y-3">
              {videos.map((video, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden bg-black">
                  <video
                    src={`/api${video.url}`}
                    controls
                    loop
                    className="w-full"
                    style={{ height: "220px", objectFit: "cover" }}
                  />
                  <button
                    onClick={() => deleteVideo(video.url)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 p-12 border-2 border-dashed rounded-xl text-center" style={{ borderColor: COLORS.lightGray }}>
              <p className="text-4xl mb-4">🎥</p>
              <p className="text-gray-500 mb-2">No video yet. Click Upload Video to add one!</p>
              <p className="text-sm text-gray-400">Max {maxDuration} seconds for your tier</p>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 mt-2">{error}</p>}

        <button
          onClick={onNext}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-semibold mt-6 disabled:opacity-60"
          style={{ backgroundColor: COLORS.primary }}
        >
          {loading ? "Processing..." : "Next: Data Consent"}
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

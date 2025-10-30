import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Trash2, Upload } from "lucide-react";
import { getTierLimits, getRemainingPhotoSlots, MEMBERSHIP_TIERS } from "@/utils/membershipTiers";

const COLORS = {
  primary: "#5B3BAF",
  text: "#2C3E50",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
};

export default function PhotosOnboarding() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [membershipTier, setMembershipTier] = useState(MEMBERSHIP_TIERS.FREE);

  const totalSteps = 5;
  const stepIndex = 3;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        const u = data.user || {};
        setMembershipTier(u.membership_tier || MEMBERSHIP_TIERS.FREE);
        const m = Array.isArray(data.media) ? data.media : [];
        setPhotos(m.filter(x => x.type === 'photo'));
      } catch (e) {
        console.error(e);
        setError("Failed to fetch photos");
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  const handlePhotoUpload = useCallback(async () => {
    const limits = getTierLimits(membershipTier);
    const remaining = getRemainingPhotoSlots(membershipTier, photos.length);
    
    if (remaining <= 0) {
      toast.error(`Photo limit reached (${limits.photos} max). Upgrade to add more!`);
      throw new Error("Photo limit reached");
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
      if (e.message !== "Photo limit reached") {
        toast.error("Failed to initiate upload");
      }
      throw e;
    }
  }, [photos, membershipTier]);

  const handlePhotoComplete = useCallback(async (result) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        const res = await fetch("/api/profile/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaURL: uploadURL, type: "photo" }),
        });
        if (!res.ok) throw new Error("Failed to save photo");
        toast.success("Photo uploaded successfully");
        window.location.reload();
      } catch (e) {
        console.error(e);
        toast.error("Failed to save photo");
      }
    }
  }, []);

  const deletePhoto = useCallback(async (photoUrl) => {
    try {
      const res = await fetch(`/api/profile/media?url=${encodeURIComponent(photoUrl)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete photo");
      toast.success("Photo deleted");
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error("Could not delete photo");
    }
  }, []);

  const onNext = useCallback(() => {
    const tierLimits = getTierLimits(membershipTier);
    const minPhotos = Math.min(2, tierLimits.photos);
    
    if (photos.length < minPhotos) {
      toast.error(`Please add at least ${minPhotos} photos to continue`);
      return;
    }
    navigate("/onboarding/video");
  }, [photos, membershipTier, navigate]);

  const handleSkip = () => {
    navigate("/onboarding/video");
  };

  const tierLimits = getTierLimits(membershipTier);
  const remainingPhotos = getRemainingPhotoSlots(membershipTier, photos.length);

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
        <p className="text-gray-600 mt-2">
          Add at least 2 photos to continue ({tierLimits.photos} max for {membershipTier} tier)
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold" style={{ color: COLORS.text }}>
              Your Photos ({photos.length}/{tierLimits.photos})
            </p>
            <ObjectUploader
              maxNumberOfFiles={remainingPhotos}
              maxFileSize={10485760}
              allowedFileTypes={['image/*']}
              onGetUploadParameters={handlePhotoUpload}
              onComplete={handlePhotoComplete}
              buttonClassName="px-4 py-2 rounded-lg text-white font-semibold shadow-md flex items-center gap-2"
              buttonStyle={{ backgroundColor: remainingPhotos > 0 ? COLORS.primary : '#9CA3AF' }}
            >
              <Upload size={18} />
              {remainingPhotos > 0 ? `Upload Photos` : 'Limit Reached'}
            </ObjectUploader>
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={`/api${photo.url}`}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-32 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => deletePhoto(photo.url)}
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 p-12 border-2 border-dashed rounded-xl text-center" style={{ borderColor: COLORS.lightGray }}>
              <p className="text-gray-500">No photos yet. Click Upload Photos to add some!</p>
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
          {loading ? "Processing..." : "Next: Add Video"}
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

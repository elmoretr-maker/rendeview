import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, X, Trash2, Video, PlayCircle, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { ObjectUploader } from "@/components/ObjectUploader";
import { getTierLimits, MEMBERSHIP_TIERS } from "@/utils/membershipTiers";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";

const COLORS = {
  primary: "#5B3BAF",
  primaryHover: "#4A2E91",
  secondary: "#8B5CF6",
  text: "#1F2937",
  textLight: "#6B7280",
  error: "#EF4444",
  success: "#10B981",
  lightGray: "#F9FAFB",
  white: "#FFFFFF",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
};

const INTERESTS_CONFIG = {
  MIN_REQUIRED: 3,
  MAX_ALLOWED: 10,
  OPTIONS: [
    'Anime', 'Astronomy', 'Astrology', 'BBQ & Grilling', 'Basketball', 'Baking', 
    'Beach', 'Board Games', 'Camping', 'Career Development', 'Cars & Motorcycles',
    'Chess', 'Clubbing', 'Coffee', 'Comics & Manga', 'Concerts', 'Cooking',
    'Craft Beer', 'Crafts', 'Crossword Puzzles', 'Cycling', 'DIY Projects',
    'Dance', 'Drawing', 'Entrepreneurship', 'Fashion', 'Festivals', 'Film & Movies',
    'Fishing', 'Foodie', 'Gardening', 'Gaming', 'Golf', 'Gym', 'Hiking',
    'History', 'Home Brewing', 'Interior Design', 'Investing', 'Karaoke',
    'Kayaking', 'Languages', 'Live Music', 'Magic Tricks', 'Martial Arts',
    'Meditation', 'Minimalism', 'Mountain Climbing', 'Music', 'Nature Walks',
    'Networking', 'Networking Events', 'Painting', 'Pets & Animals', 'Philosophy',
    'Photography', 'Playing Instrument', 'Podcasts', 'Poetry', 'Politics',
    'Psychology', 'Public Speaking', 'Reading', 'Restaurant Hopping', 'Road Trips',
    'Rock Climbing', 'Running', 'Science', 'Sculpting', 'Self-improvement',
    'Singing', 'Skiing', 'Sneakers', 'Snowboarding', 'Soccer', 'Stand-up Comedy',
    'Streaming', 'Surfing', 'Sustainable Living', 'Swimming', 'Tech & Startups',
    'Tennis', 'Theater', 'Thrift Shopping', 'Travel', 'Trivia Nights',
    'Vegan Cooking', 'Video Games', 'Vintage Collecting', 'Volleyball',
    'Volunteering', 'Wine Bars', 'Wine Tasting', 'Writing', 'Yoga'
  ]
};

function ConsolidatedProfileOnboardingContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [newInterest, setNewInterest] = useState("");
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const totalSteps = 4;
  const stepIndex = 4;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const user = profileData?.user || {};
  const media = profileData?.media || [];
  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");
  const membershipTier = user.membership_tier || MEMBERSHIP_TIERS.FREE;
  const limits = getTierLimits(membershipTier);

  useEffect(() => {
    if (user.name) setName(user.name);
    if (user.bio) setBio(user.bio);
    if (user.interests && Array.isArray(user.interests)) setInterests(user.interests);
  }, [user]);

  const handlePhotoUpload = useCallback(async () => {
    if (photos.length >= limits.photos) {
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
  }, [photos.length, limits.photos]);

  const handlePhotoStart = useCallback(() => {
    setUploadingPhoto(true);
  }, []);

  const handlePhotoComplete = useCallback(
    async (result) => {
      try {
        if (result.successful && result.successful.length > 0) {
          const uploadURL = result.successful[0].uploadURL;
          const res = await fetch("/api/profile/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaURL: uploadURL, type: "photo" }),
          });
          if (!res.ok) throw new Error("Failed to save photo");
          toast.success("Photo uploaded successfully!");
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to save photo");
      } finally {
        setUploadingPhoto(false);
      }
    },
    [queryClient]
  );

  const handlePhotoError = useCallback((error) => {
    console.error("Upload error:", error);
    toast.error("Failed to upload photo");
    setUploadingPhoto(false);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async ({ mediaUrl }) => {
      const res = await fetch(`/api/profile/media?url=${encodeURIComponent(mediaUrl)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Media deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Failed to delete media"),
  });

  const addInterest = () => {
    if (newInterest.trim() && interests.length < 10) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest("");
    }
  };

  const removeInterest = (index) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (photos.length < 2) {
      toast.error("Please add at least 2 photos to continue");
      return;
    }

    if (interests.length < INTERESTS_CONFIG.MIN_REQUIRED) {
      toast.error(`Please select at least ${INTERESTS_CONFIG.MIN_REQUIRED} interests for better matches`);
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim(), 
          bio: bio.trim(), 
          interests: interests 
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      toast.success("Profile saved!");
      navigate("/discovery");
    } catch (e) {
      console.error(e);
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
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
    <div className="min-h-screen" style={{ backgroundColor: COLORS.lightGray }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate("/onboarding/membership")}
          className="mb-6 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white transition-all"
          style={{ color: COLORS.textLight }}
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ backgroundColor: COLORS.primary, width: progressPct }}
            />
          </div>
          <p className="text-sm mt-3 font-medium" style={{ color: COLORS.textLight }}>
            Step {stepIndex} of {totalSteps} • Profile Setup
          </p>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: COLORS.text }}>
            Create Your Profile
          </h1>
          <p className="text-lg" style={{ color: COLORS.textLight }}>
            Tell us about yourself to find compatible matches. {membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)} members can add up to {limits.photos} photos.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8 mb-6" style={{ borderColor: COLORS.border }}>
          {/* Name */}
          <div className="mb-8">
            <label className="block mb-3 text-base font-semibold" style={{ color: COLORS.text }}>
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border-2 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-purple-500 transition-colors"
              style={{ borderColor: COLORS.border }}
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Bio */}
          <div className="mb-8">
            <label className="block mb-3 text-base font-semibold" style={{ color: COLORS.text }}>
              About Me <span className="text-sm font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              className="w-full border-2 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-purple-500 resize-none transition-colors"
              style={{ borderColor: COLORS.border }}
              rows={5}
              placeholder="Share a bit about yourself, your hobbies, what you're looking for..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
            />
            <p className="text-sm mt-2" style={{ color: COLORS.textLight }}>{bio.length}/500 characters</p>
          </div>

          {/* Interests */}
          <div className="mb-0">
            <label className="block mb-3 text-base font-semibold" style={{ color: COLORS.text }}>
              Interests & Hobbies <span className="text-red-500">*</span>
              <span className="text-sm font-normal ml-2" style={{ color: COLORS.textLight }}>
                (Select at least {INTERESTS_CONFIG.MIN_REQUIRED} for matching)
              </span>
            </label>
            
            <button
              onClick={() => setShowInterestsModal(true)}
              className="w-full border-2 border-dashed rounded-xl px-6 py-5 hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center justify-center gap-3 mb-4"
              style={{ borderColor: COLORS.border, color: COLORS.primary }}
            >
              <Plus size={24} strokeWidth={2.5} />
              <span className="font-semibold text-base">Choose from {INTERESTS_CONFIG.OPTIONS.length} interests</span>
            </button>

            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {interests.map((interest, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm border"
                    style={{ backgroundColor: COLORS.lightGray, color: COLORS.text, borderColor: COLORS.border }}
                  >
                    <span>{interest}</span>
                    <button onClick={() => removeInterest(idx)} className="hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: interests.length >= INTERESTS_CONFIG.MIN_REQUIRED ? COLORS.success : COLORS.textLight }}>
                {interests.length >= INTERESTS_CONFIG.MIN_REQUIRED ? `✓ ${interests.length} interests selected` : `${interests.length}/${INTERESTS_CONFIG.MIN_REQUIRED} required`}
              </p>
              <p className="text-sm" style={{ color: COLORS.textLight }}>
                Max {INTERESTS_CONFIG.MAX_ALLOWED}
              </p>
            </div>
          </div>
        </div>

        {/* Photos Section */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8 mb-6" style={{ borderColor: COLORS.border }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.text }}>
                Profile Photos <span className="text-red-500">*</span>
              </h2>
              <p className="text-base font-medium" style={{ color: photos.length >= 2 ? COLORS.success : COLORS.textLight }}>
                {photos.length >= 2 ? `✓ ${photos.length} photos uploaded` : `${photos.length}/2 required (${2 - photos.length} more needed)`}
              </p>
            </div>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760}
              allowedFileTypes={["image/*"]}
              onGetUploadParameters={handlePhotoUpload}
              onUploadStart={handlePhotoStart}
              onComplete={handlePhotoComplete}
              onUploadError={handlePhotoError}
              buttonClassName="px-6 py-3.5 rounded-xl text-white font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity text-base whitespace-nowrap"
              buttonStyle={{ backgroundColor: COLORS.primary }}
              disabled={uploadingPhoto || photos.length >= limits.photos}
            >
              <Upload size={20} />
              {uploadingPhoto ? "Uploading..." : "Add Photo"}
            </ObjectUploader>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed" style={{ borderColor: COLORS.border, backgroundColor: COLORS.lightGray }}>
              <Upload size={56} className="mx-auto mb-4 opacity-30" style={{ color: COLORS.textLight }} />
              <p className="font-semibold text-lg mb-1" style={{ color: COLORS.text }}>No photos yet</p>
              <p className="text-sm" style={{ color: COLORS.textLight }}>Click "Add Photo" above to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group rounded-2xl overflow-hidden shadow-sm border aspect-square" style={{ borderColor: COLORS.border }}>
                  <img
                    src={photo.url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm font-medium">Photo {idx + 1}</p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate({ mediaUrl: photo.url })}
                    disabled={deleteMutation.isPending}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {uploadingPhoto && (
                <div className="relative rounded-2xl overflow-hidden shadow-sm border bg-gray-100 flex items-center justify-center aspect-square" style={{ borderColor: COLORS.border }}>
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-3 mx-auto mb-3" style={{ borderColor: COLORS.primary }}></div>
                    <p className="text-sm font-medium" style={{ color: COLORS.textLight }}>Uploading...</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="text-sm mt-4" style={{ color: COLORS.textLight }}>
            {photos.length >= limits.photos 
              ? `✓ Photo limit reached (${limits.photos}/${limits.photos})` 
              : `Upload up to ${limits.photos} photos • At least 2 required`}
          </p>
        </div>

        {/* Videos Section */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8 mb-8" style={{ borderColor: COLORS.border }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.text }}>
                Video Introduction
              </h2>
              <p className="text-base font-medium" style={{ color: COLORS.textLight }}>
                {videos.length > 0 ? `✓ ${videos.length} video uploaded` : 'Optional • Stand out with a video'}
              </p>
            </div>
            <button
              onClick={() => setShowVideoRecorder(true)}
              disabled={videos.length >= limits.videos}
              className="px-6 py-3.5 rounded-xl text-white font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity text-base whitespace-nowrap"
              style={{ backgroundColor: COLORS.secondary }}
            >
              <Camera size={20} />
              Record Video
            </button>
          </div>

          {videos.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed" style={{ borderColor: COLORS.border, backgroundColor: COLORS.lightGray }}>
              <Video size={56} className="mx-auto mb-4 opacity-30" style={{ color: COLORS.textLight }} />
              <p className="font-semibold text-lg mb-1" style={{ color: COLORS.text }}>No video yet</p>
              <p className="text-sm" style={{ color: COLORS.textLight }}>Record a short intro to stand out</p>
              <p className="text-xs mt-2" style={{ color: COLORS.textLight }}>Camera-only recording prevents catfishing</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {videos.map((video, idx) => (
                <div key={idx} className="relative group rounded-2xl overflow-hidden shadow-sm border bg-black" style={{ borderColor: COLORS.border }}>
                  <video
                    src={video.url}
                    controls
                    className="w-full h-64 object-contain"
                  />
                  <button
                    onClick={() => deleteMutation.mutate({ mediaUrl: video.url })}
                    disabled={deleteMutation.isPending}
                    className="absolute top-3 right-3 p-2.5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm mt-4" style={{ color: COLORS.textLight }}>
            Max duration: {Math.floor(limits.videoMaxDuration / 60)}:{String(limits.videoMaxDuration % 60).padStart(2, "0")} minutes
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleContinue}
          disabled={saving || !name.trim() || photos.length < 2 || interests.length < INTERESTS_CONFIG.MIN_REQUIRED}
          className="w-full py-5 rounded-2xl text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all text-lg"
          style={{ backgroundColor: COLORS.primary }}
        >
          {saving ? "Saving Your Profile..." : "Complete Profile Setup"}
        </button>

        <p className="text-sm text-center mt-6 mb-4" style={{ color: COLORS.textLight }}>
          <span className="text-red-500">*</span> Required fields
        </p>
      </div>

      {showVideoRecorder && (
        <VideoRecorderModal
          onClose={() => setShowVideoRecorder(false)}
          maxDuration={limits.videoMaxDuration}
          onComplete={() => {
            setShowVideoRecorder(false);
            queryClient.invalidateQueries({ queryKey: ["profile"] });
          }}
        />
      )}

      {showInterestsModal && (
        <InterestsModal
          selectedInterests={interests}
          onSelect={(newInterests) => {
            setInterests(newInterests);
            setShowInterestsModal(false);
          }}
          onClose={() => setShowInterestsModal(false)}
        />
      )}
    </div>
  );
}

function InterestsModal({ selectedInterests, onSelect, onClose }) {
  const [tempSelected, setTempSelected] = useState([...selectedInterests]);

  const toggleInterest = (interest) => {
    if (tempSelected.includes(interest)) {
      setTempSelected(tempSelected.filter(i => i !== interest));
    } else {
      if (tempSelected.length < INTERESTS_CONFIG.MAX_ALLOWED) {
        setTempSelected([...tempSelected, interest]);
      } else {
        toast.error(`Maximum ${INTERESTS_CONFIG.MAX_ALLOWED} interests allowed`);
      }
    }
  };

  const meetsMinimum = tempSelected.length >= INTERESTS_CONFIG.MIN_REQUIRED;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 sm:p-8 border-b" style={{ borderColor: COLORS.border }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: COLORS.text }}>
                Choose Your Interests
              </h2>
              <p className="text-base" style={{ color: COLORS.textLight }}>
                Select at least {INTERESTS_CONFIG.MIN_REQUIRED} interests for better matches
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              style={{ color: COLORS.textLight }}
            >
              <X size={28} />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <p className="text-lg font-semibold" style={{ color: meetsMinimum ? COLORS.success : COLORS.textLight }}>
              {meetsMinimum ? `✓ ${tempSelected.length} selected` : `${tempSelected.length}/${INTERESTS_CONFIG.MIN_REQUIRED} required`}
            </p>
            <p className="text-sm" style={{ color: COLORS.textLight }}>
              Max {INTERESTS_CONFIG.MAX_ALLOWED}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto flex-1" style={{ backgroundColor: COLORS.lightGray }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {INTERESTS_CONFIG.OPTIONS.map((interest) => {
              const isSelected = tempSelected.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className="px-4 py-3.5 rounded-xl font-semibold text-sm transition-all border-2 hover:scale-105"
                  style={{
                    backgroundColor: isSelected ? COLORS.primary : COLORS.white,
                    borderColor: isSelected ? COLORS.primary : COLORS.border,
                    color: isSelected ? COLORS.white : COLORS.text,
                    boxShadow: isSelected ? '0 4px 6px -1px rgba(91, 59, 175, 0.3)' : 'none',
                  }}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 sm:p-8 border-t bg-white flex flex-col sm:flex-row gap-3" style={{ borderColor: COLORS.border }}>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-xl border-2 font-semibold hover:bg-gray-50 transition-colors text-base"
            style={{ borderColor: COLORS.border, color: COLORS.text }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(tempSelected)}
            disabled={!meetsMinimum}
            className="flex-1 px-6 py-4 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: COLORS.primary }}
          >
            {meetsMinimum ? `Done (${tempSelected.length})` : `Select ${INTERESTS_CONFIG.MIN_REQUIRED - tempSelected.length} more`}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoRecorderModal({ onClose, maxDuration, onComplete }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoURL, setRecordedVideoURL] = useState(null);
  const [countdown, setCountdown] = useState(maxDuration);
  const [uploading, setUploading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    let interval;
    if (isRecording && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, countdown]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Camera access denied. Please enable camera and microphone permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startRecording = () => {
    if (!streamRef.current) {
      toast.error("Camera not ready");
      return;
    }

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp9",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedVideoURL(url);
      stopCamera();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setCountdown(maxDuration);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const redoRecording = () => {
    if (recordedVideoURL) {
      URL.revokeObjectURL(recordedVideoURL);
    }
    setRecordedVideoURL(null);
    setCountdown(maxDuration);
    startCamera();
  };

  const uploadVideo = async () => {
    if (!recordedVideoURL) return;

    setUploading(true);
    try {
      const res = await fetch("/api/objects/upload", { method: "POST" });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL } = await res.json();

      const blob = await fetch(recordedVideoURL).then((r) => r.blob());

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": "video/webm",
        },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload video");

      const saveRes = await fetch("/api/profile/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaURL: uploadURL, type: "video" }),
      });

      if (!saveRes.ok) throw new Error("Failed to save video");

      toast.success("Video uploaded successfully!");
      URL.revokeObjectURL(recordedVideoURL);
      onComplete();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
              {recordedVideoURL ? "Review Your Video" : "Record Video Introduction"}
            </h2>
            <button
              onClick={onClose}
              disabled={uploading}
              className="p-2 rounded-full hover:bg-gray-100 transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-4 rounded-xl overflow-hidden bg-black">
            {recordedVideoURL ? (
              <video src={recordedVideoURL} controls className="w-full" style={{ maxHeight: "400px" }} />
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full mirror"
                  style={{ maxHeight: "400px", transform: "scaleX(-1)" }}
                />
                {isRecording && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                  </div>
                )}
              </div>
            )}
          </div>

          {!hasPermission && !recordedVideoURL && (
            <div className="text-center py-8">
              <Camera size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-gray-600 mb-4">Waiting for camera permission...</p>
              <p className="text-sm text-gray-500">Please allow camera and microphone access to continue</p>
            </div>
          )}

          <div className="flex gap-3">
            {recordedVideoURL ? (
              <>
                <button
                  onClick={redoRecording}
                  disabled={uploading}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold transition-all border-2"
                  style={{ borderColor: COLORS.primary, color: COLORS.primary }}
                >
                  Redo
                </button>
                <button
                  onClick={uploadVideo}
                  disabled={uploading}
                  className="flex-1 px-6 py-3 rounded-lg text-white font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {uploading ? "Uploading..." : "Upload Video"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={isRecording}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold transition-all border-2"
                  style={{ borderColor: COLORS.cardBg, color: COLORS.text }}
                >
                  Cancel
                </button>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!hasPermission}
                  className="flex-1 px-6 py-3 rounded-lg text-white font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: isRecording ? COLORS.error : COLORS.primary }}
                >
                  {isRecording ? (
                    <>
                      <div className="w-4 h-4 bg-white rounded-sm"></div>
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <PlayCircle size={20} />
                      Start Recording
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <p className="text-sm text-gray-500 text-center mt-4">
            Maximum duration: {Math.floor(maxDuration / 60)}:{String(maxDuration % 60).padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConsolidatedProfileOnboarding() {
  return (
    <OnboardingGuard>
      <ConsolidatedProfileOnboardingContent />
    </OnboardingGuard>
  );
}

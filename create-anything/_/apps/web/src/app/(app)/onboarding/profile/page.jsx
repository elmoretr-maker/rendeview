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
  secondary: "#8B5CF6",
  text: "#2C3E50",
  error: "#EF4444",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
  cardBg: "#F3F4F6",
};

const INTERESTS_CONFIG = {
  MIN_REQUIRED: 0,
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
    <div className="min-h-screen px-6" style={{ backgroundColor: COLORS.white }}>
      <div className="max-w-2xl mx-auto py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/onboarding/membership")}
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
          <p className="text-sm mt-2 text-gray-600">
            Step {stepIndex} of {totalSteps}
          </p>
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.text }}>
          Create your profile
        </h1>
        <p className="text-gray-600 mb-6">
          Add your details, photos, and an intro video. {membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)} members can add up to {limits.photos} photos and {limits.videos} video{limits.videos > 1 ? "s" : ""}.
        </p>

        {/* Name */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold" style={{ color: COLORS.text }}>
            Display name *
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
            style={{ focusRing: COLORS.primary }}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold" style={{ color: COLORS.text }}>
            Bio (optional)
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 resize-none"
            style={{ focusRing: COLORS.primary }}
            rows={4}
            placeholder="Tell us about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
          />
          <p className="text-sm text-gray-500 mt-1">{bio.length}/500 characters</p>
        </div>

        {/* Interests */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold" style={{ color: COLORS.text }}>
            Interests & Hobbies (optional)
          </label>
          
          <button
            onClick={() => setShowInterestsModal(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 hover:border-purple-400 transition-colors flex items-center justify-center gap-2 mb-3"
            style={{ color: COLORS.primary }}
          >
            <Plus size={20} />
            <span className="font-medium">Choose from {INTERESTS_CONFIG.OPTIONS.length} interests</span>
          </button>

          {interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {interests.map((interest, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium"
                  style={{ backgroundColor: COLORS.lightGray, color: COLORS.text }}
                >
                  <span>{interest}</span>
                  <button onClick={() => removeInterest(idx)} className="hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500">{interests.length}/{INTERESTS_CONFIG.MAX_ALLOWED} interests selected</p>
        </div>

        {/* Photos Section */}
        <div className="mb-6 p-6 rounded-2xl shadow-md" style={{ backgroundColor: COLORS.cardBg }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>
                Photos *
              </h2>
              <p className="text-sm mt-1" style={{ color: photos.length >= 2 ? "#10B981" : COLORS.error }}>
                {photos.length >= 2 ? `✓ ${photos.length} photos uploaded` : `${photos.length}/2 photos (${2 - photos.length} more needed)`}
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
              buttonClassName="px-4 py-2 rounded-lg text-white font-semibold shadow-md flex items-center gap-2 disabled:opacity-50"
              buttonStyle={{ backgroundColor: COLORS.primary }}
              disabled={uploadingPhoto || photos.length >= limits.photos}
            >
              <Upload size={18} />
              {uploadingPhoto ? "Uploading..." : "Add Photo"}
            </ObjectUploader>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Upload size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No photos yet</p>
              <p className="text-sm mt-1">Click "Add Photo" above to upload</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden shadow-md">
                  <img
                    src={photo.url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2">
                    Photo {idx + 1}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate({ mediaUrl: photo.url })}
                    disabled={deleteMutation.isPending}
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 opacity-90"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {uploadingPhoto && (
                <div className="relative rounded-xl overflow-hidden shadow-md bg-gray-200 flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: COLORS.primary }}></div>
                    <p className="text-xs text-gray-600">Uploading...</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-3">
            {photos.length >= limits.photos 
              ? `Photo limit reached (${limits.photos}/${limits.photos})` 
              : `You can upload up to ${limits.photos} photos`}
          </p>
        </div>

        {/* Videos Section */}
        <div className="mb-6 p-6 rounded-2xl shadow-md" style={{ backgroundColor: COLORS.cardBg }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>
              Video Introduction ({videos.length}/{limits.videos})
            </h2>
            <button
              onClick={() => setShowVideoRecorder(true)}
              disabled={videos.length >= limits.videos}
              className="px-4 py-2 rounded-lg text-white font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: COLORS.secondary }}
            >
              <Camera size={18} />
              Record Video
            </button>
          </div>

          {videos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Video size={48} className="mx-auto mb-3 opacity-40" />
              <p>Optional: Record a video introduction</p>
              <p className="text-sm mt-2">Camera-only recording prevents catfishing</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {videos.map((video, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden shadow-md bg-black">
                  <video
                    src={video.url}
                    controls
                    className="w-full h-48 object-contain"
                  />
                  <button
                    onClick={() => deleteMutation.mutate({ mediaUrl: video.url })}
                    disabled={deleteMutation.isPending}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-3">
            Max duration: {Math.floor(limits.videoMaxDuration / 60)}:{String(limits.videoMaxDuration % 60).padStart(2, "0")} minutes
          </p>
        </div>

        <button
          onClick={handleContinue}
          disabled={saving || !name.trim() || photos.length < 2}
          className="w-full py-3.5 rounded-xl text-white font-semibold disabled:opacity-60"
          style={{ backgroundColor: COLORS.primary }}
        >
          {saving ? "Saving..." : "Complete Setup"}
        </button>

        <p className="text-sm text-center text-gray-500 mt-4">
          * Required fields
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
              Choose Interests
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Select up to {INTERESTS_CONFIG.MAX_ALLOWED} interests that describe you
          </p>
          <p className="text-sm mt-1" style={{ color: tempSelected.length > 0 ? COLORS.primary : COLORS.text }}>
            {tempSelected.length} selected
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INTERESTS_CONFIG.OPTIONS.map((interest) => {
              const isSelected = tempSelected.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className="px-4 py-3 rounded-lg font-medium text-sm transition-all border-2"
                  style={{
                    backgroundColor: isSelected ? COLORS.primary : COLORS.white,
                    borderColor: isSelected ? COLORS.primary : "#E5E7EB",
                    color: isSelected ? COLORS.white : COLORS.text,
                  }}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-lg border-2 border-gray-300 font-semibold hover:bg-gray-100 transition-colors"
            style={{ color: COLORS.text }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(tempSelected)}
            className="flex-1 px-6 py-3 rounded-lg text-white font-semibold shadow-md"
            style={{ backgroundColor: COLORS.primary }}
          >
            Done ({tempSelected.length})
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

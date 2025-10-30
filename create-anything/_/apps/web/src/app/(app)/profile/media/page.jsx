import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, X, Trash2, Video, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { ObjectUploader } from "@/components/ObjectUploader";

const COLORS = {
  bg: "#F9FAFB",
  text: "#111827",
  primary: "#EC4899",
  secondary: "#8B5CF6",
  error: "#EF4444",
  cardBg: "#F3F4F6",
};

const MEMBERSHIP_TIERS = {
  FREE: "free",
  CASUAL: "casual",
  DATING: "dating",
  BUSINESS: "business",
};

const getTierLimits = (tier) => {
  switch (tier?.toLowerCase()) {
    case MEMBERSHIP_TIERS.BUSINESS:
      return { photos: 10, videos: 3, videoDuration: 300 };
    case MEMBERSHIP_TIERS.DATING:
      return { photos: 8, videos: 2, videoDuration: 60 };
    case MEMBERSHIP_TIERS.CASUAL:
      return { photos: 5, videos: 1, videoDuration: 30 };
    case MEMBERSHIP_TIERS.FREE:
    default:
      return { photos: 3, videos: 1, videoDuration: 15 };
  }
};

export default function ProfileMediaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);

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

  const handlePhotoComplete = useCallback(
    async (result) => {
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
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        } catch (e) {
          console.error(e);
          toast.error("Failed to save photo");
        }
      }
    },
    [queryClient]
  );

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

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: COLORS.primary }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <AppHeader />
      <div className="px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.text }}>
            Photos & Videos
          </h1>
          <p className="text-gray-600">
            Manage your profile media. {membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)} members can upload up to {limits.photos} photos and {limits.videos} video{limits.videos > 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mb-8 p-6 rounded-2xl shadow-md" style={{ backgroundColor: "white" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>
              Photos ({photos.length}/{limits.photos})
            </h2>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760}
              allowedFileTypes={["image/*"]}
              onGetUploadParameters={handlePhotoUpload}
              onComplete={handlePhotoComplete}
              buttonClassName="px-4 py-2 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              buttonStyle={{ backgroundColor: COLORS.primary }}
            >
              <Upload size={18} />
              Add Photo
            </ObjectUploader>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Upload size={48} className="mx-auto mb-3 opacity-40" />
              <p>No photos yet. Add your first photo!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden shadow-md">
                  <img
                    src={photo.url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => deleteMutation.mutate({ mediaUrl: photo.url })}
                    disabled={deleteMutation.isPending}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
                    style={{ color: "white" }}
                  >
                    <Trash2 size={16} />
                  </button>
                  {photo.is_primary && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md text-xs font-semibold bg-white bg-opacity-90">
                      Primary
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl shadow-md" style={{ backgroundColor: "white" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>
              Videos ({videos.length}/{limits.videos})
            </h2>
            <button
              onClick={() => setShowVideoRecorder(true)}
              disabled={videos.length >= limits.videos}
              className="px-4 py-2 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: COLORS.secondary }}
            >
              <Camera size={18} />
              Record Video
            </button>
          </div>

          {videos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Video size={48} className="mx-auto mb-3 opacity-40" />
              <p>No videos yet. Record your first video introduction!</p>
              <p className="text-sm mt-2">Camera-only recording prevents catfishing</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden shadow-md bg-black">
                  <video
                    src={video.url}
                    controls
                    className="w-full h-64 object-contain"
                  />
                  <button
                    onClick={() => deleteMutation.mutate({ mediaUrl: video.url })}
                    disabled={deleteMutation.isPending}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
                    style={{ color: "white" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showVideoRecorder && (
          <VideoRecorderModal
            onClose={() => setShowVideoRecorder(false)}
            maxDuration={limits.videoDuration}
            onComplete={() => {
              setShowVideoRecorder(false);
              queryClient.invalidateQueries({ queryKey: ["profile"] });
            }}
          />
        )}
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

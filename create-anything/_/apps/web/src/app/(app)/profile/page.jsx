import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useUser } from "@/utils/useUser";
import { toast } from "sonner";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Trash2, Upload } from "lucide-react";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [days, setDays] = useState("Mon,Tue,Wed,Thu,Fri");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("21:00");
  const [immediate, setImmediate] = useState(false);
  const [override, setOverride] = useState(false);
  const [media, setMedia] = useState([]);
  const [primaryPhoto, setPrimaryPhoto] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.status === 401) {
          setError("AUTH_401");
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        const u = data.user || {};
        setName(u.name || "");
        setImmediate(!!u.immediate_available);
        setOverride(!!u.availability_override);
        setPrimaryPhoto(u.primary_photo_url || null);
        if (u.typical_availability?.timezone) {
          setTimezone(u.typical_availability.timezone);
        }
        const typical = u.typical_availability?.typical?.[0];
        if (typical) {
          setDays((typical.days || []).join(","));
          setStart(typical.start || start);
          setEnd(typical.end || end);
        }
        const m = Array.isArray(data.media) ? data.media : [];
        setMedia(m);
        const vid = m.find((x) => x.type === "video");
        setVideoUrl(vid?.url || null);
      } catch (e) {
        console.error(e);
        setError("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const save = useCallback(async () => {
    try {
      setError(null);
      const typical = [
        {
          days: days
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
          start,
          end,
        },
      ];
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          typical,
          immediate_available: immediate,
          availability_override: override,
        }),
      });
      if (res.status === 401) {
        setError("AUTH_401");
        toast.error("Session expired. Please sign in.");
        return;
      }
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile updated");
    } catch (e) {
      console.error(e);
      setError("Could not save");
      toast.error("Could not save profile");
    }
  }, [name, timezone, days, start, end, immediate, override]);

  const deleteAccount = useCallback(async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.status === 401) {
        setError("AUTH_401");
        toast.error("Session expired. Please sign in.");
        return;
      }
      if (!res.ok) throw new Error("Failed to delete account");
      toast.success("Account deleted. You will be signed out.");
      setTimeout(() => navigate("/account/signin"), 2000);
    } catch (e) {
      console.error(e);
      toast.error("Could not delete account");
    }
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      navigate("/account/signin");
    } catch (e) {
      console.error(e);
      toast.error("Could not sign out");
    }
  }, [navigate]);

  const selectPrimary = useCallback(async (url) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_photo_url: url }),
      });
      if (res.status === 401) {
        setError("AUTH_401");
        toast.error("Session expired. Please sign in.");
        return;
      }
      if (!res.ok) throw new Error("Failed to set primary");
      setPrimaryPhoto(url);
      toast.success("Primary photo set");
    } catch (e) {
      console.error(e);
      toast.error("Could not set primary photo");
    }
  }, []);

  const handlePhotoUpload = useCallback(async () => {
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
      toast.error("Failed to initiate upload");
      throw e;
    }
  }, []);

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
        const data = await res.json();
        toast.success("Photo uploaded successfully");
        window.location.reload();
      } catch (e) {
        console.error(e);
        toast.error("Failed to save photo");
      }
    }
  }, []);

  const handleVideoUpload = useCallback(async () => {
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
      toast.error("Failed to initiate upload");
      throw e;
    }
  }, []);

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
        const data = await res.json();
        toast.success("Video uploaded successfully");
        window.location.reload();
      } catch (e) {
        console.error(e);
        toast.error("Failed to save video");
      }
    }
  }, []);

  const deleteMedia = useCallback(async (mediaUrl) => {
    if (!window.confirm("Are you sure you want to delete this media?")) {
      return;
    }
    try {
      const res = await fetch(`/api/profile/media?url=${encodeURIComponent(mediaUrl)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete media");
      toast.success("Media deleted");
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error("Could not delete media");
    }
  }, []);

  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.bg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: COLORS.primary }}></div>
          <p className="mt-4" style={{ color: COLORS.text }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: COLORS.bg }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.text }}>Profile</h1>

        {error === "AUTH_401" ? (
          <div className="mb-6">
            <p className="mb-4" style={{ color: COLORS.text }}>Session expired. Please sign in.</p>
            <button
              onClick={() => navigate("/account/signin")}
              className="px-4 py-2 rounded-lg text-white font-semibold shadow-md"
              style={{ backgroundColor: COLORS.primary }}
            >
              Sign In
            </button>
          </div>
        ) : null}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold font-playfair text-xl" style={{ color: COLORS.text }}>Profile Video</p>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={52428800}
              allowedFileTypes={['video/*']}
              onGetUploadParameters={handleVideoUpload}
              onComplete={handleVideoComplete}
              buttonClassName="px-4 py-2 rounded-lg text-white font-semibold shadow-md flex items-center gap-2"
              buttonStyle={{ backgroundColor: COLORS.primary }}
            >
              <Upload size={18} />
              Upload Video
            </ObjectUploader>
          </div>
          {videoUrl ? (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                src={`/api${videoUrl}`}
                controls
                loop
                className="w-full"
                style={{ height: "220px", objectFit: "cover" }}
              />
              <button
                onClick={() => deleteMedia(videoUrl)}
                className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed p-8 text-center" style={{ borderColor: "#E5E7EB" }}>
              <p className="text-gray-500">No video uploaded yet. Upload a video to help others get to know you!</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold font-playfair text-xl" style={{ color: COLORS.text }}>Your Photos</p>
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={10485760}
              allowedFileTypes={['image/*']}
              onGetUploadParameters={handlePhotoUpload}
              onComplete={handlePhotoComplete}
              buttonClassName="px-4 py-2 rounded-lg text-white font-semibold shadow-md flex items-center gap-2"
              buttonStyle={{ backgroundColor: COLORS.primary }}
            >
              <Upload size={18} />
              Upload Photos
            </ObjectUploader>
          </div>
          {media.filter((m) => m.type === "photo").length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {media
                .filter((m) => m.type === "photo")
                .map((m, idx) => {
                  const isPrimary = m.url === primaryPhoto;
                  return (
                    <div key={idx} className="relative">
                      <button
                        onClick={() => selectPrimary(m.url)}
                        className="relative block"
                      >
                        <img
                          src={`/api${m.url}`}
                          alt="Profile"
                          className="w-32 h-32 rounded-lg object-cover"
                          style={{ border: `3px solid ${isPrimary ? COLORS.primary : "#E5E7EB"}` }}
                        />
                        <p className="text-xs text-center mt-1 font-semibold" style={{ color: isPrimary ? COLORS.primary : "#6B7280" }}>
                          {isPrimary ? "★ Primary" : "Set Primary"}
                        </p>
                      </button>
                      <button
                        onClick={() => deleteMedia(m.url)}
                        className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed p-8 text-center" style={{ borderColor: "#E5E7EB" }}>
              <p className="text-gray-500">No photos uploaded yet. Add photos to make your profile stand out!</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-2" style={{ color: COLORS.text }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full border rounded-lg px-4 py-2 bg-white"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-2" style={{ color: COLORS.text }}>Timezone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/New_York"
              className="w-full border rounded-lg px-4 py-2 bg-white"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-2" style={{ color: COLORS.text }}>Typical Availability</label>
            <input
              type="text"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Mon,Tue,Wed,Thu,Fri"
              className="w-full border rounded-lg px-4 py-2 bg-white mb-2"
              style={{ borderColor: "#E5E7EB" }}
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                placeholder="18:00"
                className="flex-1 border rounded-lg px-4 py-2 bg-white"
                style={{ borderColor: "#E5E7EB" }}
              />
              <input
                type="text"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                placeholder="21:00"
                className="flex-1 border rounded-lg px-4 py-2 bg-white"
                style={{ borderColor: "#E5E7EB" }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <span style={{ color: COLORS.text }}>Immediate Availability</span>
            <button
              onClick={() => setImmediate(!immediate)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                immediate ? "bg-purple-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  immediate ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <span style={{ color: COLORS.text }}>Appear Offline (Override)</span>
            <button
              onClick={() => setOverride(!override)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                override ? "bg-purple-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  override ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {error && error !== "AUTH_401" && (
            <p style={{ color: COLORS.error }}>{error}</p>
          )}

          <button
            onClick={save}
            className="w-full py-3 rounded-lg text-white font-semibold"
            style={{ backgroundColor: COLORS.primary }}
          >
            Save
          </button>

          <button
            onClick={deleteAccount}
            className="w-full py-3 rounded-lg font-semibold"
            style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
          >
            Delete Account
          </button>

          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-lg font-semibold border"
            style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", borderColor: "#FCA5A5" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, X, Video } from "lucide-react";
import { toast } from "sonner";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function RemoteProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const targetId = Number(userId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["remote-profile", targetId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${targetId}`);
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const media = data?.media || [];
  const user = data?.user || {};
  const video = media.find((m) => m.type === "video");
  const typical = user?.typical_availability?.typical || [];
  const timezone = user?.typical_availability?.timezone || user?.timezone;

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/matches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likedId: targetId }),
      });
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      if (resp?.matched) {
        toast.success("It's a match! You can now chat and schedule.");
      } else {
        toast.success("Liked! We'll let you know if they like you back.");
      }
    },
    onError: () => toast.error("Unable to like this profile"),
  });

  const discardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: targetId }),
      });
      if (!res.ok) throw new Error("Failed to discard");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      toast.success("Profile hidden");
      navigate(-1);
    },
    onError: () => toast.error("Could not discard profile"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.bg }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: COLORS.primary }}></div>
      </div>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: COLORS.bg }}>
        <div className="max-w-2xl mx-auto">
          <p className="mb-4">Session expired. Please sign in.</p>
          <button
            onClick={() => navigate("/account/signin")}
            className="px-4 py-2 rounded-lg text-white font-semibold"
            style={{ backgroundColor: COLORS.primary }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: COLORS.bg }}>
        <p className="text-red-600">Error loading profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: COLORS.bg }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>
          {user?.name || `User ${user?.id}`}
        </h1>

        {/* Primary photo */}
        {user?.primary_photo_url && (
          <img
            src={user.primary_photo_url}
            alt={user.name}
            className="w-full h-64 rounded-2xl object-cover mb-4"
            style={{ backgroundColor: COLORS.cardBg }}
          />
        )}

        {/* Video */}
        {video?.url && (
          <div className="rounded-xl overflow-hidden bg-black mb-4">
            <video src={video.url} controls loop className="w-full" style={{ height: "220px" }} />
          </div>
        )}

        {/* Photos */}
        <h3 className="font-bold mt-4 mb-2" style={{ color: COLORS.text }}>Photos</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {media
            .filter((m) => m.type === "photo")
            .map((m, idx) => (
              <img
                key={idx}
                src={m.url}
                alt="Profile"
                className="w-24 h-24 rounded-lg object-cover"
                style={{ backgroundColor: COLORS.cardBg }}
              />
            ))}
        </div>

        {/* About */}
        <h3 className="font-bold mt-4 mb-2" style={{ color: COLORS.text }}>About</h3>
        <p className="opacity-80 mb-4" style={{ color: COLORS.text }}>No bio provided.</p>

        {/* Availability */}
        <h3 className="font-bold mb-2" style={{ color: COLORS.text }}>Typical Availability</h3>
        {typical.length > 0 ? (
          typical.map((slot, i) => (
            <p key={i} style={{ color: COLORS.text }}>
              {(slot.days || []).join(", ")} • {slot.start} - {slot.end}
            </p>
          ))
        ) : (
          <p className="opacity-60" style={{ color: COLORS.text }}>Not shared</p>
        )}
        {timezone && (
          <p className="opacity-60 mt-1" style={{ color: COLORS.text }}>Timezone: {timezone}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-6 justify-center">
          <button
            onClick={() => discardMutation.mutate()}
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-bold shadow-md"
            style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
          >
            <X size={20} style={{ color: COLORS.error }} />
            Discard
          </button>
          <button
            onClick={() => likeMutation.mutate()}
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-bold shadow-md"
            style={{ backgroundColor: "#EDE7FF", color: COLORS.primary }}
          >
            <Heart size={20} style={{ color: COLORS.primary }} />
            Like
          </button>
          <button
            onClick={() => toast.info("Scheduling requires video chat setup")}
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-white shadow-md"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Video size={20} />
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

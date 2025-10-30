import React from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, X, Video, ArrowLeft } from "lucide-react";
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      toast.success("Profile hidden");
      
      if (data?.warning) {
        toast.warning(data.warning, { duration: 6000 });
      }
      
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
        {/* Header with name and membership tier */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.text }}>
            {user?.name || `User ${user?.id}`}
          </h1>
          {user?.membership_tier && (
            <span 
              className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
              style={{ 
                backgroundColor: COLORS.primary + "20", 
                color: COLORS.primary 
              }}
            >
              {user.membership_tier.charAt(0).toUpperCase() + user.membership_tier.slice(1)} Member
            </span>
          )}
        </div>

        {/* Primary photo */}
        {user?.primary_photo_url && (
          <div className="mb-6 shadow-lg rounded-2xl overflow-hidden">
            <img
              src={user.primary_photo_url}
              alt={user.name}
              className="w-full h-96 object-cover"
              style={{ backgroundColor: COLORS.cardBg }}
            />
          </div>
        )}

        {/* About section - prominently displayed */}
        {user?.bio && (
          <div className="mb-6 p-6 rounded-2xl shadow-md" style={{ backgroundColor: "white" }}>
            <h3 className="font-bold text-xl mb-3" style={{ color: COLORS.text }}>About</h3>
            <p className="text-base leading-relaxed" style={{ color: COLORS.text }}>
              {user.bio}
            </p>
          </div>
        )}

        {/* Video */}
        {video?.url && (
          <div className="mb-6">
            <h3 className="font-bold text-xl mb-3" style={{ color: COLORS.text }}>Video Introduction</h3>
            <div className="rounded-2xl overflow-hidden bg-black shadow-lg">
              <video src={video.url} controls loop className="w-full" style={{ maxHeight: "400px" }} />
            </div>
          </div>
        )}

        {/* Photo gallery */}
        {media.filter((m) => m.type === "photo").length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-xl mb-3" style={{ color: COLORS.text }}>
              Photos ({media.filter((m) => m.type === "photo").length})
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {media
                .filter((m) => m.type === "photo")
                .map((m, idx) => (
                  <img
                    key={idx}
                    src={m.url}
                    alt="Profile"
                    className="w-full h-32 rounded-xl object-cover shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    style={{ backgroundColor: COLORS.cardBg }}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Availability */}
        <div className="mb-6 p-6 rounded-2xl shadow-md" style={{ backgroundColor: "white" }}>
          <h3 className="font-bold text-xl mb-3" style={{ color: COLORS.text }}>Availability</h3>
          {typical.length > 0 ? (
            <div className="space-y-2">
              {typical.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: COLORS.secondary }}
                  ></span>
                  <p style={{ color: COLORS.text }}>
                    {(slot.days || []).join(", ")} • {slot.start} - {slot.end}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="opacity-60" style={{ color: COLORS.text }}>Availability not shared</p>
          )}
          {timezone && (
            <p className="opacity-60 mt-3 text-sm" style={{ color: COLORS.text }}>
              Timezone: {timezone}
            </p>
          )}
          {user?.immediate_available && (
            <div 
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: COLORS.secondary + "20", color: COLORS.secondary }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: COLORS.secondary }}></span>
              Available now
            </div>
          )}
        </div>

        {/* Action buttons - improved styling */}
        <div className="flex gap-4 mt-8 justify-center sticky bottom-8 flex-wrap">
          <button
            onClick={() => navigate("/discovery")}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: "white", color: COLORS.text }}
          >
            <ArrowLeft size={24} style={{ color: COLORS.text }} />
            Back
          </button>
          <button
            onClick={() => discardMutation.mutate()}
            disabled={discardMutation.isPending}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            style={{ backgroundColor: "white", color: COLORS.text }}
          >
            <X size={24} style={{ color: COLORS.error }} />
            Pass
          </button>
          <button
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            style={{ backgroundColor: "#EDE7FF", color: COLORS.primary }}
          >
            <Heart size={24} style={{ color: COLORS.primary }} />
            Like
          </button>
          <button
            onClick={() => navigate(`/schedule/propose/${targetId}`)}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-white shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Video size={24} />
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

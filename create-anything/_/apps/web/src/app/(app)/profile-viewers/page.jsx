import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, X, Eye } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import MatchCelebration from "@/components/MatchCelebration";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function ProfileViewers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [matchedUser, setMatchedUser] = React.useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["profileViewers"],
    queryFn: async () => {
      const res = await fetch("/api/profile-views");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profile viewers");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (likedId) => {
      const res = await fetch("/api/matches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likedId }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: (data, likedId) => {
      queryClient.invalidateQueries({ queryKey: ["profileViewers"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      
      if (data?.matched) {
        const likedViewer = viewers.find(v => v.user.id === likedId);
        setMatchedUser({
          name: likedViewer?.user.name,
          photo: likedViewer?.user.photo,
        });
        setShowCelebration(true);
      } else {
        toast.success("Profile liked!");
      }
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Session expired. Please sign in.");
        navigate("/account/signin");
        return;
      }
      toast.error("Could not like profile");
    },
  });

  const passMutation = useMutation({
    mutationFn: async (blockedId) => {
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to pass");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profileViewers"] });
      toast.success("Profile passed");
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Session expired. Please sign in.");
        navigate("/account/signin");
        return;
      }
      toast.error("Could not pass profile");
    },
  });

  const viewers = data?.viewers || [];

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: COLORS.primary }}></div>
        </div>
      </div>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="px-4 py-8 max-w-2xl mx-auto">
          <p className="mb-4" style={{ color: COLORS.text }}>Session expired. Please sign in.</p>
          <button
            onClick={() => navigate("/account/signin")}
            className="px-4 py-2 rounded-lg text-white font-semibold shadow-md"
            style={{ backgroundColor: COLORS.primary }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <AppHeader />
      
      <div className="px-4 py-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye size={28} style={{ color: COLORS.primary }} />
            <h1 className="text-3xl font-bold" style={{ color: COLORS.text }}>
              Profile Viewers
            </h1>
          </div>
          <p className="text-gray-600">
            See who's been checking out your profile
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Recent viewers from the last 7 days
          </p>
        </div>

        {viewers.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: COLORS.text }}>No profile views yet. Keep being active!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {viewers.map((viewer) => (
              <div
                key={viewer.user.id}
                className="rounded-xl shadow-md overflow-hidden"
                style={{ backgroundColor: "white" }}
              >
                <div className="flex items-center p-4">
                  <button
                    onClick={() => navigate(`/profile/${viewer.user.id}`)}
                    className="flex items-center flex-1"
                  >
                    {viewer.user.photo ? (
                      <img
                        src={viewer.user.photo}
                        alt={viewer.user.name || "User"}
                        className="w-20 h-20 rounded-full object-cover bg-gray-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-200"></div>
                    )}
                    <div className="ml-4 flex-1 text-left">
                      <p className="font-bold text-lg" style={{ color: COLORS.text }}>
                        {viewer.user.name || `User ${viewer.user.id}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        Viewed {new Date(viewer.viewed_at).toLocaleDateString()} at{" "}
                        {new Date(viewer.viewed_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {viewer.user.immediate_available && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-xs text-green-600 font-semibold">Online Now</span>
                          </div>
                        )}
                        {viewer.user.membership_tier && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
                          >
                            {viewer.user.membership_tier.charAt(0).toUpperCase() + viewer.user.membership_tier.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Bio preview */}
                {viewer.user.bio && (
                  <div className="px-4 pb-3">
                    <p className="text-sm text-gray-700 line-clamp-2">{viewer.user.bio}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => passMutation.mutate(viewer.user.id)}
                    disabled={passMutation.isPending || likeMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition-colors disabled:opacity-50"
                    style={{ 
                      color: COLORS.error,
                      backgroundColor: passMutation.isPending ? COLORS.cardBg : "transparent"
                    }}
                  >
                    <X size={20} />
                    <span>Pass</span>
                  </button>
                  <div className="w-px" style={{ backgroundColor: "#E5E7EB" }}></div>
                  <button
                    onClick={() => likeMutation.mutate(viewer.user.id)}
                    disabled={likeMutation.isPending || passMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition-colors disabled:opacity-50"
                    style={{ 
                      color: COLORS.secondary,
                      backgroundColor: likeMutation.isPending ? COLORS.cardBg : "transparent"
                    }}
                  >
                    <Heart size={20} />
                    <span>Like</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MatchCelebration
        show={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          navigate("/new-matches");
        }}
        matchedUser={matchedUser}
        onViewMatches={() => {
          setShowCelebration(false);
          navigate("/new-matches");
        }}
      />
    </div>
  );
}

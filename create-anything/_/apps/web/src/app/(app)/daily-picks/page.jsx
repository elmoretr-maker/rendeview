import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, X, Sparkles } from "lucide-react";
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

export default function DailyPicks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [matchedUser, setMatchedUser] = React.useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dailyPicks"],
    queryFn: async () => {
      const res = await fetch("/api/daily-picks");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load daily picks");
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
      queryClient.invalidateQueries({ queryKey: ["dailyPicks"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      
      if (data?.matched) {
        const likedPick = picks.find(p => p.id === likedId);
        setMatchedUser({
          name: likedPick?.name,
          photo: likedPick?.photo,
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
      queryClient.invalidateQueries({ queryKey: ["dailyPicks"] });
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

  const picks = data?.picks || [];
  const generated = data?.generated || false;

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
            <Sparkles size={28} style={{ color: COLORS.primary }} />
            <h1 className="text-3xl font-bold" style={{ color: COLORS.text }}>
              Daily Picks
            </h1>
          </div>
          <p className="text-gray-600">
            {generated ? "Fresh" : "Today's"} curated matches just for you
          </p>
          <p className="text-sm text-gray-500 mt-1">
            10 compatible profiles selected daily based on your interests and activity
          </p>
        </div>

        {picks.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: COLORS.text }}>No picks available today. Check back tomorrow!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {picks.map((pick) => (
              <div
                key={pick.id}
                className="rounded-xl shadow-md overflow-hidden"
                style={{ backgroundColor: "white" }}
              >
                <button
                  onClick={() => navigate(`/profile/${pick.id}`)}
                  className="w-full"
                >
                  {pick.photo ? (
                    <div className="relative">
                      <img
                        src={pick.photo}
                        alt={pick.name || "User"}
                        className="w-full h-64 object-cover"
                        style={{ backgroundColor: COLORS.cardBg }}
                      />
                      {/* Gradient overlay */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-24"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}
                      />
                      
                      {/* Profile info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-xl font-bold">
                            {pick.name || `User ${pick.id}`}
                          </h3>
                          {pick.immediate_available && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                              <span className="text-xs font-semibold">Online</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Compatibility score */}
                        <div className="flex items-center gap-2">
                          <div 
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: COLORS.secondary, color: "white" }}
                          >
                            {Math.round(pick.compatibility_score * 100)}% Match
                          </div>
                          {pick.membership_tier && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                            >
                              {pick.membership_tier.charAt(0).toUpperCase() + pick.membership_tier.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-full h-64 flex items-center justify-center"
                      style={{ backgroundColor: COLORS.cardBg }}
                    >
                      <span className="text-gray-600">No Photo</span>
                    </div>
                  )}
                </button>

                {/* Bio preview */}
                {pick.bio && (
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm text-gray-700 line-clamp-2">{pick.bio}</p>
                  </div>
                )}

                {/* Interests */}
                {pick.interests && pick.interests.length > 0 && (
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="flex flex-wrap gap-1.5">
                      {pick.interests.slice(0, 3).map((interest, idx) => (
                        <span 
                          key={idx}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
                        >
                          {interest}
                        </span>
                      ))}
                      {pick.interests.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{pick.interests.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => passMutation.mutate(pick.id)}
                    disabled={passMutation.isPending || likeMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition-colors disabled:opacity-50"
                    style={{ color: COLORS.error }}
                  >
                    <X size={20} />
                    <span>Pass</span>
                  </button>
                  <div className="w-px" style={{ backgroundColor: "#E5E7EB" }}></div>
                  <button
                    onClick={() => likeMutation.mutate(pick.id)}
                    disabled={likeMutation.isPending || passMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition-colors disabled:opacity-50"
                    style={{ color: COLORS.secondary }}
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

import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { Heart, Sparkles, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function NewMatches() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useUser();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["newMatches"],
    queryFn: async () => {
      const res = await fetch("/api/new-matches");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load new matches");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const markViewedMutation = useMutation({
    mutationFn: async (matchId) => {
      const res = await fetch("/api/mark-match-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (!res.ok) throw new Error("Failed to mark as viewed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      refetch();
    },
  });

  const matches = data?.matches || [];

  const handleViewMatch = async (matchId) => {
    await markViewedMutation.mutateAsync(matchId);
    navigate(`/messages/${matchId}`);
  };

  React.useEffect(() => {
    if (error?.message === "AUTH_401") {
      toast.error("Session expired. Please sign in.");
    }
  }, [error]);

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: COLORS.primary }}></div>
            <p className="mt-4" style={{ color: COLORS.text }}>Loading your new matches...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>New Matches</h1>
          <div>
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>New Matches</h1>
          <p style={{ color: COLORS.error }}>Error loading new matches</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <AppHeader />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <Heart 
                size={80} 
                className="mx-auto mb-4"
                style={{ color: COLORS.primary }}
                fill={COLORS.primary}
              />
            </motion.div>
            <h1 className="text-3xl font-bold mb-4" style={{ color: COLORS.text }}>
              No New Matches Yet
            </h1>
            <p className="text-lg mb-6" style={{ color: COLORS.text }}>
              Keep swiping in Discovery to find your next connection!
            </p>
            <button
              onClick={() => navigate("/discovery")}
              className="px-6 py-3 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: COLORS.primary }}
            >
              Go to Discovery
            </button>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles size={32} style={{ color: COLORS.secondary }} />
                <h1 className="text-3xl font-bold" style={{ color: COLORS.text }}>
                  You Have {matches.length} New {matches.length === 1 ? "Match" : "Matches"}!
                </h1>
                <Sparkles size={32} style={{ color: COLORS.secondary }} />
              </div>
              <p className="text-lg" style={{ color: COLORS.text }}>
                Start a conversation and make a connection!
              </p>
            </motion.div>

            <div className="space-y-4">
              {matches.map((item, idx) => (
                <motion.div
                  key={item.match_id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <button
                    onClick={() => handleViewMatch(item.match_id)}
                    disabled={markViewedMutation.isPending}
                    className="w-full p-6 rounded-2xl hover:shadow-xl transition-all transform hover:scale-102 relative overflow-hidden"
                    style={{ 
                      backgroundColor: "white",
                      border: `2px solid ${COLORS.secondary}`
                    }}
                  >
                    <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-white text-xs font-bold"
                      style={{ backgroundColor: COLORS.secondary }}>
                      NEW
                    </div>
                    
                    <div className="flex items-center">
                      {item.user.photo ? (
                        <div className="relative">
                          <img
                            src={item.user.photo}
                            alt={item.user.name || "User"}
                            className="w-20 h-20 rounded-full ring-4"
                            style={{ ringColor: COLORS.secondary }}
                          />
                          <div 
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: COLORS.secondary }}
                          >
                            <Heart size={16} fill="white" color="white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 ring-4"
                          style={{ ringColor: COLORS.secondary }}>
                        </div>
                      )}
                      <div className="ml-4 flex-1 text-left">
                        <p className="text-2xl font-bold mb-1" style={{ color: COLORS.text }}>
                          {item.user.name || `User ${item.user.id}`}
                        </p>
                        <p className="text-sm mb-2" style={{ color: "#666" }}>
                          Matched {new Date(item.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full inline-block"
                          style={{ backgroundColor: COLORS.primary + "20" }}>
                          <MessageCircle size={16} style={{ color: COLORS.primary }} />
                          <span className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                            Start Chatting
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center mt-8"
            >
              <p className="text-sm mb-4" style={{ color: "#666" }}>
                After you start a conversation, these matches will move to your Matches page
              </p>
              <button
                onClick={() => navigate("/matches")}
                className="px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
              >
                View All Matches
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function Discovery() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: user, loading: userLoading } = useUser();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["discovery"],
    queryFn: async () => {
      const res = await fetch("/api/discovery/list");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profiles");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [data]);

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
    onSuccess: () => {
      setIndex((i) => i + 1);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      toast.success("Profile liked!");
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required", {
          description: "Please sign in to continue.",
        });
        navigate("/account/signin");
        return;
      }
      toast.error("Could not perform action");
    },
  });

  const discardMutation = useMutation({
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
      if (!res.ok) throw new Error("Failed to discard");
      return res.json();
    },
    onSuccess: (data) => {
      setIndex((i) => i + 1);
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      
      if (data?.warning) {
        toast.warning(data.warning, { duration: 6000 });
      }
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required", {
          description: "Please sign in to continue.",
        });
        navigate("/account/signin");
        return;
      }
      toast.error("Could not discard profile");
    },
  });

  const profiles = data?.profiles || [];
  const current = profiles[index];

  if (userLoading || isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-20 px-4" style={{ backgroundColor: COLORS.bg }}>
        {error?.message === "AUTH_401" ? (
          <div>
            <p className="mb-3 text-gray-700">
              Session expired. Please sign in.
            </p>
            <button
              onClick={() => navigate("/account/signin")}
              className="px-4 py-2 rounded-lg text-white font-semibold shadow-lg"
              style={{ backgroundColor: COLORS.primary }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <p className="text-gray-700">Error loading profiles</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: COLORS.bg }}
    >
      <AppHeader />
      <div className="pt-4 px-4">
        <h1
          className="text-2xl font-playfair font-bold mb-3 text-center"
          style={{ color: COLORS.text }}
        >
          Discover Your Match
        </h1>
      {current ? (
        <div className="flex flex-col items-center max-w-md mx-auto pb-8">
          {/* Profile Card */}
          <div 
            className="w-full rounded-3xl shadow-2xl overflow-hidden relative mb-6"
            style={{ backgroundColor: "white" }}
          >
            <button
              onClick={() => navigate(`/profile/${current.id}`)}
              className="w-full relative"
            >
              {current.photo ? (
                <div className="relative">
                  <img
                    src={current.photo}
                    alt={current.name || `User ${current.id}`}
                    className="w-full h-[500px] object-cover"
                    style={{ backgroundColor: COLORS.cardBg }}
                  />
                  {/* Gradient overlay for text readability */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-32"
                    style={{ 
                      background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" 
                    }}
                  />
                </div>
              ) : (
                <div
                  className="w-full h-[500px] flex items-center justify-center"
                  style={{ backgroundColor: COLORS.cardBg }}
                >
                  <span className="text-gray-600">View Profile</span>
                </div>
              )}
              
              {/* Profile info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-3xl font-bold">
                    {current.name || "User " + current.id}
                  </h2>
                  {current.immediate_available && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      <span className="text-xs font-semibold">Online</span>
                    </div>
                  )}
                </div>
                {current.membership_tier && (
                  <span 
                    className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-2"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
                  >
                    {current.membership_tier.charAt(0).toUpperCase() + current.membership_tier.slice(1)}
                  </span>
                )}
                {current.bio && (
                  <p className="text-sm opacity-90 line-clamp-2 mt-2">
                    {current.bio}
                  </p>
                )}
              </div>
            </button>

            {/* Tap to view full profile hint */}
            <div className="px-6 py-4 text-center border-t border-gray-100">
              <p className="text-sm opacity-60" style={{ color: COLORS.text }}>
                Tap photo to view full profile
              </p>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="flex gap-3 items-center justify-center mb-4">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="px-4 py-2 rounded-full flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: "white", color: COLORS.text }}
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <span className="text-sm font-medium" style={{ color: COLORS.text }}>
              {index + 1} of {profiles.length}
            </span>
            <button
              onClick={() => setIndex((i) => Math.min(profiles.length - 1, i + 1))}
              disabled={index >= profiles.length - 1}
              className="px-4 py-2 rounded-full flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: "white", color: COLORS.text }}
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-6 items-center justify-center">
            <button
              onClick={() => discardMutation.mutate(current.id)}
              disabled={discardMutation.isPending}
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              style={{ backgroundColor: "white" }}
            >
              <X color={COLORS.error} size={32} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => likeMutation.mutate(current.id)}
              disabled={likeMutation.isPending}
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Heart color="white" size={36} fill="white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
          <p className="text-gray-600 mb-3">No more profiles.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg text-white font-semibold shadow-lg"
            style={{ backgroundColor: COLORS.primary }}
          >
            Refresh
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Heart } from "lucide-react";
import { useNavigate } from "react-router";
import useUser from "@/utils/useUser";
import { toast } from "sonner";

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
    onSuccess: () => {
      setIndex((i) => i + 1);
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
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
      className="min-h-screen pt-12 px-4"
      style={{ backgroundColor: COLORS.bg }}
    >
      <h1
        className="text-2xl font-bold mb-3"
        style={{ color: COLORS.text }}
      >
        Discover
      </h1>
      {current ? (
        <div className="flex flex-col items-center">
          <button
            onClick={() => navigate(`/profile/${current.id}`)}
            className="w-full max-w-md"
          >
            {current.photo ? (
              <img
                src={current.photo}
                alt={current.name || `User ${current.id}`}
                className="w-full h-96 rounded-2xl object-cover"
                style={{ backgroundColor: COLORS.cardBg }}
              />
            ) : (
              <div
                className="w-full h-96 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: COLORS.cardBg }}
              >
                <span className="text-gray-600">View Profile</span>
              </div>
            )}
          </button>
          <h2 className="text-lg font-semibold mt-3" style={{ color: COLORS.text }}>
            {current.name || "User " + current.id}
          </h2>
          <div className="flex gap-4 mt-5">
            <button
              onClick={() => discardMutation.mutate(current.id)}
              disabled={discardMutation.isPending}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
              style={{ backgroundColor: COLORS.cardBg }}
            >
              <X color={COLORS.error} size={28} />
            </button>
            <button
              onClick={() => likeMutation.mutate(current.id)}
              disabled={likeMutation.isPending}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
              style={{ backgroundColor: "#EDE7FF" }}
            >
              <Heart color={COLORS.primary} size={28} />
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
  );
}

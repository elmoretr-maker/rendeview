import React from "react";
import { useNavigate, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

function MatchesContent() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading} = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches/all");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const matches = data?.matches || [];

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
            <p className="mt-4" style={{ color: COLORS.text }}>Loading...</p>
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
          <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>Matches</h1>
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
          <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>Matches</h1>
          <p style={{ color: COLORS.error }}>Error loading matches</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <AppHeader />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>Matches</h1>
          <Link
            to="/matches/likers"
            className="px-4 py-2 rounded-lg font-semibold shadow-md"
            style={{ backgroundColor: "#EDE7FF", color: COLORS.primary }}
          >
            View Likers
          </Link>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: COLORS.text }}>You have no matches yet. Start exploring the Discovery feed!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((item) => (
              <button
                key={item.match_id}
                onClick={() => navigate(`/messages/${item.match_id}`)}
                className="w-full flex items-center py-3 px-4 rounded-lg hover:bg-white transition-colors"
                style={{ backgroundColor: COLORS.cardBg, borderBottom: `1px solid ${COLORS.cardBg}` }}
              >
                {item.user.photo ? (
                  <img
                    src={item.user.photo}
                    alt={item.user.name || "User"}
                    className="w-12 h-12 rounded-full bg-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                )}
                <div className="ml-3 text-left">
                  <p className="font-semibold" style={{ color: COLORS.text }}>
                    {item.user.name || `User ${item.user.id}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.last_chat_at ? "Active chat" : "New match"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Matches() {
  return (
    <ErrorBoundary componentName="Matches">
      <MatchesContent />
    </ErrorBoundary>
  );
}

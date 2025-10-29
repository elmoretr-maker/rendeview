import React from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function Likers() {
  const navigate = useNavigate();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["likers"],
    queryFn: async () => {
      const res = await fetch("/api/matches/likers");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load likers");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const likers = data?.likers || [];

  React.useEffect(() => {
    if (error?.message === "AUTH_401") {
      toast.error("Session expired. Please sign in.");
    }
  }, [error]);

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: COLORS.bg }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.text }}>Likers</h1>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: COLORS.primary }}></div>
          </div>
        ) : error?.message === "AUTH_401" ? (
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
        ) : error ? (
          <p style={{ color: COLORS.error }}>Error loading likers</p>
        ) : likers.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: COLORS.text }}>No likers yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {likers.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center py-3 px-4 rounded-lg"
                style={{ backgroundColor: COLORS.cardBg, borderBottom: `1px solid #E5E7EB` }}
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
                <div className="ml-3">
                  <p className="font-semibold" style={{ color: COLORS.text }}>
                    {item.user.name || `User ${item.user.id}`}
                  </p>
                  <p className="text-sm text-gray-500">liked you</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

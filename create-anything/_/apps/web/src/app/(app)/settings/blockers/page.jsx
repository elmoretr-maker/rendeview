import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Blockers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["blockers"],
    queryFn: async () => {
      const res = await fetch("/api/blockers");
      if (!res.ok) throw new Error("Failed to load blockers");
      return res.json();
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockedId) => {
      const res = await fetch("/api/blockers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId }),
      });
      if (!res.ok) throw new Error("Failed to unblock");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockers"] });
      toast.success("User unblocked");
    },
    onError: () => toast.error("Could not unblock"),
  });

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    navigate("/account/signin");
  };

  const blockers = data?.blockers || [];

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Blocked Users</h1>
        
        <button
          onClick={handleSignOut}
          className="ml-auto mb-4 px-3 py-2 rounded-lg font-bold border"
          style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", borderColor: "#FCA5A5" }}
        >
          Sign Out
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "#5B3BAF" }}></div>
          </div>
        ) : error ? (
          <p className="text-red-600">Error loading blocked users</p>
        ) : blockers.length === 0 ? (
          <p className="text-center text-gray-600 py-12">No blocked users</p>
        ) : (
          <div className="space-y-3">
            {blockers.map((item) => (
              <div
                key={item.id}
                className="flex items-center py-3 px-4 rounded-lg border-b"
                style={{ borderColor: "#F3F4F6" }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name || "User"}
                    className="w-12 h-12 rounded-full bg-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                )}
                <div className="ml-3 flex-1">
                  <p className="font-semibold">{item.name || `User ${item.blocked_id}`}</p>
                </div>
                <button
                  onClick={() => unblockMutation.mutate(item.blocked_id)}
                  className="px-3 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: "#ECE8FF", color: "#6855FF" }}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

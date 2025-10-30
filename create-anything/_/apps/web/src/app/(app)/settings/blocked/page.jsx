import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { Calendar, Save, Trash2 } from "lucide-react";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function BlockedUsers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["blockers"],
    queryFn: async () => {
      const res = await fetch("/api/blockers");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load blocked users");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ blockedId, notes }) => {
      const res = await fetch("/api/blockers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId, notes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      return res.json();
    },
    onSuccess: (_, { blockedId }) => {
      queryClient.invalidateQueries({ queryKey: ["blockers"] });
      setEditingNotes(prev => {
        const updated = { ...prev };
        delete updated[blockedId];
        return updated;
      });
      toast.success("Notes saved");
    },
    onError: () => toast.error("Could not save notes"),
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
    onError: () => toast.error("Could not unblock user"),
  });

  const handleNotesChange = (blockedId, value) => {
    setEditingNotes(prev => ({
      ...prev,
      [blockedId]: value,
    }));
  };

  const handleSaveNotes = (blockedId) => {
    const notes = editingNotes[blockedId];
    updateNotesMutation.mutate({ blockedId, notes });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const blockers = data?.blockers || [];

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
              style={{ borderColor: COLORS.primary }}
            ></div>
            <p className="mt-4" style={{ color: COLORS.text }}>
              Loading...
            </p>
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
          <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>
            Blocked Users
          </h1>
          <div>
            <p className="mb-4" style={{ color: COLORS.text }}>
              Session expired. Please sign in.
            </p>
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
          <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>
            Blocked Users
          </h1>
          <p style={{ color: COLORS.error }}>Error loading blocked users</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>
            Blocked Users
          </h1>
          <p className="text-sm mt-1 text-gray-600">
            Manage your blocked users and add private notes
          </p>
        </div>

        {blockers.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl"
            style={{ backgroundColor: "white" }}
          >
            <p style={{ color: COLORS.text }}>No blocked users</p>
          </div>
        ) : (
          <div className="space-y-4">
            {blockers.map((item) => {
              const currentNotes =
                editingNotes[item.blocked_id] !== undefined
                  ? editingNotes[item.blocked_id]
                  : item.notes || "";
              const hasUnsavedChanges = editingNotes[item.blocked_id] !== undefined;

              return (
                <div
                  key={item.id}
                  className="rounded-xl p-4 shadow-sm border"
                  style={{
                    backgroundColor: "white",
                    borderColor: "#E5E7EB",
                  }}
                >
                  <div className="flex items-start gap-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || "User"}
                        className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0"></div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-lg" style={{ color: COLORS.text }}>
                            {item.name || `User ${item.blocked_id}`}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar size={14} />
                            <span>Blocked on {formatDate(item.created_at)}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => unblockMutation.mutate(item.blocked_id)}
                          disabled={unblockMutation.isPending}
                          className="px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center gap-2"
                          style={{
                            backgroundColor: COLORS.error + "15",
                            color: COLORS.error,
                          }}
                        >
                          <Trash2 size={16} />
                          Unblock
                        </button>
                      </div>

                      <div className="mt-3">
                        <label
                          htmlFor={`notes-${item.blocked_id}`}
                          className="block text-sm font-medium mb-1"
                          style={{ color: COLORS.text }}
                        >
                          Private Notes
                        </label>
                        <div className="flex gap-2">
                          <textarea
                            id={`notes-${item.blocked_id}`}
                            value={currentNotes}
                            onChange={(e) =>
                              handleNotesChange(item.blocked_id, e.target.value)
                            }
                            placeholder="Add a note to remember why you blocked this user..."
                            rows="2"
                            className="flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                            style={{
                              borderColor: "#D1D5DB",
                              backgroundColor: "white",
                              color: COLORS.text,
                            }}
                          />
                          {hasUnsavedChanges && (
                            <button
                              onClick={() => handleSaveNotes(item.blocked_id)}
                              disabled={updateNotesMutation.isPending}
                              className="px-4 py-2 rounded-lg text-white font-semibold transition-all hover:opacity-90 flex items-center gap-2 self-start"
                              style={{ backgroundColor: COLORS.secondary }}
                            >
                              <Save size={16} />
                              Save
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

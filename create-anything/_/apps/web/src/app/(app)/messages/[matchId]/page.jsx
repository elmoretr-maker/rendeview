import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/utils/useUser";
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

export default function Chat() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const { user, isLoading: userLoading } = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ["messages", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${matchId}`);
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    refetchInterval: 5000,
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch(`/api/messages/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required. Please sign in to continue.");
        navigate("/account/signin");
        return;
      }
      toast.error("Message failed to send");
    },
  });

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 50) {
      toast.error("Message must be between 1 and 50 characters");
      return;
    }
    sendMutation.mutate(trimmed);
  }, [text, sendMutation]);

  const msgs = data?.messages || [];
  const otherUser = data?.otherUser;

  // Conversation starters based on profile info
  const conversationStarters = React.useMemo(() => {
    const starters = [
      "Hey! How's your day going?",
      "Hi there! Great to connect with you 😊",
      "What are you up to today?",
      "Happy to match with you!",
    ];
    
    // Add personalized starters if we have profile info
    if (otherUser) {
      if (otherUser.membership_tier) {
        starters.push(`I see you're on the ${otherUser.membership_tier} plan too!`);
      }
    }
    
    return starters.slice(0, 4); // Show max 4 starters
  }, [otherUser]);

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
            <p className="mt-4" style={{ color: COLORS.text }}>Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        <AppHeader />
        <div className="px-4 py-8 max-w-2xl mx-auto">
          <h1 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>Chat</h1>
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
        <div className="px-4 py-8 max-w-2xl mx-auto">
          <h1 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>Chat</h1>
          <p style={{ color: COLORS.error }}>Error loading messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      <AppHeader />
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-4 py-8">
        <h1 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>Chat</h1>
        
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {msgs.length === 0 ? (
            <div className="py-8">
              <div className="text-center mb-6">
                <p className="text-lg font-semibold mb-2" style={{ color: COLORS.text }}>
                  Start the conversation!
                </p>
                <p className="text-sm text-gray-500">
                  Pick a conversation starter or write your own message
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                {conversationStarters.map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => setText(starter)}
                    className="text-left px-4 py-3 rounded-lg border-2 transition-all hover:shadow-md"
                    style={{ 
                      borderColor: COLORS.cardBg,
                      backgroundColor: "white",
                      color: COLORS.text
                    }}
                  >
                    <p className="text-sm">{starter}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            msgs.map((item) => (
              <div key={item.id} className="py-2">
                <p className="text-sm" style={{ color: COLORS.text }}>{item.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(item.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="flex-1 border rounded-lg px-4 py-2 bg-white"
            style={{ borderColor: "#E5E7EB" }}
            placeholder="Type a message (max 50)"
            value={text}
            onChange={(e) => e.target.value.length <= 50 && setText(e.target.value)}
            maxLength={50}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <button
            onClick={send}
            disabled={sendMutation.isPending}
            className="px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
          >
            {sendMutation.isPending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

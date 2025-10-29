import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Check, X, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function ScheduleProposals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [counterProposalId, setCounterProposalId] = useState(null);
  const [counterNote, setCounterNote] = useState("");

  // Fetch all schedule proposals
  const { data, isLoading } = useQuery({
    queryKey: ["schedule-proposals"],
    queryFn: async () => {
      const res = await fetch("/api/schedule/list");
      if (!res.ok) throw new Error("Failed to load proposals");
      return res.json();
    },
  });

  // Respond to proposal mutation
  const respondMutation = useMutation({
    mutationFn: async ({ proposalId, action, substituteNote }) => {
      const res = await fetch("/api/schedule/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action, substituteNote }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to respond");
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["schedule-proposals"] });
      setCounterProposalId(null);
      setCounterNote("");
      
      if (variables.action === "accept") {
        toast.success("Video date confirmed! Get ready to connect.");
      } else if (variables.action === "substitute") {
        toast.success("Counter-proposal sent!");
      } else {
        toast.success("Proposal declined");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to respond");
    },
  });

  const proposals = data?.proposals || [];
  const pendingProposals = proposals.filter((p) => p.status === "pending" && !p.is_proposer);
  const sentProposals = proposals.filter((p) => p.is_proposer);
  const completedProposals = proposals.filter(
    (p) => ["accepted", "declined", "substituted"].includes(p.status)
  );

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: COLORS.primary }}
        ></div>
      </div>
    );
  }

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  };

  const ProposalCard = ({ proposal }) => {
    const { date, time } = formatDateTime(proposal.proposed_start);
    const isCounter = counterProposalId === proposal.id;

    return (
      <div
        className="p-6 rounded-2xl shadow-md mb-4"
        style={{ backgroundColor: "white" }}
      >
        {/* User info */}
        <div className="flex items-center gap-3 mb-4">
          {proposal.other_user.image && (
            <img
              src={proposal.other_user.image}
              alt={proposal.other_user.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div>
            <h3 className="font-bold text-lg" style={{ color: COLORS.text }}>
              {proposal.other_user.name}
            </h3>
            {proposal.is_proposer && (
              <span className="text-sm opacity-60" style={{ color: COLORS.text }}>
                Waiting for response
              </span>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} style={{ color: COLORS.primary }} />
            <span className="font-semibold" style={{ color: COLORS.text }}>
              {date}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={20} style={{ color: COLORS.primary }} />
            <span className="font-semibold" style={{ color: COLORS.text }}>
              {time}
            </span>
          </div>
        </div>

        {/* Status badge */}
        {proposal.status !== "pending" && (
          <div className="mb-4">
            <span
              className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                backgroundColor:
                  proposal.status === "accepted"
                    ? COLORS.secondary + "20"
                    : proposal.status === "substituted"
                    ? COLORS.primary + "20"
                    : COLORS.error + "20",
                color:
                  proposal.status === "accepted"
                    ? COLORS.secondary
                    : proposal.status === "substituted"
                    ? COLORS.primary
                    : COLORS.error,
              }}
            >
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </span>
            {proposal.substitute_note && (
              <p className="mt-2 text-sm italic" style={{ color: COLORS.text }}>
                Note: {proposal.substitute_note}
              </p>
            )}
          </div>
        )}

        {/* Action buttons for received proposals */}
        {!proposal.is_proposer && proposal.status === "pending" && (
          <div className="space-y-3">
            {!isCounter ? (
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    respondMutation.mutate({ proposalId: proposal.id, action: "accept" })
                  }
                  disabled={respondMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  style={{ backgroundColor: COLORS.secondary }}
                >
                  <Check size={20} />
                  Accept
                </button>
                <button
                  onClick={() => setCounterProposalId(proposal.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: COLORS.primary + "20", color: COLORS.primary }}
                >
                  <MessageSquare size={20} />
                  Counter
                </button>
                <button
                  onClick={() =>
                    respondMutation.mutate({ proposalId: proposal.id, action: "decline" })
                  }
                  disabled={respondMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
                >
                  <X size={20} style={{ color: COLORS.error }} />
                  Decline
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  placeholder="Suggest a different time and add a note..."
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 resize-none"
                  style={{ borderColor: COLORS.cardBg }}
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCounterProposalId(null);
                      setCounterNote("");
                    }}
                    className="flex-1 px-4 py-3 rounded-xl font-bold shadow-md"
                    style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      respondMutation.mutate({
                        proposalId: proposal.id,
                        action: "substitute",
                        substituteNote: counterNote,
                      })
                    }
                    disabled={!counterNote.trim() || respondMutation.isPending}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    Send Counter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigate to video call if accepted */}
        {proposal.status === "accepted" && (
          <button
            onClick={() => navigate(`/video/call?matchId=${proposal.match_id}`)}
            className="w-full px-4 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all mt-4"
            style={{ backgroundColor: COLORS.secondary }}
          >
            Join Video Date
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: COLORS.bg }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/matches")}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={24} style={{ color: COLORS.text }} />
          </button>
          <h1 className="text-3xl font-bold" style={{ color: COLORS.text }}>
            Video Date Proposals
          </h1>
        </div>

        {/* Pending Proposals (Received) */}
        {pendingProposals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
              Pending Proposals ({pendingProposals.length})
            </h2>
            {pendingProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}

        {/* Sent Proposals */}
        {sentProposals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
              Sent Proposals ({sentProposals.length})
            </h2>
            {sentProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}

        {/* Completed Proposals */}
        {completedProposals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
              Past Proposals ({completedProposals.length})
            </h2>
            {completedProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {proposals.length === 0 && (
          <div className="text-center py-12">
            <Calendar size={64} className="mx-auto mb-4 opacity-30" style={{ color: COLORS.text }} />
            <p className="text-lg mb-4" style={{ color: COLORS.text }}>
              No video date proposals yet
            </p>
            <button
              onClick={() => navigate("/matches")}
              className="px-6 py-3 rounded-xl font-bold text-white shadow-lg"
              style={{ backgroundColor: COLORS.primary }}
            >
              View Matches
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

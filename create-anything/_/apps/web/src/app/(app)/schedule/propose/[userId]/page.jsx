import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, ArrowLeft, Video } from "lucide-react";
import { toast } from "sonner";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export default function ScheduleProposal() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const targetId = Number(userId);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(30);

  // Fetch user profile
  const { data, isLoading } = useQuery({
    queryKey: ["remote-profile", targetId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${targetId}`);
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  // Check if we have a match with this user
  const { data: matchesData } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches/list");
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
  });

  const user = data?.user || {};
  const matches = matchesData?.matches || [];
  const match = matches.find((m) => m.user.id === targetId);
  const matchId = match?.match_id;

  const proposalMutation = useMutation({
    mutationFn: async () => {
      if (!matchId) {
        throw new Error("You must match with this person first");
      }
      if (!selectedDate || !selectedTime) {
        throw new Error("Please select both date and time");
      }

      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const res = await fetch("/api/schedule/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to propose schedule");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Video date proposal sent!");
      queryClient.invalidateQueries({ queryKey: ["schedule-proposals"] });
      navigate("/matches");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send proposal");
    },
  });

  // Generate time slots (every 30 minutes from 9 AM to 9 PM)
  const timeSlots = [];
  for (let hour = 9; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      timeSlots.push(timeStr);
    }
  }

  // Get next 14 days for date selection
  const dateOptions = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dateOptions.push({
      value: date.toISOString().split("T")[0],
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }

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

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: COLORS.bg }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={24} style={{ color: COLORS.text }} />
          </button>
          <h1 className="text-3xl font-bold" style={{ color: COLORS.text }}>
            Propose Video Date
          </h1>
        </div>

        {/* User info card */}
        <div
          className="p-6 rounded-2xl shadow-md mb-6 flex items-center gap-4"
          style={{ backgroundColor: "white" }}
        >
          {user.primary_photo_url && (
            <img
              src={user.primary_photo_url}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <div>
            <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>
              {user.name}
            </h2>
            {!matchId && (
              <p className="text-sm text-red-500 mt-1">
                You must match with this person first to schedule a video date
              </p>
            )}
          </div>
        </div>

        {matchId && (
          <>
            {/* Date Selection */}
            <div className="mb-6 p-6 rounded-2xl shadow-md" style={{ backgroundColor: "white" }}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={24} style={{ color: COLORS.primary }} />
                <h3 className="text-xl font-bold" style={{ color: COLORS.text }}>
                  Select Date
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {dateOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDate(option.value)}
                    className={`p-3 rounded-xl font-semibold transition-all ${
                      selectedDate === option.value ? "shadow-lg" : "hover:shadow-md"
                    }`}
                    style={{
                      backgroundColor:
                        selectedDate === option.value ? COLORS.primary : COLORS.cardBg,
                      color: selectedDate === option.value ? "white" : COLORS.text,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div className="mb-6 p-6 rounded-2xl shadow-md" style={{ backgroundColor: "white" }}>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={24} style={{ color: COLORS.primary }} />
                <h3 className="text-xl font-bold" style={{ color: COLORS.text }}>
                  Select Time
                </h3>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-3 rounded-xl font-semibold transition-all ${
                      selectedTime === time ? "shadow-lg" : "hover:shadow-md"
                    }`}
                    style={{
                      backgroundColor:
                        selectedTime === time ? COLORS.primary : COLORS.cardBg,
                      color: selectedTime === time ? "white" : COLORS.text,
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selection */}
            <div className="mb-6 p-6 rounded-2xl shadow-md" style={{ backgroundColor: "white" }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
                Duration
              </h3>
              <div className="flex gap-3">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDuration(mins)}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all flex-1 ${
                      duration === mins ? "shadow-lg" : "hover:shadow-md"
                    }`}
                    style={{
                      backgroundColor: duration === mins ? COLORS.primary : COLORS.cardBg,
                      color: duration === mins ? "white" : COLORS.text,
                    }}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {selectedDate && selectedTime && (
              <div
                className="mb-6 p-6 rounded-2xl shadow-md"
                style={{ backgroundColor: COLORS.secondary + "15" }}
              >
                <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.text }}>
                  Proposal Summary
                </h3>
                <p style={{ color: COLORS.text }}>
                  <strong>{user.name}</strong> will receive a proposal for a {duration}-minute
                  video date on{" "}
                  <strong>
                    {new Date(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </strong>{" "}
                  at <strong>{selectedTime}</strong>
                </p>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => proposalMutation.mutate()}
              disabled={!selectedDate || !selectedTime || proposalMutation.isPending}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Video size={24} />
              {proposalMutation.isPending ? "Sending..." : "Send Proposal"}
            </button>
          </>
        )}

        {!matchId && (
          <div className="text-center py-12">
            <p className="text-lg mb-4" style={{ color: COLORS.text }}>
              You need to match with {user.name} before proposing a video date.
            </p>
            <button
              onClick={() => navigate(`/profile/${targetId}`)}
              className="px-6 py-3 rounded-xl font-bold text-white shadow-lg"
              style={{ backgroundColor: COLORS.primary }}
            >
              View Profile & Like
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

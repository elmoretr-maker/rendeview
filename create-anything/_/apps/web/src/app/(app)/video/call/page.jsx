import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

const COLORS = {
  primary: "#5B3BAF",
  bg: "#F9F9F9",
  text: "#2C3E50",
};

export default function VideoCall() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const roomUrl = searchParams.get("roomUrl");

  useEffect(() => {
    if (!roomUrl) {
      setError("No room URL provided");
    }
  }, [roomUrl]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: COLORS.bg }}>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>Video Call Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Daily.co video integration requires DAILY_API_KEY configuration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#000" }}>
      {roomUrl ? (
        <iframe
          src={roomUrl}
          allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-screen border-0"
          title="Video Call"
        />
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: COLORS.primary }}></div>
            <p className="text-white">Loading video call...</p>
          </div>
        </div>
      )}
    </div>
  );
}

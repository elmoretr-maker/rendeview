import React, { useState } from "react";
import { useNavigate } from "react-router";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  text: "#2C3E50",
  lightBg: "#F3F4F6",
};

export function SmartNudge({ matchId, otherUserName, daysSinceFirstMessage, onDismiss }) {
  const navigate = useNavigate();
  const [dismissed, setDismiss] = useState(false);

  if (dismissed || daysSinceFirstMessage < 2) {
    return null;
  }

  const handleDismiss = () => {
    setDismiss(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div 
      className="mb-4 p-4 rounded-xl shadow-sm border-2" 
      style={{ 
        backgroundColor: "#FFF4E6",
        borderColor: COLORS.secondary 
      }}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">📹</div>
        <div className="flex-1">
          <h3 className="font-bold mb-1" style={{ color: COLORS.text }}>
            Ready to take it to video?
          </h3>
          <p className="text-sm mb-3 opacity-80" style={{ color: COLORS.text }}>
            You and {otherUserName} have been chatting for {daysSinceFirstMessage} days. 
            Why not schedule a video date? It's the best way to really get to know each other!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/schedule/proposals')}
              className="px-4 py-2 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all text-sm"
              style={{ backgroundColor: COLORS.primary }}
            >
              Schedule Video Date
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-lg font-medium transition-all text-sm"
              style={{ backgroundColor: COLORS.lightBg, color: COLORS.text }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

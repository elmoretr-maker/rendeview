import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MESSAGE_CREDIT_PRICING } from "@/utils/membershipTiers";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

export function BuyCreditsModal({ isOpen, onClose, currentTier = 'free' }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState('PACK_LARGE');

  if (!isOpen) return null;

  const handlePurchase = async () => {
    try {
      setLoading(true);
      const redirectURL = `${window.location.origin}${window.location.pathname}`;
      
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pack: selectedPack,
          redirectURL,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to start checkout");
      }

      const { url } = await res.json();
      if (url) {
        navigate("/stripe", { state: { checkoutUrl: url, returnTo: window.location.pathname } });
      }
    } catch (err) {
      console.error("Credit purchase error:", err);
      alert(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  const packs = [
    { key: 'PACK_SMALL', ...MESSAGE_CREDIT_PRICING.PACK_SMALL },
    { key: 'PACK_MEDIUM', ...MESSAGE_CREDIT_PRICING.PACK_MEDIUM },
    { key: 'PACK_LARGE', ...MESSAGE_CREDIT_PRICING.PACK_LARGE },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.text }}>
          💳 Buy Message Credits
        </h2>
        <p className="mb-6 text-sm opacity-70" style={{ color: COLORS.text }}>
          Credits never expire and work across all your chats!
        </p>

        <div className="space-y-3 mb-6">
          {packs.map((pack) => (
            <button
              key={pack.key}
              onClick={() => setSelectedPack(pack.key)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selectedPack === pack.key ? 'border-purple-500 shadow-md' : 'border-gray-200'
              }`}
              style={{
                borderColor: selectedPack === pack.key ? COLORS.primary : COLORS.cardBg,
                backgroundColor: selectedPack === pack.key ? '#F9F5FF' : 'white',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-bold text-lg" style={{ color: COLORS.text }}>
                    {pack.credits} Messages
                  </p>
                  <p className="text-sm opacity-70" style={{ color: COLORS.text }}>
                    {pack.price}
                    {pack.label && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full text-white" style={{ backgroundColor: COLORS.secondary }}>
                        {pack.label}
                      </span>
                    )}
                  </p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPack === pack.key ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                }`}>
                  {selectedPack === pack.key && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
          >
            {loading ? "Processing..." : "Buy Now"}
          </button>
        </div>

        <p className="mt-4 text-xs text-center opacity-60" style={{ color: COLORS.text }}>
          Or <button onClick={() => navigate('/settings/subscription')} className="underline font-medium">upgrade your tier</button> for more daily messages
        </p>
      </div>
    </div>
  );
}

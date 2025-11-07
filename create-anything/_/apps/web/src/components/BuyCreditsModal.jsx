import React, { useState, useEffect } from "react";
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
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [selectedPack, setSelectedPack] = useState('PACK_LARGE');
  const [pricingData, setPricingData] = useState(null);

  // Fetch pricing based on user's reward status
  useEffect(() => {
    if (!isOpen) return;

    const fetchPricing = async () => {
      try {
        setLoadingPricing(true);
        const res = await fetch('/api/messages/credits/purchase');
        if (res.ok) {
          const data = await res.json();
          setPricingData(data);
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchPricing();
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    try {
      setLoading(true);
      
      // TODO: Integrate with Stripe for actual payment processing
      // For now, this is a placeholder that shows the flow
      alert('Credit purchase flow will be integrated with Stripe. Pack: ' + selectedPack);
      onClose();
      
      /* Future Stripe integration:
      const redirectURL = `${window.location.origin}${window.location.pathname}`;
      
      const res = await fetch("/api/messages/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packSize: selectedPack,
          stripePaymentIntentId: 'pi_xxx', // From Stripe payment flow
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to complete purchase");
      }

      const result = await res.json();
      if (result.success) {
        alert(`Successfully purchased ${result.creditsAdded} credits!`);
        onClose();
      }
      */
    } catch (err) {
      console.error("Credit purchase error:", err);
      alert(err.message || "Failed to complete purchase");
    } finally {
      setLoading(false);
    }
  };

  // Use pricing from API if available, otherwise fall back to STANDARD pricing
  const packs = pricingData?.packs || [
    { id: 'PACK_SMALL', ...MESSAGE_CREDIT_PRICING.STANDARD.PACK_SMALL },
    { id: 'PACK_MEDIUM', ...MESSAGE_CREDIT_PRICING.STANDARD.PACK_MEDIUM },
    { id: 'PACK_LARGE', ...MESSAGE_CREDIT_PRICING.STANDARD.PACK_LARGE },
  ];

  const hasActiveReward = pricingData?.hasActiveReward || false;
  const videoCallsThisMonth = pricingData?.videoCallsThisMonth || 0;
  const pricingTier = pricingData?.pricingTier || 'STANDARD';
  const currentBalance = pricingData?.currentBalance || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.text }}>
          💳 Buy Message Credits
        </h2>
        
        {/* Current Balance */}
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: COLORS.cardBg }}>
          <p className="text-sm font-medium opacity-70" style={{ color: COLORS.text }}>
            Current Balance
          </p>
          <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
            {currentBalance} credits
          </p>
        </div>

        {/* Reward Status Banner */}
        {hasActiveReward ? (
          <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#D4EDDA', border: '1px solid #28A745' }}>
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-sm" style={{ color: '#155724' }}>
                50% Bonus Active!
              </p>
              <p className="text-xs opacity-80" style={{ color: '#155724' }}>
                You completed {videoCallsThisMonth} video calls this month. Keep it up!
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#FFF3CD', border: '1px solid #FFC107' }}>
            <span className="text-2xl">📹</span>
            <div>
              <p className="font-bold text-sm" style={{ color: '#856404' }}>
                Complete 3 video calls this month for 50% bonus!
              </p>
              <p className="text-xs opacity-80" style={{ color: '#856404' }}>
                Progress: {videoCallsThisMonth}/3 video calls
              </p>
            </div>
          </div>
        )}

        <p className="mb-4 text-sm opacity-70" style={{ color: COLORS.text }}>
          Credits never expire and work across all your chats!
        </p>

        {/* Loading state */}
        {loadingPricing ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: COLORS.primary }}></div>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPack(pack.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPack === pack.id ? 'border-purple-500 shadow-md' : 'border-gray-200'
                  }`}
                  style={{
                    borderColor: selectedPack === pack.id ? COLORS.primary : COLORS.cardBg,
                    backgroundColor: selectedPack === pack.id ? '#F9F5FF' : 'white',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-lg" style={{ color: COLORS.text }}>
                        {pack.credits} Messages
                        {pack.bonusPercentage && (
                          <span className="ml-2 text-xs font-semibold text-green-600">
                            +{pack.bonusPercentage}% Bonus!
                          </span>
                        )}
                      </p>
                      <p className="text-sm opacity-70" style={{ color: COLORS.text }}>
                        {pack.price}
                        {pack.label && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full text-white" style={{ backgroundColor: COLORS.secondary }}>
                            {pack.label}
                          </span>
                        )}
                      </p>
                      <p className="text-xs opacity-60 mt-1" style={{ color: COLORS.text }}>
                        ${pack.perMessageCost.toFixed(2)} per message
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedPack === pack.id ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                    }`}>
                      {selectedPack === pack.id && (
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
          </>
        )}

        <p className="mt-4 text-xs text-center opacity-60" style={{ color: COLORS.text }}>
          Or <button onClick={() => navigate('/settings/subscription')} className="underline font-medium">upgrade your tier</button> for more daily messages
        </p>
      </div>
    </div>
  );
}

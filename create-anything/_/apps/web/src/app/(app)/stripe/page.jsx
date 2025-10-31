import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";

export default function Stripe() {
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutUrl = location.state?.checkoutUrl;
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    if (checkoutUrl) {
      const popup = window.open(checkoutUrl, "_blank", "popup,width=800,height=600");
      
      const checkClosed = setInterval(() => {
        try {
          if (popup && (popup.closed || popup.location.href.includes(window.location.origin))) {
            clearInterval(checkClosed);
            popup.close();
            setPaymentComplete(true);
          }
        } catch (e) {
          // Cross-origin error expected
        }
      }, 1000);

      return () => clearInterval(checkClosed);
    }
  }, [checkoutUrl]);

  if (!checkoutUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F9F9F9" }}>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "#2C3E50" }}>No Payment Session</h1>
          <p className="text-gray-600 mb-6">No active payment session found.</p>
          <button
            onClick={() => navigate("/onboarding/membership")}
            className="px-6 py-3 rounded-lg text-white font-semibold"
            style={{ backgroundColor: "#5B3BAF" }}
          >
            Back to Membership
          </button>
        </div>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F9F9F9" }}>
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#2C3E50" }}>Payment Complete!</h1>
            <p className="text-gray-600 mb-8">Your subscription is now active. Let's set up your profile.</p>
          </div>

          <button
            onClick={() => navigate("/onboarding/profile")}
            className="w-full px-8 py-4 rounded-xl text-white font-semibold text-lg shadow-lg mb-3"
            style={{ backgroundColor: "#5B3BAF" }}
          >
            Continue to Profile Setup
          </button>

          <button
            onClick={() => navigate("/onboarding/membership")}
            className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mx-auto"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Back to Membership</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F9F9F9" }}>
      <div className="text-center max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "#5B3BAF" }}></div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "#2C3E50" }}>Processing Payment</h2>
        <p className="text-gray-600 mb-8">Please complete your purchase in the popup window...</p>
        
        <button
          onClick={() => navigate("/onboarding/membership")}
          className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mx-auto"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Cancel & Go Back</span>
        </button>
      </div>
    </div>
  );
}

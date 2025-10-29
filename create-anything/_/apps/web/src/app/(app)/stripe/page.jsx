import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";

export default function Stripe() {
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutUrl = location.state?.checkoutUrl;

  useEffect(() => {
    if (checkoutUrl) {
      const popup = window.open(checkoutUrl, "_blank", "popup,width=800,height=600");
      
      const checkClosed = setInterval(() => {
        try {
          if (popup && (popup.closed || popup.location.href.includes(window.location.origin))) {
            clearInterval(checkClosed);
            popup.close();
            navigate(-1);
          }
        } catch (e) {
          // Cross-origin error expected
        }
      }, 1000);

      return () => clearInterval(checkClosed);
    } else {
      navigate(-1);
    }
  }, [checkoutUrl, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F9F9F9" }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: "#5B3BAF" }}></div>
        <p className="mt-4 text-gray-600">Opening Stripe checkout...</p>
      </div>
    </div>
  );
}

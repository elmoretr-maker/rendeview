import React from "react";
import { useNavigate, useSearchParams } from "react-router";

export default function ConsentRequired() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const returnTo = searchParams.get("returnTo") || "/discovery";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-3">Consent Required</h1>
        <p className="text-gray-600 mb-6">
          You must accept data consent to use the app features.
        </p>
        <button
          onClick={() => navigate(`/onboarding/consent?returnTo=${encodeURIComponent(returnTo)}`, { replace: true })}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-base"
          style={{ backgroundColor: "#6855FF" }}
        >
          Return to Consent
        </button>
      </div>
    </div>
  );
}

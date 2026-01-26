import React from "react";
import { useNavigate } from "react-router";
import logoImage from "@/assets/logo-centered.png";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import { Button } from "@lshay/ui/components/default/button";

function WelcomeContent() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 px-6 py-12">
      <div className="flex flex-col items-center space-y-8 max-w-md w-full">
        {/* Logo */}
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <img
            src={logoImage}
            alt="Rende-View Logo"
            className="object-contain"
            style={{ width: '60px', height: '60px' }}
          />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 
            className="text-4xl font-bold text-purple-600"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Rende-View
          </h1>
          <p className="text-sm font-semibold tracking-widest text-purple-500 uppercase">
            Video-First Dating
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-4 w-full mt-8">
          <Button
            onClick={() => navigate("/account/signin")}
            variant="outline"
            className="w-full max-w-xs py-6 rounded-full border-2 border-purple-400 text-purple-600 font-semibold text-lg hover:bg-purple-50 transition-all"
            size="lg"
          >
            Sign In
          </Button>
          <Button
            onClick={() => navigate("/onboarding/consent")}
            className="w-full max-w-xs py-6 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold text-lg shadow-lg transition-all"
            size="lg"
          >
            Join Now
          </Button>
        </div>

        {/* Terms */}
        <p className="text-xs text-center text-gray-500 mt-8">
          By continuing, you agree to our{" "}
          <span 
            className="text-purple-600 underline cursor-pointer hover:text-purple-700"
            onClick={() => navigate("/terms")}
          >
            Terms of Service
          </span>{" "}
          and{" "}
          <span 
            className="text-purple-600 underline cursor-pointer hover:text-purple-700"
            onClick={() => navigate("/privacy")}
          >
            Privacy Policy
          </span>.
        </p>

        {/* Clear session (dev helper) */}
        <button
          onClick={() => {
            document.cookie.split(";").forEach((c) => {
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
          className="text-xs text-gray-300 hover:text-gray-400 mt-4"
        >
          Clear session
        </button>
      </div>
    </div>
  );
}

export default function Welcome() {
  return (
    <OnboardingGuard allowUnauthenticated={true}>
      <WelcomeContent />
    </OnboardingGuard>
  );
}

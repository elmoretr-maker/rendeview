import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { CheckCircle, Shield, Heart, Users } from "lucide-react";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  text: "#2C3E50",
  lightGray: "#F3F4F6",
  bg: "#F9F9F9",
  white: "#FFFFFF",
  error: "#E74C3C",
};

export default function Welcome() {
  const navigate = useNavigate();

  const valueProps = [
    {
      icon: CheckCircle,
      title: "Video-First Dating",
      description:
        "The only dating app where you see who you're really meeting. Built for authentic introductions and real-time conversations.",
    },
    {
      icon: Shield,
      title: "Safety First",
      description:
        "Advanced verification and safety features to protect your time and ensure a secure experience.",
    },
    {
      icon: Heart,
      title: "Meaningful Connections",
      description:
        "Quality matches based on compatibility and genuine connections.",
    },
    {
      icon: Users,
      title: "Inclusive Community",
      description:
        "A welcoming space for everyone to find authentic relationships.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      <div className="max-w-4xl mx-auto w-full px-8 py-12 flex-1">
        {/* Header/Title Section */}
        <div className="text-center mb-12">
          <img
            src={new URL("@/assets/logo-centered.png", import.meta.url).href}
            alt="Rende-View Logo"
            className="w-16 h-16 mx-auto mb-3 object-contain logo-image"
            style={{ width: '48px', height: '48px' }}
          />
          <h2 className="text-3xl font-playfair font-bold mb-3" style={{ color: COLORS.primary }}>
            Date Smarter, Not Harder
          </h2>
          <p className="text-lg opacity-80" style={{ color: COLORS.text }}>
            No Catfishing. Know who they are before you meet. Your time is valuable—only pay for connections that matter.
          </p>
        </div>

        {/* Value Propositions Section */}
        <div className="space-y-6 mb-12">
          {valueProps.map((prop, index) => (
            <div key={index} className="flex items-start">
              <prop.icon className="w-7 h-7 mr-4 mt-1 flex-shrink-0" style={{ color: COLORS.primary }} />
              <div>
                <h3 className="font-semibold text-base mb-1" style={{ color: COLORS.text }}>
                  {prop.title}
                </h3>
                <p className="text-sm opacity-70" style={{ color: COLORS.text }}>
                  {prop.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons Section */}
        <div className="text-center space-y-4 mb-6">
          <button
            onClick={() => navigate("/account/signup")}
            className="w-full px-10 py-4 rounded-full text-white font-semibold text-lg shadow-lg"
            style={{ backgroundColor: COLORS.primary }}
          >
            Get Started
          </button>
          <button
            onClick={() => navigate("/account/signin")}
            className="text-sm font-semibold"
            style={{ color: COLORS.text }}
          >
            I Already Have an Account
          </button>
        </div>

        {/* Footer/Legal Text */}
        <p className="text-xs text-center opacity-60" style={{ color: COLORS.text }}>
          By continuing, you agree to our{" "}
          <span style={{ color: COLORS.primary }} className="underline">Terms of Service</span> and{" "}
          <span style={{ color: COLORS.primary }} className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

import React from "react";
import { useNavigate } from "react-router";
import { CheckCircle, Shield, Heart, Users } from "lucide-react";
import logoImage from "@/assets/logo-centered.png";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import { Button } from "@lshay/ui/components/default/button";
import { Card, CardContent } from "@lshay/ui/components/default/card";

function WelcomeContent() {
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="max-w-4xl mx-auto w-full px-8 py-12 flex-1">
        <div className="flex flex-col items-center space-y-12 mb-12">
          <div className="text-center space-y-3">
            <img
              src={logoImage}
              alt="Rende-View Logo"
              className="w-12 h-12 mx-auto object-contain"
              style={{ width: '48px', height: '48px' }}
            />
            <h1 className="text-3xl md:text-4xl font-bold text-purple-600" style={{ fontFamily: "'Playfair Display', serif" }}>
              Date Smarter, Not Harder
            </h1>
            <p className="text-lg text-gray-700 opacity-80 max-w-xl mx-auto">
              No Catfishing. Know who they are before you meet. Your time is valuable—only pay for connections that matter.
            </p>
          </div>

          <Card className="w-full max-w-2xl border-0 shadow-none bg-transparent">
            <CardContent className="p-0 space-y-6">
              {valueProps.map((prop, index) => (
                <div key={index} className="flex items-start gap-4">
                  <prop.icon className="w-7 h-7 flex-shrink-0 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-700 mb-1">
                      {prop.title}
                    </h3>
                    <p className="text-sm text-gray-600 opacity-70">
                      {prop.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={() => navigate("/onboarding/consent")}
              className="px-10 py-6 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg shadow-lg transition-all"
              size="lg"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate("/account/signin")}
              variant="link"
              className="text-sm font-semibold text-purple-600 hover:text-purple-700"
            >
              I Already Have an Account
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 opacity-60">
            By continuing, you agree to our{" "}
            <span className="text-purple-600 underline cursor-pointer hover:text-purple-700">Terms of Service</span> and{" "}
            <span className="text-purple-600 underline cursor-pointer hover:text-purple-700">Privacy Policy</span>.
          </p>
        </div>
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

import React from "react";
import logoImage from "@/assets/logo-centered.png";
import { Button } from "@lshay/ui/components/default/button";

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 relative overflow-hidden">
      <div
        className="absolute -top-[10%] -right-[5%] w-[400px] h-[400px] bg-purple-200 opacity-20 rounded-full"
        style={{ filter: "blur(60px)" }}
      />
      <div
        className="absolute -bottom-[10%] -left-[5%] w-[300px] h-[300px] bg-blue-200 opacity-20 rounded-full"
        style={{ filter: "blur(60px)" }}
      />

      <div className="max-w-md mx-auto px-8 py-20 flex-1 flex items-center relative z-10">
        <div className="w-full text-center space-y-10">
          <div className="space-y-6">
            <div className="p-4 bg-white rounded-2xl shadow-xl inline-block mx-auto hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <img
                src={logoImage}
                alt="Rende-View Logo"
                className="object-contain"
                style={{ width: "60px", height: "60px" }}
              />
            </div>
            <div className="space-y-2">
              <h1
                className="text-4xl font-bold text-purple-700 tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Rende-View
              </h1>
              <p className="text-md font-medium text-purple-600 tracking-wide uppercase">
                Video-First Dating
              </p>
            </div>
          </div>

          <div className="space-y-4 w-full pt-4">
            <Button
              asChild
              variant="outline"
              className="w-full py-7 text-md font-bold rounded-full border-2 border-purple-500 text-purple-600 bg-white shadow-md hover:bg-purple-50 hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              <a href="/account/signin">Sign In</a>
            </Button>
            <Button
              asChild
              className="w-full py-7 text-md font-bold rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:from-purple-600 hover:to-purple-700 hover:-translate-y-0.5 hover:shadow-xl transition-all"
            >
              <a href="/onboarding/welcome">Join Now</a>
            </Button>
          </div>

          <div className="pt-6">
            <p className="text-xs text-center text-gray-600 leading-relaxed max-w-sm mx-auto">
              By continuing, you agree to our{" "}
              <span className="text-purple-600 font-semibold underline cursor-pointer hover:text-purple-700">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-purple-600 font-semibold underline cursor-pointer hover:text-purple-700">
                Privacy Policy
              </span>
              .
            </p>
          </div>

          <div className="pt-8">
            <p className="text-[10px] text-center text-gray-400 opacity-60">
              <a
                href="/account/logout"
                className="text-gray-400 no-underline hover:text-gray-500 hover:underline"
              >
                Clear session
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

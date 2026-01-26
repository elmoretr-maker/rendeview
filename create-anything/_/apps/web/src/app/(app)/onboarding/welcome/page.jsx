import React from "react";
import { useNavigate } from "react-router";
import logoImage from "@/assets/logo-centered.png";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import WelcomeNavbar from "@/components/WelcomeNavbar";

function WelcomeContent() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f3e8ff 0%, #ffffff 50%, #dbeafe 100%)',
        padding: '24px',
        position: 'relative',
      }}
    >
      <WelcomeNavbar />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <img
            src={logoImage}
            alt="Rende-View Logo"
            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#9333ea',
              fontFamily: "'Playfair Display', serif",
              margin: 0,
            }}
          >
            Rende-View
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              letterSpacing: '0.1em',
              color: '#a855f7',
              textTransform: 'uppercase',
              marginTop: '8px',
            }}
          >
            Video-First Dating
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            width: '100%',
            marginTop: '16px',
          }}
        >
          <button
            onClick={() => navigate("/account/signin")}
            style={{
              width: '100%',
              maxWidth: '320px',
              padding: '18px 32px',
              borderRadius: '9999px',
              border: '2px solid #c084fc',
              backgroundColor: 'transparent',
              color: '#9333ea',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#faf5ff'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/onboarding/consent")}
            style={{
              width: '100%',
              maxWidth: '320px',
              padding: '18px 32px',
              borderRadius: '9999px',
              border: 'none',
              background: 'linear-gradient(to right, #a855f7, #9333ea)',
              color: '#ffffff',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Join Now
          </button>
        </div>

        <p
          style={{
            fontSize: '0.75rem',
            textAlign: 'center',
            color: '#6b7280',
            marginTop: '16px',
          }}
        >
          By continuing, you agree to our{" "}
          <span
            style={{ color: '#9333ea', textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => navigate("/terms")}
          >
            Terms of Service
          </span>{" "}
          and{" "}
          <span
            style={{ color: '#9333ea', textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => navigate("/privacy")}
          >
            Privacy Policy
          </span>.
        </p>

        <button
          onClick={() => {
            document.cookie.split(";").forEach((c) => {
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
          style={{
            fontSize: '0.75rem',
            color: '#d1d5db',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginTop: '8px',
          }}
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

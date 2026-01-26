import React, { useCallback, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Shield, MapPin, Heart } from "lucide-react";
import { toast } from "sonner";
import logoImage from "@/assets/logo-centered.png";

export function meta() {
  return [
    { title: "Data Consent | Rende-View" },
    { name: "description", content: "Consent to data usage for a personalized dating experience." },
  ];
}

const consentPoints = [
  {
    Icon: MapPin,
    title: "Location Services",
    description: "Find matches near you for real meetups.",
  },
  {
    Icon: Heart,
    title: "Interest Matching",
    description: "Connect with people who share your passions.",
  },
  {
    Icon: Shield,
    title: "Privacy Protected",
    description: "Your data is encrypted and never sold.",
  },
];

function ConsentContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const returnTo = searchParams.get("returnTo");

  const totalSteps = 3;
  const stepIndex = 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  const accept = useCallback(async () => {
    if (!mounted) return;
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_accepted: true }),
      });
      if (!res.ok) {
        throw new Error("Failed to save consent");
      }
      navigate(returnTo || "/onboarding/membership", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Could not save consent");
    } finally {
      setSaving(false);
    }
  }, [navigate, returnTo, mounted]);

  const decline = useCallback(() => {
    if (!mounted) return;
    navigate("/welcome", { replace: true });
  }, [navigate, mounted]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f3e8ff 0%, #ffffff 50%, #dbeafe 100%)',
        padding: '24px',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          right: '24px',
        }}
      >
        <div
          style={{
            height: '6px',
            backgroundColor: '#e5e7eb',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '6px',
              width: `${(stepIndex / totalSteps) * 100}%`,
              backgroundColor: '#9333ea',
              borderRadius: '999px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <p style={{ marginTop: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
          Step {stepIndex} of {totalSteps}
        </p>
      </div>

      <button
        onClick={() => navigate("/welcome")}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#9333ea',
          fontSize: '0.875rem',
          fontWeight: '600',
          cursor: 'pointer',
          marginTop: '60px',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 'bold',
          color: '#9333ea',
          fontFamily: "'Playfair Display', serif",
          textAlign: 'center',
          marginBottom: '24px',
        }}
      >
        Data Consent
      </h1>

      <div
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src={logoImage}
            alt="Rende-View Logo"
            style={{ width: '60px', height: '60px', objectFit: 'contain', margin: '0 auto 16px' }}
          />
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px',
          }}
        >
          <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '20px', textAlign: 'center' }}>
            We use your location and interests to ensure perfect matches and reliable scheduling. By consenting, you unlock all features for a superior dating experience.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {consentPoints.map((point, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <point.Icon
                  style={{
                    width: '24px',
                    height: '24px',
                    color: '#9333ea',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', margin: 0 }}>
                    {point.title}
                  </h3>
                  <p style={{ color: '#6b7280', margin: 0, marginTop: '2px', fontSize: '0.875rem' }}>
                    {point.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={accept}
            disabled={saving || !mounted}
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#ffffff',
              backgroundColor: '#9333ea',
              border: 'none',
              borderRadius: '12px',
              cursor: saving || !mounted ? 'not-allowed' : 'pointer',
              opacity: saving || !mounted ? 0.6 : 1,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(147, 51, 234, 0.3)',
            }}
          >
            {saving ? "Saving..." : "Accept & Continue"}
          </button>

          <button
            onClick={decline}
            disabled={!mounted}
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              cursor: !mounted ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Consent() {
  return <ConsentContent />;
}

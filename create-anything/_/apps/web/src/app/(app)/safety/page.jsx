import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Shield, Video, UserCheck, Lock, AlertTriangle } from "lucide-react";
import logoImage from "@/assets/logo-centered.png";
import WelcomeNavbar from "@/components/WelcomeNavbar";

export function meta() {
  return [
    { title: "Safety | Rende-View" },
    { name: "description", content: "Safety First isn't just a slogan; it's our technical foundation." },
  ];
}

const safetyFeatures = [
  {
    Icon: UserCheck,
    title: "Identity Verification",
    description: "Multi-factor checks to ensure every user is who they say they are.",
  },
  {
    Icon: Lock,
    title: "Secure Conversations",
    description: "High-fidelity video sessions protected by industry-standard encryption.",
  },
  {
    Icon: AlertTriangle,
    title: "Community Reporting",
    description: "A zero-tolerance policy for harassment or deceptive behavior.",
  },
];

export default function Safety() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f3e8ff 0%, #ffffff 50%, #dbeafe 100%)',
        position: 'relative',
      }}
    >
      <WelcomeNavbar />

      <div style={{ paddingTop: '80px', padding: '24px' }}>
        <button
          onClick={() => navigate(-1)}
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
          Safety
        </h1>

        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Shield style={{ width: '28px', height: '28px', color: '#9333ea' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#9333ea', margin: 0 }}>
                Our Promise
              </h2>
            </div>
            <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '0' }}>
              'Safety First' isn't just a slogan; it's our technical foundation. We use advanced verification to protect your time and emotional well-being.
            </p>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Video style={{ width: '28px', height: '28px', color: '#9333ea' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#9333ea', margin: 0 }}>
                Anti-Catfishing
              </h2>
            </div>
            <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '0' }}>
              Our video-first requirement naturally eliminates deception. You see the person you are talking to before you ever meet in person.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#9333ea', marginBottom: '16px' }}>
              Safety Features
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {safetyFeatures.map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <feature.Icon
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
                      {feature.title}
                    </h3>
                    <p style={{ color: '#6b7280', margin: 0, marginTop: '4px', fontSize: '0.875rem' }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Shield, Eye, UserCheck, AlertTriangle } from "lucide-react";
import logoImage from "@/assets/logo-centered.png";

export function meta() {
  return [
    { title: "Safety | Rende-View" },
    { name: "description", content: "Your safety matters. Learn about our verification and security features." },
  ];
}

const safetyFeatures = [
  {
    Icon: Shield,
    title: "Advanced Verification",
    description: "Multi-step verification process ensures all users are who they claim to be.",
  },
  {
    Icon: Eye,
    title: "Video-First Approach",
    description: "See your match in real-time before meeting in person, eliminating catfishing.",
  },
  {
    Icon: UserCheck,
    title: "Profile Review",
    description: "Our team reviews profiles to ensure community guidelines are followed.",
  },
  {
    Icon: AlertTriangle,
    title: "Report & Block",
    description: "Easy-to-use reporting and blocking features to keep you safe.",
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
        padding: '24px',
      }}
    >
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
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#9333ea',
              fontFamily: "'Playfair Display', serif",
              margin: 0,
            }}
          >
            Your Safety Matters
          </h2>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            We take your security seriously
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {safetyFeatures.map((feature, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
            >
              <feature.Icon
                style={{
                  width: '28px',
                  height: '28px',
                  color: '#9333ea',
                  flexShrink: 0,
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
  );
}

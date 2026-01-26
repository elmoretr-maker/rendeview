import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle, Users, Zap } from "lucide-react";
import logoImage from "@/assets/logo-centered.png";
import WelcomeNavbar from "@/components/WelcomeNavbar";

export function meta() {
  return [
    { title: "About | Rende-View" },
    { name: "description", content: "Redefining modern dating through authentic, video-first interactions." },
  ];
}

const corePillars = [
  {
    Icon: CheckCircle,
    title: "Authenticity",
    description: "Built-in verification through mandatory video introductions.",
  },
  {
    Icon: Users,
    title: "Inclusivity",
    description: "A welcoming community for all types of authentic relationships.",
  },
  {
    Icon: Zap,
    title: "Efficiency",
    description: "Skip weeks of 'small talk' and get straight to a real connection.",
  },
];

export default function About() {
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
          About
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#9333ea', marginBottom: '12px' }}>
              Our Mission
            </h2>
            <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '0' }}>
              Redefining modern dating by replacing static profiles with real human energy. Our mission is to end 'swipe fatigue' through authentic, video-first interactions.
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#9333ea', marginBottom: '12px' }}>
              The Vision
            </h2>
            <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '0' }}>
              Rende-View was built for users who value their time. We believe you can't feel a 'spark' from a text box; you feel it through a look, a laugh, and a real-time conversation.
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
              Core Pillars
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {corePillars.map((pillar, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <pillar.Icon
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
                      {pillar.title}
                    </h3>
                    <p style={{ color: '#6b7280', margin: 0, marginTop: '4px', fontSize: '0.875rem' }}>
                      {pillar.description}
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

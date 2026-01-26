import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Clock, Star, Heart } from "lucide-react";
import logoImage from "@/assets/logo-centered.png";
import WelcomeNavbar from "@/components/WelcomeNavbar";

export function meta() {
  return [
    { title: "Success Stories | Rende-View" },
    { name: "description", content: "Real stories from couples who found genuine connections on Rende-View." },
  ];
}

const successHighlights = [
  {
    Icon: Clock,
    title: "The 5-Minute Spark",
    description: "Users frequently report that a single 5-minute video session on Rende-View is more valuable than two weeks of texting on traditional apps.",
  },
  {
    Icon: Star,
    title: "Quality over Quantity",
    description: "We celebrate users who found their 'last first date' by prioritizing quality matches over endless swiping.",
  },
  {
    Icon: Heart,
    title: "Beyond the Screen",
    description: "Real stories from couples who found genuine connections because they didn't have to guess what the other person was really like.",
  },
];

export default function SuccessStories() {
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
          Success Stories
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {successHighlights.map((highlight, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <highlight.Icon
                    style={{
                      width: '28px',
                      height: '28px',
                      color: index === 2 ? '#ec4899' : '#9333ea',
                    }}
                  />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', margin: 0 }}>
                    {highlight.title}
                  </h2>
                </div>
                <p style={{ color: '#6b7280', lineHeight: '1.6', margin: 0 }}>
                  {highlight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

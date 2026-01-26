import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Heart, Quote } from "lucide-react";
import logoImage from "@/assets/logo-centered.png";

export function meta() {
  return [
    { title: "Success Stories | Rende-View" },
    { name: "description", content: "Real couples who found love on Rende-View." },
  ];
}

const stories = [
  {
    names: "Sarah & Michael",
    location: "New York, NY",
    story: "We matched on Rende-View and had our first video call that same night. The conversation flowed so naturally - we talked for 3 hours! Now we're engaged.",
  },
  {
    names: "Emma & James",
    location: "Los Angeles, CA",
    story: "After years of disappointing first dates, Rende-View was a game-changer. Seeing James on video before meeting in person gave me so much confidence. Best decision ever!",
  },
  {
    names: "David & Lisa",
    location: "Chicago, IL",
    story: "The video-first approach eliminated all the awkwardness. We knew we had chemistry before we even met for coffee. Two years later, we're still going strong.",
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
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            Real couples who found love on Rende-View
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {stories.map((story, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                position: 'relative',
              }}
            >
              <Quote
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '24px',
                  height: '24px',
                  color: '#e9d5ff',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Heart style={{ width: '20px', height: '20px', color: '#ec4899', fill: '#ec4899' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', margin: 0 }}>
                  {story.names}
                </h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9333ea', marginBottom: '12px' }}>
                {story.location}
              </p>
              <p style={{ color: '#6b7280', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                "{story.story}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

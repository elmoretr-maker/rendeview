import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import logoImage from "@/assets/logo-centered.png";

export default function About() {
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
          marginBottom: '32px',
        }}
      >
        <ArrowLeft size={18} />
        Back
      </button>

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
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#9333ea',
              fontFamily: "'Playfair Display', serif",
              margin: 0,
            }}
          >
            About Rende-View
          </h1>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
            Video-First Dating
          </h2>
          <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '16px' }}>
            Rende-View is the premier video-first dating platform designed to help you make authentic connections. 
            We believe that real chemistry can only be discovered face-to-face, which is why we prioritize video 
            interactions over endless text messaging.
          </p>
          <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '16px' }}>
            Our mission is simple: help you date smarter, not harder. No more catfishing, no more wasted time 
            on people who look nothing like their photos. With Rende-View, you know exactly who you're meeting 
            before you ever leave your home.
          </p>
          <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
            Join thousands of singles who are tired of the traditional dating app experience and are ready 
            for something more authentic.
          </p>
        </div>
      </div>
    </div>
  );
}

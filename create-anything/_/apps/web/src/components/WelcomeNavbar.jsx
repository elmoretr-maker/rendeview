import React from "react";
import { useNavigate } from "react-router";
import logoImage from "@/assets/logo-centered.png";

const navLinks = [
  { label: "About", path: "/about" },
  { label: "Safety", path: "/safety" },
  { label: "Success Stories", path: "/success-stories" },
];

export default function WelcomeNavbar() {
  const navigate = useNavigate();

  return (
    <nav
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        backgroundColor: 'transparent',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}
        onClick={() => navigate("/")}
      >
        <img
          src={logoImage}
          alt="Rende-View"
          style={{ width: '32px', height: '32px', objectFit: 'contain' }}
        />
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#9333ea',
          }}
        >
          Rende-View
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {navLinks.map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '8px 0',
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.color = '#9333ea'}
            onMouseOut={(e) => e.target.style.color = '#6b7280'}
          >
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

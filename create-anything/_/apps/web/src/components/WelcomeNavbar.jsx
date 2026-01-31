import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Menu, X } from "lucide-react";
import logoImage from "@/assets/logo-centered.png";

const navLinks = [
  { label: "About", path: "/about" },
  { label: "Safety", path: "/safety" },
  { label: "Success Stories", path: "/success-stories" },
];

export default function WelcomeNavbar() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <style>{`
        .welcome-navbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        @media (min-width: 768px) {
          .welcome-navbar {
            padding: 16px 24px;
          }
        }
        .welcome-navbar-links {
          display: none;
        }
        @media (min-width: 768px) {
          .welcome-navbar-links {
            display: flex;
            align-items: center;
            gap: 24px;
          }
        }
        .welcome-navbar-mobile-menu {
          display: flex;
        }
        @media (min-width: 768px) {
          .welcome-navbar-mobile-menu {
            display: none;
          }
        }
        .mobile-menu-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background-color: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(8px);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      <nav className="welcome-navbar">
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

        <div className="welcome-navbar-links">
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

        <button
          className="welcome-navbar-mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: '#9333ea',
          }}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {menuOpen && isMobile && (
          <div className="mobile-menu-dropdown">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setMenuOpen(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '12px 16px',
                  textAlign: 'left',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3e8ff'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}

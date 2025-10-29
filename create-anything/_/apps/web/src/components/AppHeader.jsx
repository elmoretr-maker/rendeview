import React from "react";
import { useNavigate, useLocation } from "react-router";
import { Home, Users, MessageCircle, User, LogOut } from "lucide-react";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#FFFFFF",
  text: "#2C3E50",
};

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/discovery", icon: Home, label: "Discover" },
    { path: "/matches", icon: Users, label: "Matches" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <header 
      className="sticky top-0 z-50 shadow-sm border-b"
      style={{ backgroundColor: COLORS.bg, borderColor: "#E5E7EB" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/discovery")}
          >
            <img
              src={new URL("@/assets/logo-centered.png", import.meta.url).href}
              alt="Rende-VIEW"
              className="h-10 w-10 object-contain"
            />
            <span 
              className="font-playfair text-xl font-bold hidden sm:block"
              style={{ color: COLORS.primary }}
            >
              Rende-VIEW
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: active ? COLORS.primary + "15" : "transparent",
                    color: active ? COLORS.primary : COLORS.text,
                  }}
                >
                  <Icon size={20} />
                  <span className="hidden md:inline text-sm font-medium">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

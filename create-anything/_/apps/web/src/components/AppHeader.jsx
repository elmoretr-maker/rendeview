import React from "react";
import { useNavigate, useLocation } from "react-router";
import { Home, Users, MessageCircle, User, Crown, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import logoImage from "@/assets/logo-centered.png";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#FFFFFF",
  text: "#2C3E50",
};

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: newMatchesData } = useQuery({
    queryKey: ["newMatches"],
    queryFn: async () => {
      const res = await fetch("/api/new-matches");
      if (!res.ok) return { matches: [] };
      return res.json();
    },
    refetchInterval: 30000,
    enabled: isMounted,
  });

  const newMatchCount = newMatchesData?.matches?.length || 0;

  const navItems = [
    { path: "/discovery", icon: Home, label: "Discover" },
    { path: "/new-matches", icon: Heart, label: "New Matches", badge: newMatchCount },
    { path: "/matches", icon: Users, label: "Matches" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    { path: "/settings/subscription", icon: Crown, label: "Membership" },
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
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/discovery")}
          >
            <img
              src={logoImage}
              alt="Rende-VIEW"
              className="logo-image"
              style={{ width: '32px', height: '32px' }}
            />
            <span 
              className="font-playfair text-lg font-bold hidden sm:block"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all relative"
                  style={{
                    backgroundColor: active ? COLORS.primary + "15" : "transparent",
                    color: active ? COLORS.primary : COLORS.text,
                  }}
                >
                  <Icon size={20} />
                  <span className="hidden md:inline text-sm font-medium">
                    {item.label}
                  </span>
                  {item.badge > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: COLORS.secondary }}
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

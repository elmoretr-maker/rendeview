import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Heart, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import MatchCelebration from "@/components/MatchCelebration";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
  cardBg: "#F3F4F6",
};

// Swipeable Card Component
function SwipeableCard({ profile, onSwipeLeft, onSwipeRight, onTap, index, totalCards, isLocked, userInterests }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const [exitX, setExitX] = React.useState(0);

  // Calculate mutual interests
  const mutualInterests = React.useMemo(() => {
    if (!userInterests || !profile.interests) return [];
    return userInterests.filter(interest => 
      profile.interests.includes(interest)
    );
  }, [userInterests, profile.interests]);

  const handleDragEnd = (event, info) => {
    if (isLocked) return;
    
    if (Math.abs(info.offset.x) > 100) {
      setExitX(info.offset.x > 0 ? 300 : -300);
      if (info.offset.x > 0) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    }
  };

  return (
    <motion.div
      style={{
        x,
        rotate,
        opacity,
        position: 'absolute',
        width: '100%',
        cursor: isLocked ? 'not-allowed' : 'grab',
      }}
      drag={isLocked ? false : "x"}
      dragConstraints={{ left: -1000, right: 1000, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        y: index * 10,
        zIndex: totalCards - index,
      }}
      exit={{
        x: exitX,
        opacity: 0,
        rotate: exitX > 0 ? 25 : -25,
        transition: { duration: 0.3 }
      }}
      whileDrag={isLocked ? {} : { cursor: 'grabbing', scale: 1.05 }}
      className="touch-none"
    >
      <div 
        className="w-full rounded-3xl shadow-2xl overflow-hidden relative"
        style={{ backgroundColor: "white" }}
      >
        <button
          onClick={onTap}
          className="w-full relative"
        >
          {profile.photo ? (
            <div className="relative">
              <img
                src={profile.photo}
                alt={profile.name || `User ${profile.id}`}
                className="w-full h-[500px] object-cover"
                style={{ backgroundColor: COLORS.cardBg }}
              />
              {/* Gradient overlay for text readability */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-32"
                style={{ 
                  background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" 
                }}
              />
            </div>
          ) : (
            <div
              className="w-full h-[500px] flex items-center justify-center"
              style={{ backgroundColor: COLORS.cardBg }}
            >
              <span className="text-gray-600">View Profile</span>
            </div>
          )}
          
          {/* Profile info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-bold">
                {profile.name || "User " + profile.id}
              </h2>
              {profile.immediate_available && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  <span className="text-xs font-semibold">Online</span>
                </div>
              )}
            </div>
            
            {/* Special indicators */}
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.liked_you && (
                <span 
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: COLORS.secondary, color: "white" }}
                >
                  <Heart size={12} fill="white" />
                  Likes You
                </span>
              )}
              {mutualInterests.length > 0 && (
                <span 
                  className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: COLORS.primary, color: "white" }}
                >
                  {mutualInterests.length} Shared Interest{mutualInterests.length > 1 ? 's' : ''}
                </span>
              )}
              {profile.membership_tier && (
                <span 
                  className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
                >
                  {profile.membership_tier.charAt(0).toUpperCase() + profile.membership_tier.slice(1)}
                </span>
              )}
            </div>
            
            {/* Show mutual interests details */}
            {mutualInterests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {mutualInterests.slice(0, 3).map((interest, idx) => (
                  <span 
                    key={idx}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                  >
                    {interest}
                  </span>
                ))}
                {mutualInterests.length > 3 && (
                  <span className="text-xs opacity-75">+{mutualInterests.length - 3} more</span>
                )}
              </div>
            )}
            
            {profile.bio && (
              <p className="text-sm opacity-90 line-clamp-2 mt-2">
                {profile.bio}
              </p>
            )}
          </div>
        </button>

        {/* Tap to view full profile hint */}
        <div className="px-6 py-4 text-center border-t border-gray-100">
          <p className="text-sm opacity-60" style={{ color: COLORS.text }}>
            Swipe or tap photo to interact
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Discovery() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: user, loading: userLoading } = useUser();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["discovery"],
    queryFn: async () => {
      const res = await fetch("/api/discovery/list");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profiles");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const [index, setIndex] = useState(0);
  const [removedCards, setRemovedCards] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  
  useEffect(() => {
    setIndex(0);
    setRemovedCards([]);
  }, [data]);

  const likeMutation = useMutation({
    mutationFn: async (likedId) => {
      const res = await fetch("/api/matches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likedId }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: (data, likedId) => {
      const profileIndex = profiles.findIndex(p => p.id === likedId);
      setRemovedCards(prev => [...prev, profileIndex]);
      setIndex((i) => i + 1);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      
      if (data?.matched) {
        const matchedProfile = profiles.find(p => p.id === likedId);
        setMatchedUser({
          name: matchedProfile?.name,
          photo: matchedProfile?.photo,
        });
        setShowCelebration(true);
      } else {
        toast.success("Profile liked!");
      }
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required", {
          description: "Please sign in to continue.",
        });
        navigate("/account/signin");
        return;
      }
      toast.error("Could not perform action");
    },
  });

  const discardMutation = useMutation({
    mutationFn: async (blockedId) => {
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to discard");
      return res.json();
    },
    onSuccess: (data, blockedId) => {
      const profileIndex = profiles.findIndex(p => p.id === blockedId);
      setRemovedCards(prev => [...prev, profileIndex]);
      setIndex((i) => i + 1);
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      
      if (data?.warning) {
        toast.warning(data.warning, { duration: 6000 });
      }
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required", {
          description: "Please sign in to continue.",
        });
        navigate("/account/signin");
        return;
      }
      toast.error("Could not discard profile");
    },
  });

  const profiles = data?.profiles || [];
  const visibleProfiles = profiles.filter((_, i) => !removedCards.includes(i));
  const currentIndex = profiles.findIndex((_, i) => !removedCards.includes(i));
  const current = visibleProfiles[0];

  if (userLoading || isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-20 px-4" style={{ backgroundColor: COLORS.bg }}>
        {error?.message === "AUTH_401" ? (
          <div>
            <p className="mb-3 text-gray-700">
              Session expired. Please sign in.
            </p>
            <button
              onClick={() => navigate("/account/signin")}
              className="px-4 py-2 rounded-lg text-white font-semibold shadow-lg"
              style={{ backgroundColor: COLORS.primary }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <p className="text-gray-700">Error loading profiles</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: COLORS.bg }}
    >
      <AppHeader />
      <MatchCelebration
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        matchedUser={matchedUser}
      />
      <div className="pt-4 px-4">
        <h1
          className="text-2xl font-playfair font-bold mb-3 text-center"
          style={{ color: COLORS.text }}
        >
          Discover Your Match
        </h1>
      {current ? (
        <div className="flex flex-col items-center max-w-md mx-auto pb-8">
          {/* Card Carousel Stack */}
          <div className="relative w-full mb-6" style={{ height: '580px' }}>
            <AnimatePresence>
              {visibleProfiles.slice(0, 3).map((profile, idx) => (
                <SwipeableCard
                  key={profile.id}
                  profile={profile}
                  index={idx}
                  totalCards={Math.min(3, visibleProfiles.length)}
                  isLocked={idx === 0 && (likeMutation.isPending || discardMutation.isPending)}
                  userInterests={user?.interests || []}
                  onSwipeLeft={() => discardMutation.mutate(profile.id)}
                  onSwipeRight={() => likeMutation.mutate(profile.id)}
                  onTap={() => navigate(`/profile/${profile.id}`)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Counter and Undo */}
          <div className="flex gap-3 items-center justify-center mb-4">
            <button
              onClick={() => setRemovedCards([])}
              disabled={removedCards.length === 0}
              className="px-4 py-2 rounded-full flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: "white", color: COLORS.primary }}
            >
              <RotateCcw size={18} />
              Reset
            </button>
            <span className="text-sm font-medium" style={{ color: COLORS.text }}>
              {currentIndex + 1} of {profiles.length}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-6 items-center justify-center">
            <button
              onClick={() => discardMutation.mutate(current.id)}
              disabled={discardMutation.isPending}
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all disabled:opacity-50 hover:scale-110"
              style={{ backgroundColor: "white" }}
            >
              <X color={COLORS.error} size={32} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => likeMutation.mutate(current.id)}
              disabled={likeMutation.isPending}
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 hover:scale-110"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Heart color="white" size={36} fill="white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
          <p className="text-gray-600 mb-3">No more profiles.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg text-white font-semibold shadow-lg"
            style={{ backgroundColor: COLORS.primary }}
          >
            Refresh
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

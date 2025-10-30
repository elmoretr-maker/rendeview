import React from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, MessageCircle, X } from "lucide-react";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  bg: "#F9F9F9",
  text: "#2C3E50",
};

export default function MatchCelebration({ isOpen, onClose, matchedUser }) {
  const navigate = useNavigate();

  if (!isOpen || !matchedUser) return null;

  const handleViewMatch = () => {
    onClose();
    navigate("/new-matches");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={24} style={{ color: COLORS.text }} />
            </button>

            {/* Sparkles animation */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, (Math.random() - 0.5) * 200],
                    y: [0, (Math.random() - 0.5) * 200],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                  className="absolute"
                  style={{
                    left: `${50 + (Math.random() - 0.5) * 30}%`,
                    top: `${50 + (Math.random() - 0.5) * 30}%`,
                  }}
                >
                  <Sparkles size={20} style={{ color: COLORS.secondary }} />
                </motion.div>
              ))}
            </div>

            {/* Content */}
            <div className="text-center relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6, times: [0, 0.6, 1] }}
                className="mb-6"
              >
                <div className="inline-block relative">
                  <Heart
                    size={100}
                    fill={COLORS.secondary}
                    color={COLORS.secondary}
                    className="animate-pulse"
                  />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles size={32} style={{ color: COLORS.primary }} />
                  </motion.div>
                </div>
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold mb-3"
                style={{ color: COLORS.primary }}
              >
                It's a Match!
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg mb-2"
                style={{ color: COLORS.text }}
              >
                You and <span className="font-bold">{matchedUser.name || "this user"}</span>
              </motion.p>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg mb-6"
                style={{ color: COLORS.text }}
              >
                liked each other!
              </motion.p>

              {matchedUser.photo && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="mb-6"
                >
                  <img
                    src={matchedUser.photo}
                    alt={matchedUser.name || "Match"}
                    className="w-32 h-32 rounded-full mx-auto ring-4 shadow-xl"
                    style={{ ringColor: COLORS.secondary }}
                  />
                </motion.div>
              )}

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <button
                  onClick={handleViewMatch}
                  className="w-full py-3 px-6 rounded-full text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  <Heart size={20} fill="white" />
                  View New Match
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-3 px-6 rounded-full font-semibold shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                  style={{ backgroundColor: COLORS.bg, color: COLORS.text }}
                >
                  Keep Swiping
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-sm mt-4"
                style={{ color: "#999" }}
              >
                Start a conversation in New Matches!
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

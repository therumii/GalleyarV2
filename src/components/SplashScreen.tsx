import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppLogo } from "./AppLogo";

interface SplashScreenProps {
  isReady: boolean;
  onFinished?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isReady,
  onFinished,
  minDurationMs = 1200,
}) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Ensure splash is displayed for at least minDurationMs for a smooth, cohesive opening experience
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs]);

  useEffect(() => {
    if (isReady && minTimeElapsed) {
      // Trigger smooth fade out
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        onFinished?.();
      }, 150);
      return () => clearTimeout(hideTimer);
    }
  }, [isReady, minTimeElapsed, onFinished]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="app-splash-screen"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 select-none overflow-hidden"
          style={{
            backgroundColor: "#020617",
          }}
        >
          {/* Subtle ambient lighting backdrop */}
          <div className="absolute w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none -translate-y-4" />

          {/* Centered App Icon of Normal Size */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative flex flex-col items-center justify-center"
          >
            {/* App Icon centered with normal size */}
            <div className="relative">
              <AppLogo size="splash" glow={true} animate={false} />
            </div>

            {/* Subtle App Name underneath with clean typography */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
              className="mt-6 flex flex-col items-center"
            >
              <h1 className="text-xl font-bold tracking-tight text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
                Galleyar
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Smart Photos & AI Gallery
              </p>
            </motion.div>
          </motion.div>

          {/* Sleek bottom loader bar */}
          <div className="absolute bottom-10 inset-x-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-32 h-1 bg-slate-900 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1.1,
                  ease: "easeInOut",
                }}
                className="w-1/2 h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

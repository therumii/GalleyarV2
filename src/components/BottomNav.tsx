import React from "react";
import { motion } from "motion/react";
import { Image, Video, FolderHeart, Sparkles } from "lucide-react";
import { ViewMode } from "../types";

interface BottomNavProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
}

interface NavTab {
  id: ViewMode;
  label: string;
  icon: React.ElementType;
}

const TABS: NavTab[] = [
  { id: "photos", label: "Photos", icon: Image },
  { id: "videos", label: "Videos", icon: Video },
  { id: "albums", label: "Albums", icon: FolderHeart },
  { id: "memories", label: "Memories", icon: Sparkles },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onSelectView,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/80 px-3 py-2 shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1.5 relative bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
        {TABS.map((tab) => {
          const isActive = currentView === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectView(tab.id)}
              className="relative py-2 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl cursor-pointer select-none outline-none transition-colors group"
            >
              {/* Liquid Bubble Highlight Background */}
              {isActive && (
                <motion.div
                  layoutId="liquidNavBubble"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/35 overflow-hidden"
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 30,
                    mass: 0.8,
                  }}
                >
                  {/* Liquid sheen highlight */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/15 to-white/30 rounded-xl" />
                  {/* Liquid drop soft blur dot */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-indigo-200/40 rounded-full blur-xs" />
                </motion.div>
              )}

              {/* Icon & Label */}
              <motion.div
                className="relative z-10 flex flex-col items-center gap-0.5"
                animate={{
                  scale: isActive ? 1.06 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: "spring", stiffness: 450, damping: 28 }}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? "text-white drop-shadow-sm"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span
                  className={`text-[11px] font-extrabold tracking-tight transition-colors ${
                    isActive
                      ? "text-white drop-shadow-xs"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </span>
              </motion.div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

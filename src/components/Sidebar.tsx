import React, { useState } from "react";
import {
  Image,
  Video,
  FolderHeart,
  Sparkles,
  Users,
  MapPin,
  Lock,
  Trash2,
  Plus,
  Zap,
  X,
  Smartphone,
  HardDrive,
} from "lucide-react";
import { ViewMode } from "../types";
import { AppLogo } from "./AppLogo";

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  favoritesCount: number;
  trashCount: number;
  hiddenCount: number;
  onOpenUpload: () => void;
  onOpenDeviceSync?: () => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  favoritesCount,
  trashCount,
  hiddenCount,
  onOpenUpload,
  onOpenDeviceSync,
  isOpen,
  onClose,
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX !== null && onClose) {
      const endX = e.changedTouches[0].clientX;
      const deltaX = touchStartX - endX;
      // If swiped left by 30px or more, close sidebar
      if (deltaX > 30) {
        onClose();
      }
    }
    setTouchStartX(null);
  };

  const mainNavItems = [
    {
      id: "photos" as ViewMode,
      label: "All Photos",
      icon: Image,
      badge: null,
    },
    {
      id: "videos" as ViewMode,
      label: "Videos",
      icon: Video,
      badge: null,
    },
    {
      id: "albums" as ViewMode,
      label: "Albums",
      icon: FolderHeart,
      badge: null,
    },
    {
      id: "memories" as ViewMode,
      label: "Memories",
      icon: Sparkles,
      badge: "AI",
      badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    },
    {
      id: "people" as ViewMode,
      label: "People & Pets",
      icon: Users,
      badge: null,
    },
    {
      id: "places" as ViewMode,
      label: "Places Map",
      icon: MapPin,
      badge: null,
    },
  ];

  const secondaryNavItems = [
    {
      id: "hidden" as ViewMode,
      label: "Personal Diaries",
      icon: Lock,
      count: null,
    },
    {
      id: "trash" as ViewMode,
      label: "Recently Deleted",
      icon: Trash2,
      count: trashCount > 0 ? trashCount : null,
    },
  ];

  return (
    <>
      {/* Backdrop overlay when sidebar is open */}
      {isOpen && (
        <div
          onClick={onClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md cursor-pointer transition-opacity animate-fade-in lg:hidden touch-none"
          title="Click anywhere on the right to close sidebar"
        />
      )}

      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed lg:static inset-y-0 left-0 z-[60] lg:z-auto w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
      {/* App Branding Header */}
      <div className="p-5 flex flex-col gap-4 border-b border-slate-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo size="md" glow={true} />
            <div>
              <h1 className="font-black text-slate-100 text-xl tracking-tight flex items-center gap-1.5">
                Galleyar
              </h1>
              <p className="text-[11px] font-medium text-slate-400">Smart Photos & AI Gallery</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer transition-colors lg:hidden"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onOpenUpload}
            className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Media</span>
          </button>
        </div>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto py-5 px-3.5 space-y-7">
        <div className="space-y-1.5">
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Library
          </p>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shadow-md"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? "text-indigo-400" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Utility / Vault */}
        <div className="space-y-1.5">
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Organize & Vault
          </p>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shadow-md"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? "text-indigo-400" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== null && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/80">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  </>
);
};

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Type,
  Palette,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoveHorizontal,
  Sun,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Check,
  Layers,
  SlidersHorizontal,
  Sliders,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import { TextOverlay, TextFillType } from "../../types";
import {
  AVAILABLE_FONTS,
  POPULAR_COLORS,
  POPULAR_BG_COLORS,
  BLEND_MODES,
} from "../../utils/textFonts";
import { haptics } from "../../utils/haptics";

type TextCategoryTab = "font" | "style" | "color" | "align" | "more";
type MoreSubSection = "blend" | "opacity" | "spacing" | "effects";

interface TextEditorBottomBarProps {
  selectedOverlay: TextOverlay | null;
  allOverlays: TextOverlay[];
  onAddText: () => void;
  onUpdateSelected: (partial: Partial<TextOverlay>) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onStartInlineEdit: () => void;
  onSelectOverlay: (id: string) => void;
}

/**
 * Interactive Gradient Angle Control
 * Combines an interactive circular angle dial with a live continuous slider.
 */
const GradientAngleControl: React.FC<{
  angle: number;
  onChange: (angle: number) => void;
}> = ({ angle, onChange }) => {
  const dialRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const updateAngleFromPointer = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    const deg = Math.round((rad * 180) / Math.PI);
    // Standard CSS linear gradient convention: 0deg is top (12 o'clock), 90deg is right (3 o'clock)
    const cssDeg = Math.round((deg + 90 + 360) % 360);
    onChange(cssDeg);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateAngleFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    updateAngleFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Radian for positioning indicator dot in dial
  const displayRad = ((angle - 90) * Math.PI) / 180;
  const radius = 14;
  const pointerX = 18 + Math.cos(displayRad) * radius;
  const pointerY = 18 + Math.sin(displayRad) * radius;

  return (
    <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800/90">
      {/* Interactive Dial */}
      <div
        ref={dialRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700/90 relative cursor-pointer touch-none select-none flex items-center justify-center hover:border-indigo-400 transition-colors shadow-inner shrink-0"
        title="Drag to change gradient angle"
      >
        {/* Pivot Center */}
        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 pointer-events-none" />

        {/* Vector Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line
            x1="18"
            y1="18"
            x2={pointerX}
            y2={pointerY}
            stroke="#818cf8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* Vector Direction Pointer */}
        <div
          className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)] pointer-events-none"
          style={{ left: `${pointerX}px`, top: `${pointerY}px` }}
        />
      </div>

      {/* Angle Slider + Live Degree Readout */}
      <div className="flex items-center gap-2.5 flex-1 min-w-[130px]">
        <span className="text-[11px] text-slate-400 font-semibold shrink-0">Angle:</span>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={angle}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
        />
        <span className="text-slate-200 font-mono text-xs font-semibold w-10 text-right shrink-0">
          {angle}°
        </span>
      </div>
    </div>
  );
};

export const TextEditorBottomBar: React.FC<TextEditorBottomBarProps> = ({
  selectedOverlay,
  allOverlays,
  onAddText,
  onUpdateSelected,
  onDeleteSelected,
  onDuplicateSelected,
  onStartInlineEdit,
  onSelectOverlay,
}) => {
  const [activeTab, setActiveTab] = useState<TextCategoryTab>("font");
  const [colorMode, setColorMode] = useState<TextFillType>("solid");
  const [solidColorTarget, setSolidColorTarget] = useState<"text" | "bg">("text");
  const [moreSubSection, setMoreSubSection] = useState<MoreSubSection>("blend");

  // If no text layer is selected, show streamlined Add Text action bar
  if (!selectedOverlay) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg mx-auto flex flex-col items-center gap-2 p-2 select-none"
      >
        <button
          onClick={() => {
            haptics.selection();
            onAddText();
          }}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Add Text</span>
        </button>

        {allOverlays.length > 0 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1 scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0">
              Layers ({allOverlays.length}):
            </span>
            {allOverlays.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => {
                  haptics.selection();
                  onSelectOverlay(t.id);
                }}
                className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white hover:border-indigo-500/50 truncate max-w-[120px] shrink-0 cursor-pointer"
              >
                {t.text || `Text ${idx + 1}`}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center font-medium">
            Tap "+ Add Text" to insert a customizable typography layer
          </p>
        )}
      </motion.div>
    );
  }

  // Active gradient config helper
  const activeGradient = selectedOverlay.gradient || {
    enabled: selectedOverlay.fillType === "gradient",
    colors: ["#f97316", "#db2777"],
    angle: 90,
  };

  const isGradientActive = selectedOverlay.fillType === "gradient";

  const tabs: { id: TextCategoryTab; label: string; icon: React.ElementType }[] = [
    { id: "font", label: "Font", icon: Type },
    { id: "style", label: "Style", icon: Sparkles },
    { id: "color", label: "Color", icon: Palette },
    { id: "align", label: "Align", icon: AlignLeft },
    { id: "more", label: "More", icon: SlidersHorizontal },
  ];

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-2 p-1 select-none">
      {/* Category Tabs Header + Quick Actions (Edit, Duplicate, Delete, Add) */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  haptics.selection();
                  setActiveTab(tab.id);
                  if (tab.id === "color") {
                    setColorMode(isGradientActive ? "gradient" : "solid");
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isTabActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Layer Controls: Edit Text, Duplicate, Delete, Add Another */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              haptics.selection();
              onStartInlineEdit();
            }}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors"
            title="Edit text content"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              haptics.selection();
              onDuplicateSelected();
            }}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors"
            title="Duplicate text layer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              haptics.light();
              onDeleteSelected();
            }}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 cursor-pointer transition-colors"
            title="Delete text layer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              haptics.selection();
              onAddText();
            }}
            className="p-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 cursor-pointer transition-colors"
            title="Add another text layer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content Panel */}
      <div className="min-h-[84px] flex items-center">
        <AnimatePresence mode="wait">
          {/* 1. FONT SELECTOR TAB */}
          {activeTab === "font" && (
            <motion.div
              key="font-tab"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="w-full flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none py-1"
            >
              {AVAILABLE_FONTS.map((font) => {
                const isSelectedFont = selectedOverlay.fontFamily === font.id;
                const previewSnippet =
                  selectedOverlay.text && selectedOverlay.text.length <= 10
                    ? selectedOverlay.text
                    : font.name;

                return (
                  <button
                    key={font.id}
                    onClick={() => {
                      haptics.selection();
                      onUpdateSelected({ fontFamily: font.id });
                    }}
                    className={`flex flex-col items-center justify-center min-w-[76px] px-3 py-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                      isSelectedFont
                        ? "bg-indigo-600/20 border-indigo-400 text-white shadow-md shadow-indigo-500/20"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <span
                      className="text-sm font-semibold truncate max-w-[80px]"
                      style={{ fontFamily: font.fontFamilyCss }}
                    >
                      {previewSnippet}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{font.name}</span>
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* 2. STYLE TAB */}
          {activeTab === "style" && (
            <motion.div
              key="style-tab"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="w-full flex flex-col gap-2.5 py-1"
            >
              {/* Row 1: Font Weight & Decorations */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Bold */}
                <button
                  onClick={() => {
                    haptics.selection();
                    onUpdateSelected({ bold: !selectedOverlay.bold });
                  }}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    selectedOverlay.bold
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                  onClick={() => {
                    haptics.selection();
                    onUpdateSelected({ italic: !selectedOverlay.italic });
                  }}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    selectedOverlay.italic
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                  onClick={() => {
                    haptics.selection();
                    onUpdateSelected({ underline: !selectedOverlay.underline });
                  }}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    selectedOverlay.underline
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                  title="Underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>

                {/* Strikethrough */}
                <button
                  onClick={() => {
                    haptics.selection();
                    onUpdateSelected({ strikethrough: !selectedOverlay.strikethrough });
                  }}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    selectedOverlay.strikethrough
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                {/* Shadow Toggle */}
                <button
                  onClick={() => {
                    haptics.selection();
                    const next = !(selectedOverlay.shadow || selectedOverlay.style === "shadow");
                    onUpdateSelected({
                      shadow: next,
                      style: next ? "shadow" : "normal",
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedOverlay.shadow || selectedOverlay.style === "shadow"
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  Shadow
                </button>

                {/* Outline Toggle */}
                <button
                  onClick={() => {
                    haptics.selection();
                    const next = !(selectedOverlay.stroke || selectedOverlay.style === "outline");
                    onUpdateSelected({
                      stroke: next,
                      style: next ? "outline" : "normal",
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedOverlay.stroke || selectedOverlay.style === "outline"
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  Outline
                </button>
              </div>

              {/* Row 2: Background Shape Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">
                  Background:
                </span>
                {[
                  { id: "none", label: "None" },
                  { id: "solid", label: "Solid" },
                  { id: "rounded", label: "Rounded" },
                  { id: "pill", label: "Pill" },
                ].map((bgOption) => {
                  const currentBg =
                    selectedOverlay.bgStyle ||
                    (selectedOverlay.style === "background" ? "rounded" : "none");
                  const isSel = currentBg === bgOption.id;

                  return (
                    <button
                      key={bgOption.id}
                      onClick={() => {
                        haptics.selection();
                        if (bgOption.id === "none") {
                          onUpdateSelected({
                            bgStyle: "none",
                            style: selectedOverlay.style === "background" ? "normal" : selectedOverlay.style,
                          });
                        } else {
                          onUpdateSelected({
                            bgStyle: bgOption.id as any,
                            style: "background",
                            bgColor: selectedOverlay.bgColor || "rgba(0, 0, 0, 0.75)",
                          });
                        }
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                        isSel
                          ? "bg-indigo-600 text-white border-indigo-400"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                      }`}
                    >
                      {bgOption.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* 3. COLOR TAB (Solid vs Gradient) */}
          {activeTab === "color" && (
            <motion.div
              key="color-tab"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="w-full flex flex-col gap-2.5 py-1"
            >
              {/* Color Mode Switcher: Solid vs Gradient */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                  <button
                    onClick={() => {
                      haptics.selection();
                      setColorMode("solid");
                      onUpdateSelected({ fillType: "solid" });
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      colorMode === "solid"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Solid Color
                  </button>
                  <button
                    onClick={() => {
                      haptics.selection();
                      setColorMode("gradient");
                      onUpdateSelected({
                        fillType: "gradient",
                        gradient: {
                          enabled: true,
                          colors: activeGradient.colors.length >= 2 ? activeGradient.colors : ["#f97316", "#db2777"],
                          angle: activeGradient.angle ?? 90,
                        },
                      });
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      colorMode === "gradient"
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Gradient</span>
                  </button>
                </div>

                {/* Mode-specific Sub Options */}
                {colorMode === "solid" && (
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
                    <button
                      onClick={() => setSolidColorTarget("text")}
                      className={`px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        solidColorTarget === "text"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Text
                    </button>
                    <button
                      onClick={() => setSolidColorTarget("bg")}
                      className={`px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        solidColorTarget === "bg"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Background
                    </button>
                  </div>
                )}
              </div>

              {/* SOLID COLOR VIEW - With Rock-Solid Fixed Geometry and Non-Clipping Selection Ring */}
              {colorMode === "solid" && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 scrollbar-none">
                  {/* Custom Color Input Box */}
                  <div className="w-8 h-8 flex items-center justify-center shrink-0 relative">
                    <label
                      htmlFor="solid-custom-picker"
                      className="w-6 h-6 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-slate-500 cursor-pointer shadow-sm"
                      title="Choose custom color"
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{
                          backgroundColor:
                            solidColorTarget === "text"
                              ? selectedOverlay.color || "#ffffff"
                              : selectedOverlay.bgColor || "#000000",
                        }}
                      />
                    </label>
                    <input
                      id="solid-custom-picker"
                      type="color"
                      value={
                        solidColorTarget === "text"
                          ? selectedOverlay.color || "#ffffff"
                          : selectedOverlay.bgColor || "#000000"
                      }
                      onChange={(e) => {
                        const col = e.target.value;
                        if (solidColorTarget === "text") {
                          onUpdateSelected({ color: col, fillType: "solid" });
                        } else {
                          onUpdateSelected({ bgColor: col, style: "background" });
                        }
                      }}
                      className="sr-only"
                    />
                  </div>

                  {/* Palette swatches with rock-solid fixed geometry */}
                  {(solidColorTarget === "text" ? POPULAR_COLORS : POPULAR_BG_COLORS).map(
                    (colorHex) => {
                      const isCurrent =
                        solidColorTarget === "text"
                          ? selectedOverlay.color === colorHex
                          : selectedOverlay.bgColor === colorHex;

                      return (
                        <div
                          key={colorHex}
                          className="w-8 h-8 flex items-center justify-center shrink-0 relative"
                        >
                          {/* Independent Selection Ring - never causes layout shift or resize */}
                          {isCurrent && (
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-400 pointer-events-none shadow-sm" />
                          )}

                          <button
                            onClick={() => {
                              haptics.selection();
                              if (solidColorTarget === "text") {
                                onUpdateSelected({ color: colorHex, fillType: "solid" });
                              } else {
                                onUpdateSelected({
                                  bgColor: colorHex,
                                  style: "background",
                                  bgStyle:
                                    selectedOverlay.bgStyle === "none"
                                      ? "rounded"
                                      : selectedOverlay.bgStyle,
                                });
                              }
                            }}
                            style={{ backgroundColor: colorHex }}
                            className="w-6 h-6 rounded-full border border-white/20 cursor-pointer flex items-center justify-center shadow-sm"
                          >
                            {isCurrent && (
                              <Check className="w-3 h-3 text-white mix-blend-difference" />
                            )}
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              {/* SIMPLIFIED GRADIENT VIEW (Start Color, End Color, Interactive Live Angle Control) */}
              {colorMode === "gradient" && (
                <div className="flex flex-col gap-2.5">
                  {/* Row 1: Start Color ●────────────● End Color */}
                  <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800/90">
                    {/* Start Color (1) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0 relative">
                        <label
                          htmlFor="grad-color-1"
                          className="w-6 h-6 rounded-full border border-white/30 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: activeGradient.colors[0] || "#f97316" }}
                          title="Choose Start Color"
                        />
                        <input
                          id="grad-color-1"
                          type="color"
                          value={activeGradient.colors[0] || "#f97316"}
                          onChange={(e) => {
                            const newCol = e.target.value;
                            const newColors = [...activeGradient.colors];
                            newColors[0] = newCol;
                            onUpdateSelected({
                              fillType: "gradient",
                              gradient: {
                                ...activeGradient,
                                colors: newColors,
                              },
                            });
                          }}
                          className="sr-only"
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-300">Start</span>
                    </div>

                    {/* Gradient visual bar */}
                    <div
                      className="flex-1 h-3 rounded-full border border-white/20 relative shadow-inner overflow-hidden"
                      style={{
                        background: `linear-gradient(${activeGradient.angle ?? 90}deg, ${activeGradient.colors.join(", ")})`,
                      }}
                    />

                    {/* End Color (2) */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">End</span>
                      <div className="w-8 h-8 flex items-center justify-center shrink-0 relative">
                        <label
                          htmlFor="grad-color-2"
                          className="w-6 h-6 rounded-full border border-white/30 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: activeGradient.colors[1] || "#db2777" }}
                          title="Choose End Color"
                        />
                        <input
                          id="grad-color-2"
                          type="color"
                          value={activeGradient.colors[1] || "#db2777"}
                          onChange={(e) => {
                            const newCol = e.target.value;
                            const newColors = [...activeGradient.colors];
                            newColors[1] = newCol;
                            onUpdateSelected({
                              fillType: "gradient",
                              gradient: {
                                ...activeGradient,
                                colors: newColors,
                              },
                            });
                          }}
                          className="sr-only"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Single Interactive Gradient Angle Control (Dial + Slider with live updates) */}
                  <GradientAngleControl
                    angle={activeGradient.angle ?? 90}
                    onChange={(newAngle) => {
                      onUpdateSelected({
                        fillType: "gradient",
                        gradient: {
                          ...activeGradient,
                          angle: newAngle,
                        },
                      });
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* 4. ALIGN TAB */}
          {activeTab === "align" && (
            <motion.div
              key="align-tab"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="w-full flex items-center justify-between gap-2 flex-wrap py-1"
            >
              {/* Text Alignment */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[
                  { id: "left", icon: AlignLeft, label: "Left" },
                  { id: "center", icon: AlignCenter, label: "Center" },
                  { id: "right", icon: AlignRight, label: "Right" },
                ].map((align) => {
                  const Icon = align.icon;
                  const isCurrent = (selectedOverlay.alignment || "center") === align.id;
                  return (
                    <button
                      key={align.id}
                      onClick={() => {
                        haptics.selection();
                        onUpdateSelected({ alignment: align.id as any });
                      }}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title={align.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>

              {/* Canvas Center Snap Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    haptics.light();
                    onUpdateSelected({ xNormalized: 0.5 });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Snap Center X
                </button>
                <button
                  onClick={() => {
                    haptics.light();
                    onUpdateSelected({ yNormalized: 0.5 });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Snap Center Y
                </button>
              </div>

              {/* Text case conversion */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    haptics.selection();
                    onUpdateSelected({ text: selectedOverlay.text.toUpperCase() });
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer"
                >
                  UPPER
                </button>
                <button
                  onClick={() => {
                    haptics.selection();
                    onUpdateSelected({ text: selectedOverlay.text.toLowerCase() });
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer"
                >
                  lower
                </button>
              </div>
            </motion.div>
          )}

          {/* 5. MORE TAB (Blend Mode, Opacity, Spacing, Effects) */}
          {activeTab === "more" && (
            <motion.div
              key="more-tab"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="w-full flex flex-col gap-2.5 py-1"
            >
              {/* More Sub-sections Navigation */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/60">
                {[
                  { id: "blend", label: "Blend Mode", icon: Layers },
                  { id: "opacity", label: "Opacity & Size", icon: Sun },
                  { id: "spacing", label: "Spacing", icon: MoveHorizontal },
                  { id: "effects", label: "Shadow & Stroke", icon: Sliders },
                ].map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = moreSubSection === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        haptics.selection();
                        setMoreSubSection(sub.id as MoreSubSection);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        isSubActive
                          ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <SubIcon className="w-3.5 h-3.5" />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* SUB-SECTION 1: BLEND MODES */}
              {moreSubSection === "blend" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {BLEND_MODES.map((mode) => {
                      const isModeActive = (selectedOverlay.blendMode || "normal") === mode.id;

                      return (
                        <button
                          key={mode.id}
                          onClick={() => {
                            haptics.selection();
                            onUpdateSelected({ blendMode: mode.id });
                          }}
                          className={`px-3.5 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shrink-0 flex flex-col items-center justify-center min-w-[80px] ${
                            isModeActive
                              ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30"
                              : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          <span>{mode.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Blend Mode Description */}
                  <p className="text-[11px] text-slate-400 italic">
                    {BLEND_MODES.find((m) => m.id === (selectedOverlay.blendMode || "normal"))
                      ?.description || "Blends text with the photo"}
                  </p>
                </div>
              )}

              {/* SUB-SECTION 2: OPACITY & SIZE */}
              {moreSubSection === "opacity" && (
                <div className="flex flex-col gap-2">
                  {/* Opacity Slider */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-semibold w-16">Opacity:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={selectedOverlay.opacity ?? 1}
                      onChange={(e) =>
                        onUpdateSelected({ opacity: parseFloat(e.target.value) })
                      }
                      className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                    <span className="text-slate-300 font-mono w-12 text-right">
                      {Math.round((selectedOverlay.opacity ?? 1) * 100)}%
                    </span>
                  </div>

                  {/* Scale Slider */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-semibold w-16">Size:</span>
                    <input
                      type="range"
                      min="0.4"
                      max="3.5"
                      step="0.05"
                      value={selectedOverlay.scale ?? 1}
                      onChange={(e) =>
                        onUpdateSelected({ scale: parseFloat(e.target.value) })
                      }
                      className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                    <span className="text-slate-300 font-mono w-12 text-right">
                      {(selectedOverlay.scale ?? 1).toFixed(1)}x
                    </span>
                  </div>
                </div>
              )}

              {/* SUB-SECTION 3: SPACING */}
              {moreSubSection === "spacing" && (
                <div className="flex flex-col gap-2">
                  {/* Letter Spacing Slider */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-semibold w-24">Letter Spacing:</span>
                    <input
                      type="range"
                      min="-0.05"
                      max="0.4"
                      step="0.01"
                      value={selectedOverlay.letterSpacing ?? 0}
                      onChange={(e) =>
                        onUpdateSelected({ letterSpacing: parseFloat(e.target.value) })
                      }
                      className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                    <span className="text-slate-300 font-mono w-10 text-right">
                      {selectedOverlay.letterSpacing?.toFixed(2) || "0.00"}
                    </span>
                  </div>

                  {/* Line Height Slider */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-semibold w-24">Line Height:</span>
                    <input
                      type="range"
                      min="0.8"
                      max="2.2"
                      step="0.1"
                      value={selectedOverlay.lineSpacing ?? 1.25}
                      onChange={(e) =>
                        onUpdateSelected({ lineSpacing: parseFloat(e.target.value) })
                      }
                      className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                    <span className="text-slate-300 font-mono w-10 text-right">
                      {selectedOverlay.lineSpacing?.toFixed(1) || "1.3"}
                    </span>
                  </div>
                </div>
              )}

              {/* SUB-SECTION 4: SHADOW & STROKE */}
              {moreSubSection === "effects" && (
                <div className="flex flex-col gap-2">
                  {/* Shadow Blur Slider */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-semibold w-24">Shadow Blur:</span>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={selectedOverlay.shadowBlur ?? 8}
                      onChange={(e) =>
                        onUpdateSelected({
                          shadow: true,
                          shadowBlur: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                    <span className="text-slate-300 font-mono w-10 text-right">
                      {selectedOverlay.shadowBlur ?? 8}px
                    </span>
                  </div>

                  {/* Stroke Width Slider */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-semibold w-24">Stroke Width:</span>
                    <input
                      type="range"
                      min="0.5"
                      max="8"
                      step="0.5"
                      value={selectedOverlay.strokeWidth ?? 1.5}
                      onChange={(e) =>
                        onUpdateSelected({
                          stroke: true,
                          strokeWidth: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                    <span className="text-slate-300 font-mono w-10 text-right">
                      {selectedOverlay.strokeWidth ?? 1.5}px
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Layers,
  Sparkles,
  Sliders,
  FlipHorizontal2,
  Trash2,
  Copy,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Check,
} from "lucide-react";
import { StickerOverlay, TextBlendMode } from "../../types";
import {
  STICKER_CATEGORIES,
  STICKER_LIBRARY,
  getStickersByCategory,
  StickerGraphic,
} from "../../utils/stickerLibrary";
import { BLEND_MODES } from "../../utils/textFonts";
import { haptics } from "../../utils/haptics";

interface StickerEditorBottomBarProps {
  selectedSticker: StickerOverlay | null;
  allStickers: StickerOverlay[];
  onAddSticker: (graphic: StickerGraphic) => void;
  onAddGallerySticker: (imageUrl: string, name: string) => void;
  onUpdateSelected: (partial: Partial<StickerOverlay>) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onSelectSticker: (id: string) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export const StickerEditorBottomBar: React.FC<StickerEditorBottomBarProps> = ({
  selectedSticker,
  allStickers,
  onAddSticker,
  onAddGallerySticker,
  onUpdateSelected,
  onDeleteSelected,
  onDuplicateSelected,
  onSelectSticker,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("featured");
  const [activeSubTab, setActiveSubTab] = useState<"library" | "adjust" | "blend" | "layers">("library");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const displayedStickers = getStickersByCategory(activeCategory);

  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        haptics.success();
        onAddGallerySticker(result, file.name || "Custom Sticker");
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-2 p-2 select-none">
      {/* Hidden File Input for Custom Gallery Stickers */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleGalleryFileSelect}
        accept="image/png,image/webp,image/jpeg,image/gif,image/svg+xml"
        className="hidden"
      />

      {/* TOP SUB-NAV BAR (When a sticker is selected, allow adjusting opacity/blend/layers/library) */}
      {selectedSticker && (
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-2xl">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: "library", label: "Add More", icon: Plus },
              { id: "adjust", label: "Adjust", icon: Sliders },
              { id: "blend", label: "Blend", icon: Sparkles },
              { id: "layers", label: "Order", icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    haptics.selection();
                    setActiveSubTab(tab.id as any);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                haptics.selection();
                onDuplicateSelected();
              }}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                haptics.impact();
                onDeleteSelected();
              }}
              className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: STICKER LIBRARY & CATEGORY BROWSER */}
      {(!selectedSticker || activeSubTab === "library") && (
        <div className="space-y-2">
          {/* Category Bar + Add from Gallery Button */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* Highly visible "+ Add from Gallery" button */}
            <button
              onClick={() => {
                haptics.selection();
                fileInputRef.current?.click();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-600/25 shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>+ Add from Gallery</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-800 shrink-0" />

            {STICKER_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    haptics.selection();
                    setActiveCategory(cat.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Graphical Sticker Grid */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-8 sm:gap-2 sm:max-h-36 sm:overflow-y-auto">
            {displayedStickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => {
                  haptics.selection();
                  onAddSticker(sticker);
                }}
                className="w-14 h-14 sm:w-auto sm:aspect-square rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500 hover:bg-slate-900/90 flex items-center justify-center p-2 transition-all cursor-pointer active:scale-90 shrink-0 group shadow-inner"
                title={sticker.name}
              >
                <div
                  className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full transition-transform group-hover:scale-110"
                  dangerouslySetInnerHTML={{ __html: sticker.svgContent }}
                />
              </button>
            ))}
          </div>

          {/* Active Stickers on Photo List */}
          {allStickers.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
              <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0">
                On Photo ({allStickers.length}):
              </span>
              {allStickers.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    haptics.selection();
                    onSelectSticker(s.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    selectedSticker?.id === s.id
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span>{s.name || `Sticker ${idx + 1}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ADJUST STICKER (Opacity, Flip) */}
      {selectedSticker && activeSubTab === "adjust" && (
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-3">
          {/* Opacity Slider */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Opacity</span>
            <span className="font-mono text-indigo-400">
              {Math.round((selectedSticker.opacity ?? 1) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.01"
            value={selectedSticker.opacity ?? 1}
            onChange={(e) =>
              onUpdateSelected({ opacity: parseFloat(e.target.value) })
            }
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />

          {/* Flip Controls */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                haptics.selection();
                onUpdateSelected({ flipH: !selectedSticker.flipH });
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                selectedSticker.flipH
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
              }`}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" />
              <span>Flip Horizontal</span>
            </button>
            <button
              onClick={() => {
                haptics.selection();
                onUpdateSelected({ flipV: !selectedSticker.flipV });
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                selectedSticker.flipV
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
              }`}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5 rotate-90" />
              <span>Flip Vertical</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: BLEND MODES */}
      {selectedSticker && activeSubTab === "blend" && (
        <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>Sticker Blend Mode:</span>
            <span className="text-indigo-300 font-bold uppercase">
              {selectedSticker.blendMode || "Normal"}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {BLEND_MODES.map((mode) => {
              const isActive = (selectedSticker.blendMode || "normal") === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    haptics.selection();
                    onUpdateSelected({ blendMode: mode.id });
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  {mode.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: Z-ORDER / LAYERS */}
      {selectedSticker && activeSubTab === "layers" && (
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
          <p className="text-[11px] text-slate-400 font-medium mb-2 text-center">
            Adjust Layer Depth (Z-Order)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => {
                haptics.selection();
                onBringForward();
              }}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Forward</span>
            </button>
            <button
              onClick={() => {
                haptics.selection();
                onSendBackward();
              }}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>Backward</span>
            </button>
            <button
              onClick={() => {
                haptics.selection();
                onBringToFront();
              }}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUpToLine className="w-3.5 h-3.5 text-pink-400" />
              <span>To Front</span>
            </button>
            <button
              onClick={() => {
                haptics.selection();
                onSendToBack();
              }}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-pink-400" />
              <span>To Back</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

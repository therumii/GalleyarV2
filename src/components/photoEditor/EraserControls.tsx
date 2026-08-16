import React from "react";
import {
  Wand2,
  RotateCcw,
  Undo,
  Trash2,
  Sparkles,
  RefreshCw,
  Sliders,
  Check,
  Circle,
  Eye,
} from "lucide-react";
import { EraserStroke } from "../../utils/inpaintingEngine";
import { haptics } from "../../utils/haptics";

interface EraserControlsProps {
  mode: "remove" | "restore";
  onModeChange: (mode: "remove" | "restore") => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  brushSoftness: number;
  onBrushSoftnessChange: (softness: number) => void;
  strokes: EraserStroke[];
  onUndoStroke: () => void;
  onClearStrokes: () => void;
  onApplyErase: () => void;
  isProcessing: boolean;
  canUndoImage: boolean;
  onUndoImage: () => void;
}

export const EraserControls: React.FC<EraserControlsProps> = ({
  mode,
  onModeChange,
  brushSize,
  onBrushSizeChange,
  brushSoftness,
  onBrushSoftnessChange,
  strokes,
  onUndoStroke,
  onClearStrokes,
  onApplyErase,
  isProcessing,
  canUndoImage,
  onUndoImage,
}) => {
  const activeMaskCount = strokes.filter((s) => s.points.length > 0).length;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-2.5 p-2 select-none">
      {/* 1. TOP MODE SWITCHER: REMOVE VS RESTORE */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800/90 p-1.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 flex-1">
          {/* REMOVE BUTTON */}
          <button
            onClick={() => {
              haptics.selection();
              onModeChange("remove");
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === "remove"
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Remove Object</span>
          </button>

          {/* RESTORE BUTTON */}
          <button
            onClick={() => {
              haptics.selection();
              onModeChange("restore");
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === "restore"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Area</span>
          </button>
        </div>

        {/* Undo Image Step */}
        {canUndoImage && (
          <button
            onClick={() => {
              haptics.selection();
              onUndoImage();
            }}
            className="ml-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Undo previous erase"
          >
            <Undo className="w-4 h-4 text-amber-400" />
          </button>
        )}
      </div>

      {/* 2. BRUSH ADJUSTMENTS (Size & Softness) */}
      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-2.5">
        {/* Brush Size */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Circle className="w-3 h-3 text-slate-400 fill-slate-400" />
              <span>Brush Size</span>
            </span>
            <div className="flex items-center gap-1">
              {[
                { label: "S", size: 15 },
                { label: "M", size: 35 },
                { label: "L", size: 60 },
                { label: "XL", size: 90 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    haptics.selection();
                    onBrushSizeChange(p.size);
                  }}
                  className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    Math.abs(brushSize - p.size) < 8
                      ? "bg-rose-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <span className="font-mono text-rose-400 ml-1.5 w-6 text-right">
                {brushSize}
              </span>
            </div>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="1"
            value={brushSize}
            onChange={(e) => onBrushSizeChange(parseInt(e.target.value, 10))}
            className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {/* Brush Softness / Feather */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Edge Softness / Feather</span>
            <span className="font-mono text-slate-400">
              {Math.round(brushSoftness * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={brushSoftness}
            onChange={(e) => onBrushSoftnessChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>
      </div>

      {/* 3. EXECUTE ERASE / CLEAR BUTTONS */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            haptics.impact();
            onApplyErase();
          }}
          disabled={activeMaskCount === 0 || isProcessing}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMaskCount > 0 && !isProcessing
              ? "bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-lg shadow-rose-600/30 active:scale-95"
              : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
              <span>Reconstructing texture...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 text-amber-300" />
              <span>
                {activeMaskCount > 0
                  ? `Erase Selected (${activeMaskCount} strokes)`
                  : "Paint on image to select object"}
              </span>
            </>
          )}
        </button>

        {/* Undo Stroke */}
        {strokes.length > 0 && (
          <button
            onClick={() => {
              haptics.selection();
              onUndoStroke();
            }}
            disabled={isProcessing}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Undo last stroke"
          >
            <Undo className="w-4 h-4" />
          </button>
        )}

        {/* Clear All Mask */}
        {strokes.length > 0 && (
          <button
            onClick={() => {
              haptics.selection();
              onClearStrokes();
            }}
            disabled={isProcessing}
            className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

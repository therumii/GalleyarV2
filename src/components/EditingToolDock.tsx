import React from "react";
import { motion } from "motion/react";
import { Sun, Crop, Palette, Type, Smile } from "lucide-react";
import { haptics } from "../utils/haptics";

export type EditorTool = "none" | "adjust" | "crop" | "filter" | "text" | "stickers";

interface EditingToolDockProps {
  activeTool: EditorTool | null;
  onSelectTool: (tool: EditorTool) => void;
}

export const EditingToolDock: React.FC<EditingToolDockProps> = ({
  activeTool,
  onSelectTool,
}) => {
  // If activeTool is null (tools closed), do not render the dock
  if (activeTool === null) return null;

  // When activeTool is "none", display the primary 5-button editing tool dock
  if (activeTool !== "none") return null;

  const tools: { id: EditorTool; label: string; icon: React.ElementType; aria: string }[] = [
    { id: "adjust", label: "Adjust", icon: Sun, aria: "Adjust brightness, contrast, exposure and tone" },
    { id: "crop", label: "Crop", icon: Crop, aria: "Crop, rotate and transform aspect ratio" },
    { id: "filter", label: "Filter", icon: Palette, aria: "Choose color filters and styles" },
    { id: "text", label: "Text", icon: Type, aria: "Add text overlays and typography" },
    { id: "stickers", label: "Stickers", icon: Smile, aria: "Add fun stickers and badges" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="w-full max-w-md mx-auto px-2 pointer-events-auto select-none"
    >
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-1.5 shadow-2xl flex items-center justify-around gap-1 sm:gap-2">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                haptics.selection();
                onSelectTool(t.id);
              }}
              aria-label={t.aria}
              className="flex-1 min-h-[44px] sm:min-h-[48px] px-2 py-1.5 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <Icon className="w-4 h-4 text-slate-200 shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

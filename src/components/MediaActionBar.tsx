import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Share2,
  Heart,
  Pencil,
  Sparkles,
  FileText,
  Info,
  Trash2,
  Eye,
} from "lucide-react";
import { Photo } from "../types";
import { haptics } from "../utils/haptics";

export interface MediaActionBarProps {
  photo: Photo;
  isVisible: boolean;
  onShare: () => void;
  onToggleFavorite: (photoId: string) => void;
  onOpenEditor?: (photo: Photo) => void;
  onAutoEnhance?: (photo: Photo) => void;
  onDeletePhoto: (photoId: string) => void;
  onUnhidePhoto?: (photoId: string) => void;
  showInfoPanel: boolean;
  setShowInfoPanel: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void);
  showOCRModal?: boolean;
  setShowOCRModal?: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean) => void);
}

export const MediaActionBar: React.FC<MediaActionBarProps> = ({
  photo,
  isVisible,
  onShare,
  onToggleFavorite,
  onOpenEditor,
  onAutoEnhance,
  onDeletePhoto,
  onUnhidePhoto,
  showInfoPanel,
  setShowInfoPanel,
  showOCRModal,
  setShowOCRModal,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="bg-slate-900/90 border border-slate-700/70 backdrop-blur-2xl px-1.5 py-1 sm:px-2 sm:py-1 rounded-2xl shadow-xl flex items-center gap-1 sm:gap-1.5 pointer-events-auto shrink-0"
        >
          {/* Favorite Overlay Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (photo.isFavorite) {
                haptics.light();
              } else {
                haptics.success();
              }
              onToggleFavorite(photo.id);
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 group ${
              photo.isFavorite
                ? "bg-pink-500/20 text-pink-400 border-pink-500/40 shadow-sm shadow-pink-500/20"
                : "bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
            title={photo.isFavorite ? "Remove from Favorites" : "Favorite Item"}
          >
            <Heart
              className={`w-4 h-4 transition-transform group-active:scale-125 ${
                photo.isFavorite ? "fill-pink-500 text-pink-500" : ""
              }`}
            />
          </button>

          {/* Share Overlay Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              haptics.selection();
              onShare();
            }}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-sky-400 hover:text-sky-300 transition-all cursor-pointer shrink-0 group"
            title="Share Media"
          >
            <Share2 className="w-4 h-4 transition-transform group-active:scale-110" />
          </button>

          {/* Edit Overlay Icon */}
          {onOpenEditor && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.selection();
                onOpenEditor(photo);
              }}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md shadow-indigo-600/30 transition-all shrink-0 group"
              title={photo.isVideo ? "Edit Video" : "Edit Photo"}
            >
              <Pencil className="w-4 h-4 transition-transform group-active:rotate-12" />
            </button>
          )}

          {/* Auto Enhance Overlay Icon */}
          {onAutoEnhance && !photo.isVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.success();
                onAutoEnhance(photo);
              }}
              className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer transition-all shrink-0 group"
              title="Auto Enhance Image"
            >
              <Sparkles className="w-4 h-4 text-amber-400 transition-transform group-active:rotate-45" />
            </button>
          )}

          {/* OCR Extracted Text Overlay Icon */}
          {photo.ocrText && setShowOCRModal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.selection();
                setShowOCRModal(true);
              }}
              className="p-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 cursor-pointer transition-all shrink-0"
              title="View Extracted Text"
            >
              <FileText className="w-4 h-4 text-purple-400" />
            </button>
          )}

          {/* Info / Metadata Overlay Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              haptics.selection();
              setShowInfoPanel((prev) => !prev);
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
              showInfoPanel
                ? "bg-indigo-600 text-white border-indigo-400"
                : "bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
            title="EXIF & Media Info"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Unhide from Vault */}
          {photo.isHidden && onUnhidePhoto && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.success();
                onUnhidePhoto(photo.id);
              }}
              className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer transition-all shrink-0"
              title="Unhide from Personal Diaries"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
            </button>
          )}

          {/* Delete Overlay Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              haptics.warning();
              onDeletePhoto(photo.id);
            }}
            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 cursor-pointer transition-all shrink-0 group"
            title="Delete Item"
          >
            <Trash2 className="w-4 h-4 text-rose-400 transition-transform group-active:scale-110" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

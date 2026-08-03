import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Share2,
  Heart,
  Pencil,
  FileText,
  Info,
  Trash2,
  Eye,
} from "lucide-react";
import { Photo } from "../types";

export interface MediaActionBarProps {
  photo: Photo;
  isVisible: boolean;
  onShare: () => void;
  onToggleFavorite: (photoId: string) => void;
  onOpenEditor?: (photo: Photo) => void;
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
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 border border-slate-800/90 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl flex items-center gap-2 max-w-[92vw]"
        >
          {/* Share */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-all cursor-pointer shrink-0"
            title="Share"
          >
            <Share2 className="w-5 h-5 text-sky-400" />
          </button>

          {/* Favorite */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(photo.id);
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
              photo.isFavorite
                ? "bg-pink-500/20 text-pink-400 border-pink-500/40"
                : "bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white"
            }`}
            title={photo.isFavorite ? "Remove Favorite" : "Favorite Item"}
          >
            <Heart className={`w-5 h-5 ${photo.isFavorite ? "fill-pink-500 text-pink-500" : ""}`} />
          </button>

          {/* Edit (Photo / Video) */}
          {onOpenEditor && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenEditor(photo);
              }}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md shadow-indigo-600/30 shrink-0"
              title={photo.isVideo ? "Edit Video" : "Edit Photo"}
            >
              <Pencil className="w-5 h-5 text-white" />
            </button>
          )}

          {/* OCR Text Extractor */}
          {photo.ocrText && setShowOCRModal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOCRModal(true);
              }}
              className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-pointer shrink-0"
              title="Recognized Text"
            >
              <FileText className="w-5 h-5 text-amber-400" />
            </button>
          )}

          {/* EXIF Info Panel Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfoPanel((prev) => !prev);
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
              showInfoPanel
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                : "bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white"
            }`}
            title="EXIF & Info"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Unhide from Private Vault if hidden */}
          {photo.isHidden && onUnhidePhoto && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnhidePhoto(photo.id);
              }}
              className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer shrink-0"
              title="Unhide to Gallery"
            >
              <Eye className="w-5 h-5" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeletePhoto(photo.id);
            }}
            className="p-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 cursor-pointer shrink-0"
            title="Delete Item"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

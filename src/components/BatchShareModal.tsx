import React, { useState } from "react";
import {
  Share2,
  Copy,
  Download,
  Check,
  X,
  FileText,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Photo } from "../types";
import { haptics } from "../utils/haptics";

interface BatchShareModalProps {
  isOpen: boolean;
  selectedPhotos: Photo[];
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const BatchShareModal: React.FC<BatchShareModalProps> = ({
  isOpen,
  selectedPhotos,
  onClose,
  onShowToast,
}) => {
  const [copiedLinks, setCopiedLinks] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || selectedPhotos.length === 0) return null;

  const count = selectedPhotos.length;

  const handleNativeShare = async () => {
    haptics.selection();
    const primaryUrl = selectedPhotos[0]?.highResUrl || selectedPhotos[0]?.url;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${count} Items Selected - GalleyAR`,
          text: `Sharing ${count} media items from GalleyAR:\n` + selectedPhotos.map(p => p.title).join(", "),
          url: primaryUrl,
        });
        onShowToast(`Shared ${count} item${count > 1 ? "s" : ""}`);
        onClose();
      } catch (err) {
        // Share cancelled or unavailable
      }
    } else {
      handleCopyLinks();
    }
  };

  const handleCopyLinks = () => {
    haptics.success();
    const urls = selectedPhotos
      .map((p) => p.highResUrl || p.url)
      .join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(urls).catch(() => {});
    }
    setCopiedLinks(true);
    onShowToast(`Copied ${count} media link${count > 1 ? "s" : ""} to clipboard!`);
    setTimeout(() => setCopiedLinks(false), 2500);
  };

  const handleCopySummary = () => {
    haptics.success();
    const summary = selectedPhotos
      .map(
        (p, idx) =>
          `${idx + 1}. ${p.title} (${p.date ? p.date.split("T")[0] : "Media"}) - ${p.highResUrl || p.url}`
      )
      .join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary).catch(() => {});
    }
    setCopiedText(true);
    onShowToast(`Copied summary for ${count} item${count > 1 ? "s" : ""}!`);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleDownloadAll = async () => {
    haptics.selection();
    setIsDownloading(true);
    onShowToast(`Starting download for ${count} item${count > 1 ? "s" : ""}...`);

    for (let i = 0; i < selectedPhotos.length; i++) {
      const photo = selectedPhotos[i];
      const mediaUrl = photo.highResUrl || photo.url;
      try {
        const response = await fetch(mediaUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        const ext = photo.isVideo ? "mp4" : "jpg";
        link.download = `${(photo.title || "download").replace(/[^a-z0-9]/gi, "_")}_${i + 1}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch {
        window.open(mediaUrl, "_blank");
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsDownloading(false);
    onShowToast(`Downloaded ${count} item${count > 1 ? "s" : ""} successfully!`);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-5 shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Share2 className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Share {count} Item{count > 1 ? "s" : ""}
              </h3>
              <p className="text-xs text-sky-300 font-medium">
                Choose share method
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Items Thumbnails Preview */}
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Selected Items Preview
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {selectedPhotos.slice(0, 6).map((photo) => (
              <div
                key={photo.id}
                className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 relative"
              >
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {count > 6 && (
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                +{count - 6}
              </div>
            )}
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="space-y-2.5">
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full p-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-between border border-sky-400/40 shadow-lg cursor-pointer transition-all active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-white" />
                <span>Share via System Share Sheet</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-sky-200" />
            </button>
          )}

          <button
            onClick={handleCopyLinks}
            className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-slate-200 text-xs font-bold flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              <span>Copy All Media Links</span>
            </div>
            {copiedLinks ? (
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied!</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">URLs</span>
            )}
          </button>

          <button
            onClick={handleCopySummary}
            className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-200 text-xs font-bold flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>Copy Formatted Summary Text</span>
            </div>
            {copiedText ? (
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied!</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">Summary</span>
            )}
          </button>

          <button
            onClick={handleDownloadAll}
            disabled={isDownloading}
            className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-200 text-xs font-bold flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 group"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Download All Selected Media</span>
            </div>
            {isDownloading ? (
              <span className="animate-spin text-xs">🌀</span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">ZIP/Files</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Share2,
  Copy,
  Download,
  Check,
  X,
  FileText,
  ExternalLink,
  QrCode,
  Code,
  Image as ImageIcon,
  Mail,
  Send,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Video,
} from "lucide-react";
import { Photo } from "../types";
import { haptics } from "../utils/haptics";
import {
  copyTextToClipboard,
  copyImageBinaryToClipboard,
  downloadMediaItem,
  downloadBatchMedia,
  triggerNativeShare,
  getWhatsAppShareUrl,
  getTelegramShareUrl,
  getTwitterShareUrl,
  getFacebookShareUrl,
  getEmailShareUrl,
  getPinterestShareUrl,
} from "../utils/shareUtils";

export interface UnifiedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Either a single photo OR an array of photos
  photo?: Photo | null;
  photos?: Photo[];
  title?: string;
  onShowToast?: (message: string) => void;
}

export const UnifiedShareModal: React.FC<UnifiedShareModalProps> = ({
  isOpen,
  onClose,
  photo,
  photos = [],
  title,
  onShowToast,
}) => {
  // Normalize items array
  const items: Photo[] = photo ? [photo] : photos;
  const isMultiple = items.length > 1;
  const singleItem = items[0];

  const [activeTab, setActiveTab] = useState<"quick" | "social" | "qr" | "embed">("quick");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);

  if (!isOpen || items.length === 0) return null;

  const primaryUrl = singleItem ? (singleItem.highResUrl || singleItem.url) : "";
  const shareTitle = title || (isMultiple ? `${items.length} Items from GalleyAR` : singleItem?.title || "GalleyAR Photo");
  const shareText = isMultiple
    ? `Sharing ${items.length} photos and videos from GalleyAR:\n` + items.slice(0, 5).map((p) => `• ${p.title}`).join("\n") + (items.length > 5 ? `\n...and ${items.length - 5} more` : "")
    : `Check out "${singleItem?.title || "Photo"}" on GalleyAR`;

  const triggerToast = (msg: string) => {
    onShowToast?.(msg);
  };

  // 1. Native System Share
  const handleSystemShare = async () => {
    haptics.selection();
    try {
      const success = await triggerNativeShare(shareTitle, shareText, primaryUrl, isMultiple ? undefined : singleItem);
      if (success) {
        triggerToast("Shared successfully!");
        onClose();
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // Fallback to copying link
        handleCopyDirectLink();
      }
    }
  };

  // 2. Copy Link
  const handleCopyDirectLink = async () => {
    haptics.success();
    const textToCopy = isMultiple
      ? items.map((p) => p.highResUrl || p.url).join("\n")
      : primaryUrl;
    
    const success = await copyTextToClipboard(textToCopy);
    if (success) {
      setCopiedLink(true);
      triggerToast(isMultiple ? `Copied ${items.length} links to clipboard!` : "Link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // 3. Copy Image Binary Data (Single item)
  const handleCopyImageBinary = async () => {
    if (!singleItem || singleItem.isVideo) return;
    haptics.selection();
    triggerToast("Copying image data...");
    const success = await copyImageBinaryToClipboard(primaryUrl);
    if (success) {
      haptics.success();
      setCopiedImage(true);
      triggerToast("Image copied! Paste anywhere (Ctrl+V / Cmd+V)");
      setTimeout(() => setCopiedImage(false), 3000);
    } else {
      // Fallback to copying URL
      handleCopyDirectLink();
    }
  };

  // 4. Download media
  const handleDownload = async () => {
    haptics.selection();
    setIsDownloading(true);
    if (isMultiple) {
      setDownloadProgress({ done: 0, total: items.length });
      triggerToast(`Starting download for ${items.length} items...`);
      await downloadBatchMedia(items, (done, total) => {
        setDownloadProgress({ done, total });
      });
      setIsDownloading(false);
      setDownloadProgress(null);
      triggerToast(`Downloaded ${items.length} items successfully!`);
    } else if (singleItem) {
      triggerToast(`Downloading "${singleItem.title}"...`);
      await downloadMediaItem(primaryUrl, singleItem.title, singleItem.isVideo);
      setIsDownloading(false);
      triggerToast("Download complete!");
    }
  };

  // 5. Copy Formatted Summary
  const handleCopySummary = async () => {
    haptics.success();
    const summary = isMultiple
      ? items
          .map((p, idx) => `${idx + 1}. ${p.title} (${p.date ? p.date.split("T")[0] : "Media"}) - ${p.highResUrl || p.url}`)
          .join("\n")
      : `${singleItem?.title || "Media"}\nDate: ${singleItem?.date ? singleItem.date.split("T")[0] : "Recent"}\nURL: ${primaryUrl}`;

    const success = await copyTextToClipboard(summary);
    if (success) {
      setCopiedSummary(true);
      triggerToast("Summary copied to clipboard!");
      setTimeout(() => setCopiedSummary(false), 2500);
    }
  };

  // 6. Copy HTML / Markdown Embed
  const handleCopyEmbed = async (type: "markdown" | "html") => {
    haptics.success();
    const code = type === "markdown"
      ? `![${singleItem?.title || "GalleyAR Media"}](${primaryUrl})`
      : `<img src="${primaryUrl}" alt="${singleItem?.title || "GalleyAR Media"}" style="max-width:100%;border-radius:12px;" />`;

    const success = await copyTextToClipboard(code);
    if (success) {
      setCopiedEmbed(true);
      triggerToast(`Copied ${type === "markdown" ? "Markdown" : "HTML"} embed code!`);
      setTimeout(() => setCopiedEmbed(false), 2500);
    }
  };

  // Social sharing handlers
  const openSocialWindow = (url: string) => {
    haptics.selection();
    window.open(url, "_blank", "noopener,noreferrer,width=640,height=560");
  };

  // QR Code URL using reliable quick QR service with fallback
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(primaryUrl)}&margin=10&color=0f172a&bgcolor=f8fafc`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in font-sans select-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl overflow-hidden relative text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <Share2 className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{isMultiple ? `Share ${items.length} Items` : singleItem?.title || "Share Media"}</span>
                  {singleItem?.isVideo && (
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>Video</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {isMultiple ? "Choose your preferred sharing or export method" : "Instant direct sharing, social links, and media copy"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Share Sheet"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Media Preview Ribbon / Card */}
          {isMultiple ? (
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Selected Items ({items.length})</span>
                <span className="text-sky-400 lowercase font-normal">{items.filter(p => p.isVideo).length > 0 ? `${items.filter(p => p.isVideo).length} videos` : ""}</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {items.slice(0, 7).map((p) => (
                  <div
                    key={p.id}
                    className="w-13 h-13 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 relative"
                  >
                    <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                    {p.isVideo && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Video className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {items.length > 7 && (
                  <div className="w-13 h-13 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                    +{items.length - 7}
                  </div>
                )}
              </div>
            </div>
          ) : singleItem ? (
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 relative">
                <img src={singleItem.url} alt={singleItem.title} className="w-full h-full object-cover" />
                {singleItem.isVideo && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Video className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="text-xs font-bold text-slate-200 truncate">{singleItem.title}</h4>
                <p className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{singleItem.date ? singleItem.date.split("T")[0] : "Recent"}</span>
                  {singleItem.category && <span>• {singleItem.category}</span>}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                  <span>{singleItem.isVideo ? "MP4 Video" : "High-Res Photo"}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Navigation Category Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs font-bold">
            <button
              onClick={() => setActiveTab("quick")}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "quick" ? "bg-sky-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Quick</span>
            </button>
            <button
              onClick={() => setActiveTab("social")}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "social" ? "bg-sky-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Social</span>
            </button>
            <button
              onClick={() => setActiveTab("qr")}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "qr" ? "bg-sky-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>
            <button
              onClick={() => setActiveTab("embed")}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "embed" ? "bg-sky-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          {/* Tab 1: Quick Actions */}
          {activeTab === "quick" && (
            <div className="space-y-2.5 animate-fade-in">
              {/* Native System Share Sheet (Primary prominent button) */}
              <button
                onClick={handleSystemShare}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-between border border-sky-400/30 shadow-lg cursor-pointer transition-all active:scale-98 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-white/10 text-white group-hover:scale-110 transition-transform">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight">Share via System Share Sheet</span>
                    <span className="text-[10px] text-sky-100 font-normal">Native apps, AirDrop, Messages, Nearby Share</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-sky-200" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Copy Direct Link */}
                <button
                  onClick={handleCopyDirectLink}
                  className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/50 text-slate-200 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Copy className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span>{isMultiple ? "Copy All Links" : "Copy Media Link"}</span>
                  </div>
                  {copiedLink ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">URL</span>
                  )}
                </button>

                {/* Copy Image Binary (Single Photo only) */}
                {!isMultiple && singleItem && !singleItem.isVideo && (
                  <button
                    onClick={handleCopyImageBinary}
                    className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-pink-500/50 text-slate-200 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                      <span>Copy Image to Paste</span>
                    </div>
                    {copiedImage ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
                    )}
                  </button>
                )}

                {/* Download / Save */}
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 text-slate-200 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>{isMultiple ? "Download All Media" : "Download Original"}</span>
                  </div>
                  {isDownloading ? (
                    <span className="text-[10px] text-emerald-400 font-mono animate-pulse">
                      {downloadProgress ? `${downloadProgress.done}/${downloadProgress.total}` : "Saving..."}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">File</span>
                  )}
                </button>

                {/* Copy Formatted Summary */}
                <button
                  onClick={handleCopySummary}
                  className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 text-slate-200 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span>Formatted Summary</span>
                  </div>
                  {copiedSummary ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">Text</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Social & Messaging Channels */}
          {activeTab === "social" && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-[11px] text-slate-400 font-medium">
                Directly share to your favorite chat apps and social networks:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* WhatsApp */}
                <button
                  onClick={() => openSocialWindow(getWhatsAppShareUrl(shareText, primaryUrl))}
                  className="p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span>WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  onClick={() => openSocialWindow(getTelegramShareUrl(shareText, primaryUrl))}
                  className="p-3 rounded-2xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 text-sky-300 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400">
                    <Send className="w-4 h-4" />
                  </div>
                  <span>Telegram</span>
                </button>

                {/* Twitter / X */}
                <button
                  onClick={() => openSocialWindow(getTwitterShareUrl(shareText, primaryUrl))}
                  className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                    <span className="font-mono text-sm font-black">𝕏</span>
                  </div>
                  <span>Twitter / X</span>
                </button>

                {/* Email */}
                <button
                  onClick={() => {
                    haptics.selection();
                    window.location.href = getEmailShareUrl(shareTitle, shareText, primaryUrl);
                  }}
                  className="p-3 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span>Email</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={() => openSocialWindow(getFacebookShareUrl(primaryUrl))}
                  className="p-3 rounded-2xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/60 text-blue-300 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <span className="font-black text-sm">f</span>
                  </div>
                  <span>Facebook</span>
                </button>

                {/* Pinterest */}
                {!isMultiple && (
                  <button
                    onClick={() => openSocialWindow(getPinterestShareUrl(primaryUrl, primaryUrl, shareTitle))}
                    className="p-3 rounded-2xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                      <span className="font-black text-sm">P</span>
                    </div>
                    <span>Pinterest</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Mobile Transfer QR Code */}
          {activeTab === "qr" && (
            <div className="space-y-4 text-center animate-fade-in">
              <p className="text-[11px] text-slate-400 font-medium">
                Scan with your smartphone camera to open and save this media directly on your mobile device:
              </p>

              <div className="flex justify-center p-3 bg-white rounded-2xl w-fit mx-auto shadow-2xl border-4 border-slate-800">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-44 h-44 object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback visual if external QR endpoint is offline
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[280px]">{primaryUrl}</span>
              </div>
            </div>
          )}

          {/* Tab 4: Embed & Export Code */}
          {activeTab === "embed" && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-[11px] text-slate-400 font-medium">
                Copy code snippets for embedding in Markdown documents, websites, or blogs:
              </p>

              <div className="space-y-2">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Markdown Format</span>
                    <button
                      onClick={() => handleCopyEmbed("markdown")}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="text-[11px] text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                    {`![${singleItem?.title || "GalleyAR Media"}](${primaryUrl})`}
                  </pre>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">HTML Embed Format</span>
                    <button
                      onClick={() => handleCopyEmbed("html")}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="text-[11px] text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                    {`<img src="${primaryUrl}" alt="${singleItem?.title || "Media"}" style="max-width:100%;border-radius:12px;" />`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

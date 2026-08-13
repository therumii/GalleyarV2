import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Play,
  Pause,
  RotateCw,
  Volume2,
  VolumeX,
  Sliders,
  Scissors,
  Palette,
  RotateCcw,
  Check,
  Film,
  Sparkles,
  Loader2,
  Copy,
  Save,
  Type,
  Trash2,
  Plus,
  AlertCircle,
  Pencil,
  ChevronLeft,
} from "lucide-react";
import { Photo, VideoEditState, TextOverlay, StickerOverlay } from "../types";
import { haptics } from "../utils/haptics";
import { getEditedMediaTitle } from "../utils/mediaTitle";
import { EditingToolDock, EditorTool } from "./EditingToolDock";

interface VideoEditorModalProps {
  photo: Photo;
  onSave: (updatedPhoto: Photo, isCopy?: boolean) => void;
  onClose: () => void;
}

export interface VideoEditorRef {
  handleBack: () => boolean;
}

const DEFAULT_FALLBACK_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export const VideoEditorModal = forwardRef<VideoEditorRef, VideoEditorModalProps>(({
  photo,
  onSave,
  onClose,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Video source
  const videoSrc = photo.videoUrl || photo.highResUrl || DEFAULT_FALLBACK_VIDEO;

  // Active Editor Dock Tool state
  const [activeTool, setActiveTool] = useState<EditorTool>("none");
  const [selectedAdjustment, setSelectedAdjustment] = useState<"brightness" | "contrast" | "saturation" | "warmth" | "speed" | "volume">("brightness");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Sticker Overlays State
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);

  // Video metadata
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Text Overlays State
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>(
    photo.videoEditState?.textOverlays || []
  );
  const [activeTextId, setActiveTextId] = useState<string | null>(null);

  // Text Overlay Drag Ref
  const textDragRef = useRef<{
    isDragging: boolean;
    overlayId: string | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    isDragging: false,
    overlayId: null,
    startX: 0,
    startY: 0,
    initialX: 0.5,
    initialY: 0.5,
  });

  // Trim state (in seconds)
  const [trimStart, setTrimStart] = useState<number>(photo.videoEditState?.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState<number>(photo.videoEditState?.trimEnd || 0);
  const [draggingHandle, setDraggingHandle] = useState<"start" | "end" | "scrub" | null>(null);

  const trimStartRef = useRef(trimStart);
  trimStartRef.current = trimStart;

  const trimEndRef = useRef(trimEnd);
  trimEndRef.current = trimEnd;

  const durationRef = useRef(duration);
  durationRef.current = duration;

  const activeTrimDragRef = useRef<"start" | "end" | "scrub" | null>(null);

  // Adjustment state
  const [brightness, setBrightness] = useState<number>(photo.videoEditState?.brightness || 0);
  const [contrast, setContrast] = useState<number>(photo.videoEditState?.contrast || 0);
  const [saturation, setSaturation] = useState<number>(photo.videoEditState?.saturation || 0);
  const [warmth, setWarmth] = useState<number>(photo.videoEditState?.warmth || 0);
  const [filter, setFilter] = useState<string>(photo.videoEditState?.filter || "none");

  // Transform & Audio
  const [rotation, setRotation] = useState<number>(photo.videoEditState?.rotation || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(photo.videoEditState?.playbackRate || 1);
  const [isMuted, setIsMuted] = useState<boolean>(photo.videoEditState?.isMuted || false);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [showSaveOptions, setShowSaveOptions] = useState<boolean>(false);
  const [showDiscardConfirmModal, setShowDiscardConfirmModal] = useState<boolean>(false);

  // Compute unsaved edits status
  const isDirty =
    trimStart !== (photo.videoEditState?.trimStart || 0) ||
    (duration > 0 && trimEnd !== (photo.videoEditState?.trimEnd || duration)) ||
    brightness !== (photo.videoEditState?.brightness || 0) ||
    contrast !== (photo.videoEditState?.contrast || 0) ||
    saturation !== (photo.videoEditState?.saturation || 0) ||
    warmth !== (photo.videoEditState?.warmth || 0) ||
    filter !== (photo.videoEditState?.filter || "none") ||
    rotation !== (photo.videoEditState?.rotation || 0) ||
    playbackRate !== (photo.videoEditState?.playbackRate || 1) ||
    isMuted !== (photo.videoEditState?.isMuted || false) ||
    textOverlays.length !== (photo.videoEditState?.textOverlays?.length || 0);

  const handleAttemptClose = () => {
    if (showDiscardConfirmModal) {
      setShowDiscardConfirmModal(false);
      return;
    }
    if (showSaveOptions) {
      setShowSaveOptions(false);
    }
    setShowDiscardConfirmModal(true);
  };

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (showDiscardConfirmModal) {
        setShowDiscardConfirmModal(false);
        return true;
      }
      if (showSaveOptions) {
        setShowSaveOptions(false);
        return true;
      }
      setShowDiscardConfirmModal(true);
      return true;
    },
  }));

  // Filter presets list
  const filterPresets = [
    { id: "none", label: "Original" },
    { id: "vivid", label: "Vivid" },
    { id: "amber", label: "Warm Amber" },
    { id: "mono", label: "B&W Mono" },
    { id: "dramatic", label: "Dramatic" },
    { id: "cyberpunk", label: "Cyberpunk" },
    { id: "vintage", label: "Vintage" },
    { id: "noir", label: "Film Noir" },
    { id: "cold", label: "Cold Winter" },
    { id: "emerald", label: "Emerald" },
  ];

  const applyPresetFilter = (filterId: string) => {
    setFilter(filterId);
    if (filterId === "vivid") {
      setBrightness(10);
      setContrast(20);
      setSaturation(30);
      setWarmth(5);
    } else if (filterId === "amber") {
      setWarmth(30);
      setBrightness(5);
      setContrast(10);
      setSaturation(10);
    } else if (filterId === "mono") {
      setSaturation(-100);
      setContrast(20);
      setBrightness(0);
      setWarmth(0);
    } else if (filterId === "dramatic") {
      setContrast(40);
      setBrightness(-10);
      setSaturation(15);
      setWarmth(-5);
    } else if (filterId === "cyberpunk") {
      setSaturation(40);
      setWarmth(-35);
      setContrast(25);
      setBrightness(5);
    } else if (filterId === "vintage") {
      setWarmth(20);
      setContrast(-10);
      setSaturation(-15);
    } else if (filterId === "noir") {
      setSaturation(-100);
      setContrast(50);
      setBrightness(-15);
      setWarmth(0);
    } else if (filterId === "cold") {
      setWarmth(-40);
      setBrightness(10);
      setSaturation(10);
      setContrast(15);
    } else {
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setWarmth(0);
    }
  };

  // Compute CSS filter string for live video element
  const getCssFilter = () => {
    let css = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;
    if (warmth > 0) css += ` sepia(${warmth * 0.4}%)`;
    if (warmth < 0) css += ` hue-rotate(${warmth}deg)`;
    return css;
  };

  // Video initialization
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (dur && isFinite(dur) && dur > 0) {
      setDuration(dur);
      const initialStart = photo.videoEditState?.trimStart || 0;
      const initialEnd =
        photo.videoEditState?.trimEnd &&
        photo.videoEditState.trimEnd <= dur &&
        photo.videoEditState.trimEnd > initialStart
          ? photo.videoEditState.trimEnd
          : dur;
      setTrimStart(initialStart);
      setTrimEnd(initialEnd);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const checkAndInit = () => {
      if (video.readyState >= 1) {
        const dur = video.duration;
        if (dur && isFinite(dur) && dur > 0) {
          setDuration(dur);
          setTrimEnd((prev) => (prev > 0 && prev <= dur ? prev : dur));
        }
        setIsLoading(false);
      }
    };

    checkAndInit();
    video.addEventListener("loadedmetadata", checkAndInit);
    video.addEventListener("loadeddata", checkAndInit);
    video.addEventListener("canplay", checkAndInit);

    return () => {
      video.removeEventListener("loadedmetadata", checkAndInit);
      video.removeEventListener("loadeddata", checkAndInit);
      video.removeEventListener("canplay", checkAndInit);
    };
  }, [videoSrc]);

  // Enforce loop within trim boundaries during video playback
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    if (curr >= trimEnd || curr < trimStart) {
      videoRef.current.currentTime = trimStart;
      if (!isPlaying) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (videoRef.current.currentTime >= trimEnd || videoRef.current.currentTime < trimStart) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Pointer Dragging Timeline Handlers
  const handleTrimPointerDown = (
    e: React.PointerEvent,
    handle: "start" | "end" | "scrub"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    activeTrimDragRef.current = handle;
    setDraggingHandle(handle);
  };

  const handleTrimPointerMove = (e: React.PointerEvent) => {
    if (!activeTrimDragRef.current || !timelineRef.current || durationRef.current <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const targetTime = (clickX / rect.width) * durationRef.current;
    const targetHandle = activeTrimDragRef.current;

    if (targetHandle === "start") {
      const newStart = Math.min(targetTime, trimEndRef.current - 0.5);
      const clampedStart = Math.max(0, newStart);
      setTrimStart(clampedStart);
      if (videoRef.current) {
        videoRef.current.currentTime = clampedStart;
      }
    } else if (targetHandle === "end") {
      const newEnd = Math.max(targetTime, trimStartRef.current + 0.5);
      const clampedEnd = Math.min(durationRef.current, newEnd);
      setTrimEnd(clampedEnd);
      if (videoRef.current) {
        videoRef.current.currentTime = clampedEnd;
      }
    } else if (targetHandle === "scrub") {
      const clampedTime = Math.max(trimStartRef.current, Math.min(trimEndRef.current, targetTime));
      if (videoRef.current) {
        videoRef.current.currentTime = clampedTime;
      }
      setCurrentTime(clampedTime);
    }
  };

  const handleTrimPointerUp = (e: React.PointerEvent) => {
    if (activeTrimDragRef.current) {
      activeTrimDragRef.current = null;
      setDraggingHandle(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Text Overlay Drag Handlers
  const handleTextPointerDown = (
    e: React.PointerEvent,
    overlay: TextOverlay
  ) => {
    e.stopPropagation();
    setActiveTextId(overlay.id);
    if (activeTool !== "text") setActiveTool("text");

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    textDragRef.current = {
      isDragging: true,
      overlayId: overlay.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: overlay.xNormalized,
      initialY: overlay.yNormalized,
    };
  };

  const handleTextPointerMove = (e: React.PointerEvent, overlayId: string) => {
    if (
      !textDragRef.current.isDragging ||
      textDragRef.current.overlayId !== overlayId ||
      !videoRef.current
    )
      return;

    const rect = videoRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - textDragRef.current.startX) / rect.width;
    const dy = (e.clientY - textDragRef.current.startY) / rect.height;

    const newX = Math.max(0.05, Math.min(0.95, textDragRef.current.initialX + dx));
    const newY = Math.max(0.05, Math.min(0.95, textDragRef.current.initialY + dy));

    setTextOverlays((prev) =>
      prev.map((item) =>
        item.id === overlayId
          ? { ...item, xNormalized: newX, yNormalized: newY }
          : item
      )
    );
  };

  const handleTextPointerUp = (e: React.PointerEvent) => {
    if (textDragRef.current.isDragging) {
      textDragRef.current.isDragging = false;
      textDragRef.current.overlayId = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Reset all video edits
  const handleReset = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
    setFilter("none");
    setRotation(0);
    setPlaybackRate(1);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = 1;
      videoRef.current.muted = false;
      videoRef.current.currentTime = 0;
    }
  };

  // Format time (0:00 or 00:00.0)
  const formatTime = (secs: number, showDecimals = false) => {
    if (isNaN(secs) || secs < 0 || !isFinite(secs)) return "00:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    if (showDecimals) {
      const tenths = Math.floor((secs % 1) * 10);
      return `${mins.toString().padStart(2, "0")}:${remainingSecs
        .toString()
        .padStart(2, "0")}.${tenths}`;
    }
    return `${mins.toString().padStart(2, "0")}:${remainingSecs
      .toString()
      .padStart(2, "0")}`;
  };

  // Save / Export Execution
  const handleExecuteSave = async (isCopy = false) => {
    setIsExporting(true);
    setExportProgress(10);

    const video = videoRef.current;
    const trimmedLengthSecs = Math.max(0.5, trimEnd - trimStart);
    const newFormattedDuration = formatTime(trimmedLengthSecs);

    const newVideoEditState: VideoEditState = {
      trimStart,
      trimEnd,
      playbackRate,
      brightness,
      contrast,
      saturation,
      warmth,
      filter,
      rotation,
      isMuted,
      textOverlays,
    };

    // Attempt client-side canvas recording if video is available
    if (video && typeof MediaRecorder !== "undefined") {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          const stream = canvas.captureStream(30);
          let mimeType = "video/webm;codecs=vp9";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "video/webm";
          }
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 5000000,
          });
          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          const recordPromise = new Promise<string>((resolve, reject) => {
            mediaRecorder.onstop = () => {
              const blob = new Blob(chunks, { type: "video/webm" });
              const exportedUrl = URL.createObjectURL(blob);
              resolve(exportedUrl);
            };
            mediaRecorder.onerror = (err) => reject(err);
          });

          mediaRecorder.start();

          const renderStart = trimStart;
          const renderEnd = trimEnd > 0 ? trimEnd : duration || video.duration;
          const totalTime = Math.max(0.5, renderEnd - renderStart);

          video.pause();
          video.currentTime = renderStart;
          await new Promise((res) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              res(true);
            };
            video.addEventListener("seeked", onSeeked);
            setTimeout(res, 200);
          });

          mediaRecorder.start(100);
          video.playbackRate = playbackRate;
          video.muted = isMuted;
          await video.play().catch(() => {});

          let animId: number;
          const drawLoop = () => {
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.filter = getCssFilter();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(video, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
            ctx.restore();

            const curr = video.currentTime;
            textOverlays.forEach((overlay) => {
              if (curr >= overlay.startTime && curr <= overlay.endTime) {
                ctx.save();
                const xPx = overlay.xNormalized * canvas.width;
                const yPx = overlay.yNormalized * canvas.height;
                ctx.translate(xPx, yPx);
                ctx.rotate((overlay.rotation * Math.PI) / 180);

                const baseFontSize = (canvas.width * 0.05) * overlay.scale;
                let fontStr = `${baseFontSize}px sans-serif`;
                if (overlay.fontFamily === "serif") fontStr = `${baseFontSize}px Georgia, serif`;
                else if (overlay.fontFamily === "mono") fontStr = `${baseFontSize}px monospace`;
                else if (overlay.fontFamily === "display") fontStr = `bold ${baseFontSize * 1.15}px system-ui, sans-serif`;
                else if (overlay.fontFamily === "script") fontStr = `italic ${baseFontSize}px Georgia, serif`;

                ctx.font = fontStr;
                ctx.textAlign = overlay.alignment || "center";
                ctx.textBaseline = "middle";
                ctx.globalAlpha = overlay.opacity ?? 1;

                if (overlay.style === "background") {
                  const metrics = ctx.measureText(overlay.text);
                  const pad = baseFontSize * 0.4;
                  ctx.fillStyle = overlay.bgColor || "rgba(0,0,0,0.75)";
                  ctx.fillRect(-metrics.width / 2 - pad, -baseFontSize / 2 - pad / 2, metrics.width + pad * 2, baseFontSize + pad);
                } else if (overlay.style === "shadow") {
                  ctx.shadowColor = "rgba(0,0,0,0.85)";
                  ctx.shadowBlur = baseFontSize * 0.25;
                  ctx.shadowOffsetX = baseFontSize * 0.08;
                  ctx.shadowOffsetY = baseFontSize * 0.08;
                } else if (overlay.style === "outline") {
                  ctx.strokeStyle = "#000000";
                  ctx.lineWidth = baseFontSize * 0.12;
                  ctx.strokeText(overlay.text, 0, 0);
                }

                ctx.fillStyle = overlay.color || "#ffffff";
                ctx.fillText(overlay.text, 0, 0);
                ctx.restore();
              }
            });

            const pct = Math.min(99, Math.round(((curr - renderStart) / totalTime) * 100));
            setExportProgress(pct);

            if (video.currentTime < renderEnd && !video.paused && !video.ended) {
              animId = requestAnimationFrame(drawLoop);
            }
          };

          drawLoop();

          await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (video.currentTime >= renderEnd || video.paused || video.ended) {
                clearInterval(checkInterval);
                video.pause();
                cancelAnimationFrame(animId);
                resolve(true);
              }
            }, 50);
          });

          mediaRecorder.stop();
          const finalVideoUrl = await recordPromise;
          setExportProgress(100);

          const updatedTitle = getEditedMediaTitle(photo.title);

          const finalPhotoObj: Photo = {
            ...photo,
            id: isCopy ? `photo-v-${Date.now()}` : photo.id,
            title: updatedTitle,
            duration: newFormattedDuration,
            videoUrl: finalVideoUrl,
            highResUrl: finalVideoUrl,
            videoEditState: newVideoEditState,
            date: photo.date, // Preserve original date taken
          };

          haptics.success();
          setIsExporting(false);
          setSaveNotice(isCopy ? "Saved as new video copy!" : "Saved video changes!");
          setTimeout(() => setSaveNotice(null), 3000);
          onSave(finalPhotoObj, isCopy);
          return;
        }
      } catch (err) {
        console.warn("Video export falling back to edit state preservation:", err);
      }
    }

    // Fallback simulation if canvas capture stream is restricted
    for (let p = 20; p <= 90; p += 25) {
      setExportProgress(p);
      await new Promise((res) => setTimeout(res, 100));
    }

    setExportProgress(100);

    const updatedTitle = getEditedMediaTitle(photo.title);

    const finalPhotoObj: Photo = {
      ...photo,
      id: isCopy ? `photo-v-${Date.now()}` : photo.id,
      title: updatedTitle,
      duration: newFormattedDuration,
      videoEditState: newVideoEditState,
      date: photo.date, // Preserve original date taken
    };

    haptics.success();
    setIsExporting(false);
    setSaveNotice(isCopy ? "Saved as new video copy!" : "Saved video changes!");
    setTimeout(() => setSaveNotice(null), 3000);
    onSave(finalPhotoObj, isCopy);
  };

  // Calculate normalized trim percentages for visual timeline bar
  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const currentPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[105] bg-slate-950 flex flex-col justify-between overflow-hidden select-none animate-fade-in text-slate-100">
      {/* Top Bar Header */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={handleAttemptClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              <span>Video Editor</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit / Pencil Button to open Editing Tool Dock */}
          <button
            onClick={() => {
              haptics.selection();
              if (activeTool === "none") {
                setActiveTool("adjust");
              } else {
                setActiveTool("none");
              }
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
              activeTool !== "none"
                ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60"
            }`}
            title="Toggle Editing Tools"
            aria-label="Toggle Editing Tools"
          >
            <Pencil className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all border border-slate-700/60"
            title="Reset All Edits"
            aria-label="Reset All Edits"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>

          {/* Save Action Popover Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSaveOptions(!showSaveOptions)}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md shadow-indigo-600/30 border border-indigo-400/40 transition-all"
              title="Save Video Options"
              aria-label="Save Video Options"
            >
              <Save className="w-4 h-4" />
            </button>

            {showSaveOptions && (
              <div className="absolute right-0 top-11 w-48 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 space-y-1 animate-fade-in">
                <button
                  onClick={() => {
                    setShowSaveOptions(false);
                    handleExecuteSave(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save Overwrite</span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowSaveOptions(false);
                    handleExecuteSave(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-semibold text-indigo-300 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Save as Copy</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Video Stage with Rotation & Live CSS Filters */}
      <div className="relative flex-1 w-full h-full bg-black flex items-center justify-center p-4 overflow-hidden">
        {saveNotice && (
          <div className="absolute top-4 sm:top-6 z-40 px-4 py-2.5 rounded-full bg-slate-900/95 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveNotice}</span>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
        )}

        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-300"
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            poster={photo.url}
            playsInline
            muted={isMuted}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={() => setIsLoading(false)}
            onLoadedData={() => setIsLoading(false)}
            onSeeked={() => setIsLoading(false)}
            onPlaying={() => {
              setIsLoading(false);
              setIsPlaying(true);
            }}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              setIsPlaying(false);
            }}
            style={{
              filter: getCssFilter(),
            }}
            className="max-h-[55vh] sm:max-h-[62vh] max-w-full object-contain rounded-none shadow-2xl border border-slate-800/80 cursor-pointer"
            onClick={togglePlay}
          />

          {/* Floating Center Play Button */}
          {!isPlaying && !isLoading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all transform hover:scale-110 cursor-pointer z-30 border border-indigo-400/30"
              title="Play Video"
            >
              <Play className="w-8 h-8 ml-1 fill-white" />
            </button>
          )}

          {/* Video Text Overlays active at currentTime */}
          {textOverlays
            .filter((overlay) => currentTime >= overlay.startTime && currentTime <= overlay.endTime)
            .map((overlay) => {
              const isSelected = activeTextId === overlay.id;
              let fontClass = "font-sans";
              if (overlay.fontFamily === "serif") fontClass = "font-serif";
              else if (overlay.fontFamily === "mono") fontClass = "font-mono";
              else if (overlay.fontFamily === "display") fontClass = "font-black tracking-wide uppercase";
              else if (overlay.fontFamily === "script") fontClass = "font-serif italic";

              return (
                <div
                  key={overlay.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTextId(overlay.id);
                    if (activeTool !== "text") setActiveTool("text");
                  }}
                  onPointerDown={(e) => handleTextPointerDown(e, overlay)}
                  onPointerMove={(e) => handleTextPointerMove(e, overlay.id)}
                  onPointerUp={handleTextPointerUp}
                  onPointerCancel={handleTextPointerUp}
                  style={{
                    left: `${overlay.xNormalized * 100}%`,
                    top: `${overlay.yNormalized * 100}%`,
                    transform: `translate(-50%, -50%) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`,
                    opacity: overlay.opacity,
                    color: overlay.color,
                  }}
                  className={`absolute pointer-events-auto select-none cursor-grab active:cursor-grabbing z-30 transition-shadow touch-none ${
                    isSelected
                      ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-black/40 rounded-xl p-2 bg-black/30 backdrop-blur-sm"
                      : "p-1"
                  }`}
                >
                  <div
                    className={`${fontClass} whitespace-nowrap text-lg sm:text-2xl font-bold transition-all ${
                      overlay.style === "background"
                        ? "px-3 py-1 rounded-xl shadow-lg"
                        : overlay.style === "outline"
                        ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                        : overlay.style === "shadow"
                        ? "drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                        : ""
                    }`}
                    style={{
                      backgroundColor:
                        overlay.style === "background"
                          ? overlay.bgColor || "rgba(0,0,0,0.75)"
                          : "transparent",
                    }}
                  >
                    {overlay.text}
                  </div>
                </div>
              );
            })}

          {/* Interactive Sticker Overlays on Video Stage */}
          {stickerOverlays.map((stickerItem) => {
            const isSelected = activeStickerId === stickerItem.id;
            return (
              <div
                key={stickerItem.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStickerId(stickerItem.id);
                  if (activeTool !== "stickers") setActiveTool("stickers");
                }}
                style={{
                  left: `${stickerItem.xNormalized * 100}%`,
                  top: `${stickerItem.yNormalized * 100}%`,
                  transform: `translate(-50%, -50%) scale(${stickerItem.scale}) rotate(${stickerItem.rotation}deg)`,
                }}
                className={`absolute pointer-events-auto select-none cursor-grab active:cursor-grabbing z-30 transition-shadow touch-none ${
                  isSelected
                    ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-black/40 rounded-2xl p-1 bg-black/20 backdrop-blur-sm"
                    : "p-1"
                }`}
              >
                <div className="text-4xl sm:text-5xl drop-shadow-lg leading-none">
                  {stickerItem.sticker}
                </div>

                {isSelected && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-xl p-1 shadow-2xl z-40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickerOverlays((prev) =>
                          prev.map((s) => (s.id === stickerItem.id ? { ...s, scale: Math.max(0.4, s.scale - 0.15) } : s))
                        );
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                      title="Decrease Size"
                    >
                      A-
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickerOverlays((prev) =>
                          prev.map((s) => (s.id === stickerItem.id ? { ...s, scale: Math.min(3, s.scale + 0.15) } : s))
                        );
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                      title="Increase Size"
                    >
                      A+
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickerOverlays((prev) =>
                          prev.map((s) => (s.id === stickerItem.id ? { ...s, rotation: (s.rotation + 90) % 360 } : s))
                        );
                      }}
                      className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                      title="Rotate Sticker"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickerOverlays((prev) => prev.filter((s) => s.id !== stickerItem.id));
                        setActiveStickerId(null);
                      }}
                      className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer"
                      title="Delete Sticker"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Floating Center Play/Pause Button */}
          {!isPlaying && !isLoading && (
            <button
              onClick={togglePlay}
              className="absolute w-16 h-16 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl cursor-pointer hover:scale-105 transition-all"
            >
              <Play className="w-8 h-8 fill-white ml-1" />
            </button>
          )}
        </div>

        {/* Floating Time Display */}
        <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md text-[11px] font-mono font-bold text-slate-200">
          {formatTime(currentTime)} / {formatTime(trimEnd - trimStart)}
        </div>
      </div>

      {/* Bottom Area for Video Dock & Contextual Tool Panels */}
      <div className="bg-slate-900/95 border-t border-slate-800/90 p-3 sm:p-4 shadow-2xl z-20 min-h-[130px] flex flex-col justify-center backdrop-blur-md">
        <AnimatePresence mode="wait">
          {activeTool === "none" && (
            <div key="video-dock" className="w-full flex justify-center py-1">
              <EditingToolDock activeTool={activeTool} onSelectTool={setActiveTool} />
            </div>
          )}

          {activeTool !== "none" && activeTool !== null && (
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-w-3xl mx-auto w-full space-y-3"
            >
              {/* Tool Navigation Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <button
                  onClick={() => {
                    haptics.light();
                    setActiveTool("none");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700/60 transition-all active:scale-95"
                  title="Return to Editing Tools"
                  aria-label="Back to Editing Tools"
                >
                  <ChevronLeft className="w-4 h-4 text-indigo-400" />
                  <span>Tools</span>
                </button>

                <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                  {activeTool === "adjust" && "Adjust & Speed"}
                  {activeTool === "crop" && "Timeline Trimmer"}
                  {activeTool === "filter" && "Video Filters"}
                  {activeTool === "text" && "Video Captions"}
                  {activeTool === "stickers" && "Stickers"}
                </span>

                <div className="w-16" />
              </div>

              {/* ADJUST TOOL (Sliders + Speed & Audio) */}
              {activeTool === "adjust" && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-xl mx-auto">
                    {[
                      { id: "brightness", label: "Brightness", val: brightness },
                      { id: "contrast", label: "Contrast", val: contrast },
                      { id: "saturation", label: "Saturation", val: saturation },
                      { id: "warmth", label: "Temperature", val: warmth },
                      { id: "speed", label: "Speed", val: `${playbackRate}x` },
                      { id: "volume", label: "Audio", val: isMuted ? "Muted" : "On" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          haptics.selection();
                          setSelectedAdjustment(p.id as any);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
                          selectedAdjustment === p.id
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>

                  {selectedAdjustment === "speed" ? (
                    <div className="flex items-center justify-center gap-2 max-w-md mx-auto bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                      <span className="text-xs text-slate-400 font-semibold mr-1">Playback Speed:</span>
                      {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            if (videoRef.current) videoRef.current.playbackRate = rate;
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            playbackRate === rate
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  ) : selectedAdjustment === "volume" ? (
                    <div className="flex items-center justify-center gap-3 max-w-md mx-auto bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                      <button
                        onClick={() => {
                          const nextMuted = !isMuted;
                          setIsMuted(nextMuted);
                          if (videoRef.current) videoRef.current.muted = nextMuted;
                        }}
                        className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${
                          isMuted
                            ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                            : "bg-slate-900 border-slate-700 text-emerald-400"
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span>{isMuted ? "Video Muted" : "Audio Enabled"}</span>
                      </button>
                      <button
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        className="px-4 py-2 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer"
                      >
                        <RotateCw className="w-4 h-4 text-indigo-400" />
                        <span>Rotate ({rotation}°)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span className="capitalize">{selectedAdjustment}</span>
                        <span className="font-mono text-indigo-400">
                          {selectedAdjustment === "brightness" && (brightness > 0 ? `+${brightness}` : brightness)}
                          {selectedAdjustment === "contrast" && (contrast > 0 ? `+${contrast}` : contrast)}
                          {selectedAdjustment === "saturation" && (saturation > 0 ? `+${saturation}` : saturation)}
                          {selectedAdjustment === "warmth" && (warmth > 0 ? `+${warmth}` : warmth)}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={
                          selectedAdjustment === "brightness"
                            ? brightness
                            : selectedAdjustment === "contrast"
                            ? contrast
                            : selectedAdjustment === "saturation"
                            ? saturation
                            : warmth
                        }
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (selectedAdjustment === "brightness") setBrightness(val);
                          else if (selectedAdjustment === "contrast") setContrast(val);
                          else if (selectedAdjustment === "saturation") setSaturation(val);
                          else if (selectedAdjustment === "warmth") setWarmth(val);
                        }}
                        className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* CROP / TRIM TOOL */}
              {activeTool === "crop" && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1">
                    <span>Start: {formatTime(trimStart, true)}</span>
                    <span className="text-indigo-400 font-bold">
                      Trimmed: {formatTime(trimEnd - trimStart, true)}
                    </span>
                    <span>End: {formatTime(trimEnd, true)}</span>
                  </div>

                  <div
                    ref={timelineRef}
                    onPointerMove={handleTrimPointerMove}
                    onPointerUp={handleTrimPointerUp}
                    onPointerCancel={handleTrimPointerUp}
                    className="relative w-full h-12 bg-slate-950 rounded-2xl border border-slate-800 p-1 flex items-center cursor-pointer select-none touch-none"
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-slate-950/80 rounded-l-2xl z-10 pointer-events-none"
                      style={{ width: `${startPct}%` }}
                    />

                    <div
                      className="absolute top-0 bottom-0 bg-indigo-500/20 border-y-2 border-indigo-500 z-10 pointer-events-none"
                      style={{
                        left: `${startPct}%`,
                        width: `${Math.max(0, endPct - startPct)}%`,
                      }}
                    />

                    <div
                      className="absolute right-0 top-0 bottom-0 bg-slate-950/80 rounded-r-2xl z-10 pointer-events-none"
                      style={{ width: `${100 - endPct}%` }}
                    />

                    <div
                      onPointerDown={(e) => handleTrimPointerDown(e, "start")}
                      onPointerMove={handleTrimPointerMove}
                      onPointerUp={handleTrimPointerUp}
                      onPointerCancel={handleTrimPointerUp}
                      className="absolute top-0 bottom-0 w-12 -ml-6 z-30 cursor-ew-resize flex items-center justify-center group touch-none"
                      style={{ left: `${startPct}%` }}
                      title="Trim Start"
                    >
                      <div className="w-5 h-full bg-indigo-500 rounded-l-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <div className="w-1 h-5 bg-white rounded-full opacity-80" />
                      </div>
                    </div>

                    <div
                      onPointerDown={(e) => handleTrimPointerDown(e, "scrub")}
                      onPointerMove={handleTrimPointerMove}
                      onPointerUp={handleTrimPointerUp}
                      onPointerCancel={handleTrimPointerUp}
                      className="absolute top-0 bottom-0 w-1 bg-white z-20 cursor-pointer shadow-md touch-none"
                      style={{ left: `${currentPct}%` }}
                    >
                      <div className="w-3 h-3 bg-white rounded-full -ml-[4px] -mt-1 shadow-lg border border-indigo-600" />
                    </div>

                    <div
                      onPointerDown={(e) => handleTrimPointerDown(e, "end")}
                      onPointerMove={handleTrimPointerMove}
                      onPointerUp={handleTrimPointerUp}
                      onPointerCancel={handleTrimPointerUp}
                      className="absolute top-0 bottom-0 w-12 -ml-6 z-30 cursor-ew-resize flex items-center justify-center group touch-none"
                      style={{ left: `${endPct}%` }}
                      title="Trim End"
                    >
                      <div className="w-5 h-full bg-indigo-500 rounded-r-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <div className="w-1 h-5 bg-white rounded-full opacity-80" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FILTER TOOL */}
              {activeTool === "filter" && (
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none w-full">
                  {filterPresets.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        haptics.selection();
                        applyPresetFilter(f.id);
                      }}
                      className={`flex-shrink-0 px-4 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        filter === f.id
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <span>{f.label}</span>
                      {filter === f.id && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              )}

              {/* TEXT / CAPTION TOOL */}
              {activeTool === "text" && (
                <div className="space-y-3 pt-1 max-w-xl mx-auto">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        haptics.selection();
                        const maxDuration = duration > 0 ? duration : 10;
                        const newOverlay: TextOverlay = {
                          id: `vtext-${Date.now()}`,
                          text: "Video Caption",
                          xNormalized: 0.5,
                          yNormalized: 0.8,
                          scale: 1,
                          rotation: 0,
                          fontFamily: "sans",
                          color: "#ffffff",
                          opacity: 1,
                          alignment: "center",
                          style: "background",
                          bgColor: "rgba(0,0,0,0.75)",
                          startTime: 0,
                          endTime: maxDuration,
                        };
                        setTextOverlays((prev) => [...prev, newOverlay]);
                        setActiveTextId(newOverlay.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Caption</span>
                    </button>

                    {activeTextId && (
                      <input
                        type="text"
                        value={textOverlays.find((t) => t.id === activeTextId)?.text || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTextOverlays((prev) =>
                            prev.map((t) => (t.id === activeTextId ? { ...t, text: val } : t))
                          );
                        }}
                        placeholder="Type caption text..."
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>

                  {activeTextId && (
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                        <span>Timing Range:</span>
                        <button
                          onClick={() => {
                            setTextOverlays((prev) => prev.filter((t) => t.id !== activeTextId));
                            setActiveTextId(null);
                          }}
                          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-400">
                            Show: {formatTime(textOverlays.find((t) => t.id === activeTextId)?.startTime || 0, true)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={duration || 10}
                            step={0.1}
                            value={textOverlays.find((t) => t.id === activeTextId)?.startTime || 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setTextOverlays((prev) =>
                                prev.map((t) =>
                                  t.id === activeTextId
                                    ? { ...t, startTime: Math.min(val, (t.endTime || duration) - 0.5) }
                                    : t
                                )
                              );
                            }}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-400">
                            Hide: {formatTime(textOverlays.find((t) => t.id === activeTextId)?.endTime || duration || 10, true)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={duration || 10}
                            step={0.1}
                            value={textOverlays.find((t) => t.id === activeTextId)?.endTime || duration || 10}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setTextOverlays((prev) =>
                                prev.map((t) =>
                                  t.id === activeTextId
                                    ? { ...t, endTime: Math.max(val, (t.startTime || 0) + 0.5) }
                                    : t
                                )
                              );
                            }}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STICKERS TOOL */}
              {activeTool === "stickers" && (
                <div className="space-y-2 max-w-xl mx-auto">
                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    Tap a sticker to add it to your video
                  </p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
                    {[
                      "✨", "❤️", "🔥", "😎", "⭐", "🎉", "🌈", "🌸", "👑", "🚀",
                      "💡", "🎨", "📸", "☀️", "🌴", "☕", "🏆", "💯", "✌️", "🍀"
                    ].map((stickerEmoji) => (
                      <button
                        key={stickerEmoji}
                        onClick={() => {
                          haptics.selection();
                          const newSticker: StickerOverlay = {
                            id: `vsticker-${Date.now()}`,
                            sticker: stickerEmoji,
                            xNormalized: 0.5,
                            yNormalized: 0.5,
                            scale: 1,
                            rotation: 0,
                          };
                          setStickerOverlays((prev) => [...prev, newSticker]);
                          setActiveStickerId(newSticker.id);
                        }}
                        className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800/80 text-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0"
                      >
                        {stickerEmoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export / Saving Progress Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-[115] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 p-6 text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-100">Processing Video Edits...</h4>
            <p className="text-xs text-slate-400">
              Applying timeline trim range and color filters ({exportProgress}%)
            </p>
          </div>
          <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-indigo-500 transition-all duration-200 rounded-full"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Discard Video Edits Confirmation Modal */}
      {showDiscardConfirmModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Quit Editing?</h3>
                <p className="text-[11px] text-slate-400">Do you want to discard edits and exit, or keep editing?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDiscardConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all border border-slate-700/60"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowDiscardConfirmModal(false);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

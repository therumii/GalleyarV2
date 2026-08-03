import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MediaActionBar } from "./MediaActionBar";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Info,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize2,
  Minimize2,
  Loader2,
  MapPin,
  Camera,
  Sparkles,
  FileText,
  X,
  Copy,
  Check,
  SlidersHorizontal,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react";
import { Photo } from "../types";

interface VideoViewerProps {
  photo: Photo;
  photosList: Photo[];
  onClose: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onToggleFavorite: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onUnhidePhoto?: (photoId: string) => void;
  onOpenEditor?: (photo: Photo) => void;
  onShare: () => void;
  showInfoPanel: boolean;
  setShowInfoPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showOtherOptions: boolean;
  setShowOtherOptions: React.Dispatch<React.SetStateAction<boolean>>;
}

const DEFAULT_FALLBACK_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export const VideoViewer: React.FC<VideoViewerProps> = ({
  photo,
  photosList,
  onClose,
  onSelectPhoto,
  onToggleFavorite,
  onDeletePhoto,
  onUnhidePhoto,
  onOpenEditor,
  onShare,
  showInfoPanel,
  setShowInfoPanel,
  showOtherOptions,
  setShowOtherOptions,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Video State
  const [videoSrc, setVideoSrc] = useState<string>(
    photo.videoUrl || photo.highResUrl || DEFAULT_FALLBACK_VIDEO
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isEnded, setIsEnded] = useState<boolean>(false);
  const [showPhotoCount, setShowPhotoCount] = useState<boolean>(true);

  // Compute visibility of media action toolbar (Share, Favorite, Edit, Info, Delete)
  const showMediaActions = !isPlaying || isEnded || showOtherOptions;

  // Swipe gesture state for media navigation
  const mediaStageRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const isScrubbingRef = useRef<boolean>(false);

  // Keep ref updated
  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

  // Gesture Feedback State (Double tap seek)
  const [seekFeedback, setSeekFeedback] = useState<{
    type: "forward" | "backward";
    seconds: number;
    key: number;
  } | null>(null);

  // Tap timing for double-tap detection
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // Navigation indexes
  const currentIndex = photosList.findIndex((p) => p.id === photo.id);
  const prevIdx = (currentIndex - 1 + photosList.length) % photosList.length;
  const nextIdx = (currentIndex + 1) % photosList.length;
  const prevItem = photosList.length > 1 ? photosList[prevIdx] : null;
  const nextItem = photosList.length > 1 ? photosList[nextIdx] : null;
  const hasPrev = photosList.length > 1;
  const hasNext = photosList.length > 1;

  // Single source of truth for normalized progress
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const progressPercent = progressRatio * 100;

  // Auto hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !isScrubbing) {
        setShowControls(false);
      }
    }, 3200);
  }, [isScrubbing]);

  // Handle Play/Pause
  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;

    if (videoRef.current.paused || videoRef.current.ended) {
      if (videoRef.current.ended) {
        videoRef.current.currentTime = 0;
        setIsEnded(false);
      }
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          resetControlsTimeout();
        })
        .catch(() => {
          // If unmuted playback fails due to browser policy, fall back to muted
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [resetControlsTimeout]);

  // Seek relative (e.g., -10s or +10s)
  const seekRelative = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration || videoRef.current.duration || 0));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setIsEnded(false);
    resetControlsTimeout();

    // Visual feedback
    setSeekFeedback({
      type: seconds > 0 ? "forward" : "backward",
      seconds: Math.abs(seconds),
      key: Date.now(),
    });
  }, [duration, resetControlsTimeout]);

  // Handle Mute Toggle
  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    resetControlsTimeout();
  }, [isMuted, resetControlsTimeout]);

  // Playback Rate Cycle
  const cyclePlaybackRate = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    videoRef.current.playbackRate = nextRate;
    resetControlsTimeout();
  }, [playbackRate, resetControlsTimeout]);

  // Fullscreen Toggle
  const toggleFullscreen = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Previous & Next Media Navigation
  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (photosList.length <= 1) return;
    const prevIdx = (currentIndex - 1 + photosList.length) % photosList.length;
    onSelectPhoto(photosList[prevIdx]);
  }, [currentIndex, photosList, onSelectPhoto]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (photosList.length <= 1) return;
    const nextIdx = (currentIndex + 1) % photosList.length;
    onSelectPhoto(photosList[nextIdx]);
  }, [currentIndex, photosList, onSelectPhoto]);

  // Scrubber Seek Math
  const updateScrubberPos = useCallback((clientX: number) => {
    if (!scrubberRef.current || !videoRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const targetTime = ratio * (videoRef.current.duration || duration || 1);
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  }, [duration]);

  // Mouse & Touch Scrubbing Listeners
  useEffect(() => {
    if (!isScrubbing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX !== undefined) {
        updateScrubberPos(clientX);
      }
    };

    const handleUp = () => {
      setIsScrubbing(false);
      resetControlsTimeout();
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isScrubbing, updateScrubberPos, resetControlsTimeout]);

  // Video Initialisation on Photo Change
  useEffect(() => {
    const src = photo.videoUrl || photo.highResUrl || DEFAULT_FALLBACK_VIDEO;
    setVideoSrc(src);
    setHasError(false);
    setIsLoading(true);
    setCurrentTime(0);
    setIsEnded(false);
    setShowControls(true);
    resetControlsTimeout();

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = isMuted;
      if (videoRef.current.readyState >= 2) {
        setIsLoading(false);
        if (videoRef.current.duration) setDuration(videoRef.current.duration);
      }
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current
              .play()
              .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
              })
              .catch(() => setIsPlaying(false));
          }
        });
    }
  }, [photo.id]);

  // Preload adjacent images/video metadata
  useEffect(() => {
    if (prevItem && !prevItem.isVideo) {
      const img = new Image();
      img.src = prevItem.highResUrl || prevItem.url;
    }
    if (nextItem && !nextItem.isVideo) {
      const img = new Image();
      img.src = nextItem.highResUrl || nextItem.url;
    }
  }, [prevItem, nextItem]);

  // Pointer Swipe Gesture Handlers for Stage
  const [dragX, setDragX] = useState<number>(0);
  const [isDraggingTrack, setIsDraggingTrack] = useState<boolean>(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isScrubbingRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    swipeDeltaRef.current = { x: 0, y: 0 };
    setIsDraggingTrack(true);
    setDragX(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current || isScrubbingRef.current || !isDraggingTrack) return;

    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;
    swipeDeltaRef.current = { x: deltaX, y: deltaY };

    let effectiveX = deltaX;
    if ((currentIndex === 0 && deltaX > 0) || (currentIndex === photosList.length - 1 && deltaX < 0)) {
      effectiveX = deltaX * 0.25;
    }
    setDragX(effectiveX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const startTime = pointerStartRef.current.time;
    pointerStartRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const deltaX = swipeDeltaRef.current.x;
    const deltaY = swipeDeltaRef.current.y;
    const totalDistance = Math.hypot(deltaX, deltaY);
    const durationMs = Date.now() - startTime;

    if (totalDistance > 10) {
      // Swipe gesture completed
      const threshold = Math.min(window.innerWidth * 0.2, 80);
      const isFlick = Math.abs(deltaX) > 35 && durationMs < 280;

      if ((deltaX < -threshold || (isFlick && deltaX < 0)) && currentIndex < photosList.length - 1) {
        if (videoRef.current) videoRef.current.pause();
        setIsPlaying(false);
        handleNext();
      } else if ((deltaX > threshold || (isFlick && deltaX > 0)) && currentIndex > 0) {
        if (videoRef.current) videoRef.current.pause();
        setIsPlaying(false);
        handlePrev();
      }
    } else {
      // Tap / double-tap action
      const clientX = e.clientX;
      const now = Date.now();
      const timeDiff = now - lastTapRef.current.time;
      const containerWidth = containerRef.current?.getBoundingClientRect().width || window.innerWidth;
      const tapXRatio = clientX / containerWidth;

      if (timeDiff < 300) {
        if (tapXRatio < 0.38) {
          seekRelative(-10);
        } else if (tapXRatio > 0.62) {
          seekRelative(10);
        } else {
          togglePlay();
        }
        lastTapRef.current = { time: 0, x: clientX };
      } else {
        lastTapRef.current = { time: now, x: clientX };
        setShowControls((prev) => !prev);
        resetControlsTimeout();
      }
    }

    setDragX(0);
    setIsDraggingTrack(false);
  };

  // Continuous 60fps time sync
  useEffect(() => {
    let animId: number;
    const syncTime = () => {
      if (videoRef.current && !videoRef.current.paused && !isScrubbing) {
        setCurrentTime(videoRef.current.currentTime);
        animId = requestAnimationFrame(syncTime);
      }
    };
    if (isPlaying && !isScrubbing) {
      animId = requestAnimationFrame(syncTime);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, isScrubbing]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekRelative(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekRelative(10);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seekRelative, toggleFullscreen, toggleMute, onClose]);

  // Double Tap & Single Tap Handler on Video Stage
  const handleVideoAreaTap = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX;
    const now = Date.now();
    const timeDiff = now - lastTapRef.current.time;
    const containerWidth = containerRef.current?.getBoundingClientRect().width || window.innerWidth;
    const tapXRatio = clientX / containerWidth;

    if (timeDiff < 300) {
      // Double tap detected!
      if (tapXRatio < 0.38) {
        seekRelative(-10);
      } else if (tapXRatio > 0.62) {
        seekRelative(10);
      } else {
        togglePlay();
      }
      lastTapRef.current = { time: 0, x: clientX };
    } else {
      // Single tap
      lastTapRef.current = { time: now, x: clientX };
      // Toggle controls visibility
      setShowControls((prev) => !prev);
      resetControlsTimeout();
    }
  };

  // Time formatter (00:00 or 0:00)
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0 || !isFinite(secs)) return "00:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      className="fixed inset-0 z-50 bg-black w-screen h-[100dvh] flex flex-col justify-between overflow-hidden select-none touch-none animate-fade-in"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Top Overlay Gradient Control Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-3 pb-12 px-4 sm:px-6 flex items-center justify-between gap-4 transition-opacity duration-300 pointer-events-auto ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Back Button & Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all cursor-pointer shrink-0 border border-white/10"
            title="Back to Gallery"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate drop-shadow">
              {photo.title}
            </h3>
            <p className="text-[11px] text-slate-300 flex items-center gap-1.5 truncate drop-shadow">
              <span>{photo.day}</span>
              {photo.location?.name && (
                <>
                  <span>•</span>
                  <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{photo.location.name}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Options & Navigation Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Media Count Badge Toggle */}
          {photosList.length > 1 && (
            <button
              onClick={() => setShowPhotoCount(!showPhotoCount)}
              className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/70 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
              title="Toggle Media Count"
            >
              {showPhotoCount ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{currentIndex + 1} of {photosList.length}</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-400">Count Hidden</span>
                </>
              )}
            </button>
          )}

          {/* Fullscreen Mode Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all cursor-pointer border border-white/10"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Secondary Options Toggle */}
          <button
            onClick={() => setShowOtherOptions(!showOtherOptions)}
            className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer border ${
              showOtherOptions
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                : "bg-black/40 hover:bg-black/70 border-white/10 text-white"
            }`}
            title="Toggle Action Options"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Centered Action Bar (Identical layout to PhotoViewer) */}
      <MediaActionBar
        photo={photo}
        isVisible={showMediaActions}
        onShare={onShare}
        onToggleFavorite={onToggleFavorite}
        onOpenEditor={onOpenEditor}
        onDeletePhoto={onDeletePhoto}
        onUnhidePhoto={onUnhidePhoto}
        showInfoPanel={showInfoPanel}
        setShowInfoPanel={setShowInfoPanel}
      />

      {/* Main Video View Stage */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden cursor-pointer touch-none select-none"
      >
        {/* Horizontal Track Element */}
        <div
          ref={mediaStageRef}
          className="flex w-full h-full items-center"
          style={{
            transform: `translate3d(calc(-100% + ${dragX}px), 0, 0)`,
            transition: isDraggingTrack ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Slide 0: Previous Media */}
          <div className="w-full h-full flex-shrink-0 flex items-center justify-center p-2 sm:p-6">
            {prevItem ? (
              <img
                src={prevItem.highResUrl || prevItem.url}
                alt={prevItem.title}
                draggable={false}
                className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800/80 pointer-events-none opacity-80"
              />
            ) : null}
          </div>

          {/* Slide 1: Current Active Video */}
          <div className="w-full h-full flex-shrink-0 flex items-center justify-center relative p-2 sm:p-6">
            <video
              ref={videoRef}
              src={videoSrc}
              poster={photo.url}
              playsInline
              autoPlay
              muted={isMuted}
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => {
                setIsLoading(false);
                setIsPlaying(true);
              }}
              onCanPlay={() => setIsLoading(false)}
              onTimeUpdate={() => {
                if (videoRef.current && !isScrubbing) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration);
                }
              }}
              onEnded={() => {
                setIsPlaying(false);
                setIsEnded(true);
                setShowControls(true);
              }}
              onError={() => {
                if (videoSrc !== DEFAULT_FALLBACK_VIDEO) {
                  setVideoSrc(DEFAULT_FALLBACK_VIDEO);
                } else {
                  setHasError(true);
                  setIsLoading(false);
                }
              }}
              className="w-full h-full max-w-full max-h-full object-contain pointer-events-none select-none"
            />
          </div>

          {/* Slide 2: Next Media */}
          <div className="w-full h-full flex-shrink-0 flex items-center justify-center p-2 sm:p-6">
            {nextItem ? (
              <img
                src={nextItem.highResUrl || nextItem.url}
                alt={nextItem.title}
                draggable={false}
                className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800/80 pointer-events-none opacity-80"
              />
            ) : null}
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 bg-black/20 backdrop-blur-[2px]">
            <Loader2 className="w-12 h-12 text-white animate-spin drop-shadow-xl" />
          </div>
        )}

        {/* Error Fallback State */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-black/80 text-white p-6 text-center">
            <p className="text-sm font-semibold text-slate-300">
              Unable to play video format
            </p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                setVideoSrc(DEFAULT_FALLBACK_VIDEO);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Playback</span>
            </button>
          </div>
        )}

        {/* Large Floating Center Play / Pause / Replay Indicator Button */}
        <AnimatePresence>
          {(!isPlaying || isEnded) && !isLoading && !hasError && (
            <motion.div
              key="center-play-button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="pointer-events-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl transition-transform active:scale-95 cursor-pointer"
                title={isEnded ? "Replay Video" : "Play Video"}
              >
                {isEnded ? (
                  <RotateCcw className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Double Tap Gesture Feedback Badge Overlay */}
        <AnimatePresence>
          {seekFeedback && (
            <motion.div
              key={seekFeedback.key}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
              onAnimationComplete={() => setSeekFeedback(null)}
              className={`absolute top-1/2 -translate-y-1/2 z-25 pointer-events-none ${
                seekFeedback.type === "backward" ? "left-12 sm:left-24" : "right-12 sm:right-24"
              }`}
            >
              <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white shadow-2xl">
                <RotateCcw
                  className={`w-6 h-6 text-white ${
                    seekFeedback.type === "forward" ? "scale-x-[-1]" : ""
                  }`}
                />
                <span className="text-xs font-bold font-mono mt-1">
                  {seekFeedback.type === "backward" ? "-10s" : "+10s"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Overlay Gradient Playback Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10 pb-4 px-4 sm:px-8 flex flex-col gap-2.5 transition-opacity duration-300 pointer-events-auto ${
          showControls || !isPlaying
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrubber & Time Display */}
        <div className="flex items-center gap-3 w-full max-w-4xl mx-auto">
          {/* Current Time */}
          <span className="text-xs font-mono font-semibold text-slate-200 w-12 text-right shrink-0 drop-shadow">
            {formatTime(currentTime)}
          </span>

          {/* Interactive Seek Bar Line */}
          <div
            ref={scrubberRef}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsScrubbing(true);
              updateScrubberPos(e.clientX);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setIsScrubbing(true);
              if (e.touches[0]) updateScrubberPos(e.touches[0].clientX);
            }}
            className="relative flex-1 h-8 flex items-center cursor-pointer group touch-none select-none py-2"
            title="Seek timeline"
          >
            {/* Background Track */}
            <div className="w-full h-1 bg-white/25 group-hover:h-1.5 rounded-full overflow-hidden shadow-inner relative">
              {/* Progress Fill */}
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>

            {/* Moving Handle Thumb Dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10"
              style={{
                left: `${progressPercent}%`,
              }}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-lg border-2 border-indigo-500 group-hover:scale-125 transition-transform" />
            </div>
          </div>

          {/* Total Duration */}
          <span className="text-xs font-mono font-semibold text-slate-300 w-12 text-left shrink-0 drop-shadow">
            {formatTime(duration)}
          </span>
        </div>

        {/* Primary Playback Action Controls Row */}
        <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto pt-1 min-h-[52px]">
          {/* Left Speed & Mute */}
          <div className="flex items-center gap-2 z-10">
            {/* Speed Rate */}
            <button
              onClick={cyclePlaybackRate}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer"
              title="Change Playback Speed"
            >
              {playbackRate}x
            </button>

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>

          {/* Center Main Play / Pause & Prev / Next Navigation - EXACT VIEWPORT CENTER */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 sm:gap-6 z-10">
            {/* Previous Video */}
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all ${
                hasPrev ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
              }`}
              title="Previous Item"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Play/Pause Main Button */}
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-white hover:bg-slate-200 text-black flex items-center justify-center shadow-xl transform active:scale-95 transition-all cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-black fill-black" />
              ) : (
                <Play className="w-5 h-5 text-black fill-black ml-0.5" />
              )}
            </button>

            {/* Next Video */}
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className={`p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all ${
                hasNext ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
              }`}
              title="Next Item"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right Fullscreen & Options */}
          <div className="flex items-center gap-2 z-10 ml-auto">
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Panel Overlay (Desktop Drawer & Mobile Sheet) */}
      <AnimatePresence>
        {showInfoPanel && (
          <>
            {/* Desktop Side Panel Drawer */}
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 right-0 bottom-0 z-40 w-80 bg-slate-950/95 border-l border-slate-800/90 p-5 overflow-y-auto space-y-6 hidden md:block backdrop-blur-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-100">{photo.title}</h4>
                  <p className="text-xs text-slate-400">{photo.category} • {photo.fileSize}</p>
                </div>
                <button
                  onClick={() => setShowInfoPanel(false)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Camera EXIF Details */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Camera & Video Specs</span>
                </h5>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Camera</span>
                    <span className="text-slate-200 font-semibold">{photo.exif.camera}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-slate-200 font-medium">{photo.duration || formatTime(duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resolution</span>
                    <span className="text-slate-200 font-medium">{photo.resolution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aperture</span>
                    <span className="text-slate-200 font-medium">{photo.exif.aperture}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ISO Speed</span>
                    <span className="text-slate-200 font-medium">{photo.exif.iso}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Location</span>
                </h5>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
                  <p className="text-xs font-bold text-slate-100">{photo.location.name}</p>
                  <p className="text-[11px] text-slate-400">{photo.location.city}, {photo.location.country}</p>
                  <div className="text-[10px] text-slate-500 font-mono pt-1">
                    GPS: {photo.location.lat.toFixed(4)}, {photo.location.lng.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* AI Tags */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Smart Tags</span>
                </h5>

                <div className="flex flex-wrap gap-1.5">
                  {photo.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 text-[10px] font-medium border border-slate-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Mobile Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="md:hidden absolute inset-x-0 bottom-0 z-40 bg-slate-950 border-t border-slate-800 p-5 rounded-t-3xl max-h-[70vh] overflow-y-auto shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-100">{photo.title}</h4>
                  <p className="text-[11px] text-slate-400">{photo.category} • {photo.fileSize}</p>
                </div>
                <button
                  onClick={() => setShowInfoPanel(false)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Specs */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Specs</span>
                </h5>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Camera</span>
                    <span className="text-slate-200 font-semibold">{photo.exif.camera}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-slate-200 font-medium">{photo.duration || formatTime(duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resolution</span>
                    <span className="text-slate-200 font-medium">{photo.resolution}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

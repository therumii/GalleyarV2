import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { VideoViewer } from "./VideoViewer";
import { MediaActionBar } from "./MediaActionBar";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  SlidersHorizontal,
  Pencil,
  Share2,
  Info,
  Trash2,
  MapPin,
  Camera,
  Calendar,
  FileText,
  Copy,
  Sparkles,
  Users,
  Check,
  Tag,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Film,
  Eye,
  EyeOff,
} from "lucide-react";
import { Photo } from "../types";

interface PhotoLightboxProps {
  photo: Photo | null;
  photosList: Photo[];
  onClose: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onToggleFavorite: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onPermanentDelete?: (photoId: string) => void;
  onUnhidePhoto?: (photoId: string) => void;
  onOpenEditor: (photo: Photo) => void;
  onAutoEnhance?: (photo: Photo) => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = (props) => {
  const { photo, photosList, onClose, onSelectPhoto, onToggleFavorite, onDeletePhoto } = props;
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!photo) return null;

  const handleConfirmMoveToTrash = () => {
    const photoToDeleteId = photo.id;
    const remaining = photosList.filter((p) => p.id !== photoToDeleteId);

    onDeletePhoto(photoToDeleteId);
    setShowDeleteModal(false);

    if (remaining.length === 0) {
      onClose();
    } else {
      const currentIndex = photosList.findIndex((p) => p.id === photo.id);
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      const nextPhoto = remaining[nextIndex];
      if (nextPhoto) {
        onSelectPhoto(nextPhoto);
      } else {
        onClose();
      }
    }
  };

  const handleConfirmPermanentDelete = () => {
    const photoToDeleteId = photo.id;
    const remaining = photosList.filter((p) => p.id !== photoToDeleteId);

    if (props.onPermanentDelete) {
      props.onPermanentDelete(photoToDeleteId);
    } else {
      onDeletePhoto(photoToDeleteId);
    }
    setShowDeleteModal(false);

    if (remaining.length === 0) {
      onClose();
    } else {
      const currentIndex = photosList.findIndex((p) => p.id === photo.id);
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      const nextPhoto = remaining[nextIndex];
      if (nextPhoto) {
        onSelectPhoto(nextPhoto);
      } else {
        onClose();
      }
    }
  };

  const handleUnhideCurrentPhoto = (photoId: string) => {
    if (props.onUnhidePhoto) {
      props.onUnhidePhoto(photoId);
    }
    const remaining = photosList.filter((p) => p.id !== photoId);
    if (remaining.length === 0) {
      onClose();
    } else {
      const currentIndex = photosList.findIndex((p) => p.id === photoId);
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      const nextPhoto = remaining[nextIndex];
      if (nextPhoto) {
        onSelectPhoto(nextPhoto);
      } else {
        onClose();
      }
    }
  };

  const handleShare = (p: Photo) => {
    const shareUrl = p.highResUrl || p.url;
    if (navigator.share) {
      navigator.share({
        title: p.title,
        text: `Check out "${p.title}" on GalleyAR`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <>
      {photo.isVideo ? (
        <VideoViewer
          photo={photo}
          photosList={photosList}
          onClose={onClose}
          onSelectPhoto={onSelectPhoto}
          onToggleFavorite={onToggleFavorite}
          onDeletePhoto={() => setShowDeleteModal(true)}
          onUnhidePhoto={handleUnhideCurrentPhoto}
          onOpenEditor={props.onOpenEditor}
          onShare={() => handleShare(photo)}
          showInfoPanel={showInfoPanel}
          setShowInfoPanel={setShowInfoPanel}
          showOtherOptions={showOtherOptions}
          setShowOtherOptions={setShowOtherOptions}
        />
      ) : (
        <PhotoViewerInner
          {...props}
          photo={photo}
          onDeletePhoto={() => setShowDeleteModal(true)}
          onUnhidePhoto={handleUnhideCurrentPhoto}
        />
      )}

      {/* Delete Choice Confirmation Overlay */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative text-left">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Delete Media Item</h3>
                  <p className="text-[11px] text-slate-400">Choose deletion option</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed truncate">
              "<span className="font-semibold text-slate-100">{photo.title}</span>"
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleConfirmMoveToTrash}
                className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 flex items-center justify-between transition-all group text-left cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Trash (Recently Deleted)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Can be restored from Recently Deleted within 30 days</p>
                </div>
              </button>

              <button
                onClick={handleConfirmPermanentDelete}
                className="w-full p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 hover:border-rose-500/80 hover:bg-rose-950/60 flex items-center justify-between transition-all group text-left cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </div>
                  <p className="text-[10px] text-rose-300/70">Item will be permanently removed immediately</p>
                </div>
              </button>
            </div>

            <div className="pt-1 text-right">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const PhotoViewerInner: React.FC<PhotoLightboxProps & { photo: Photo }> = ({
  photo,
  photosList,
  onClose,
  onSelectPhoto,
  onToggleFavorite,
  onDeletePhoto,
  onUnhidePhoto,
  onOpenEditor,
  onAutoEnhance,
}) => {
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showFaceBoxes, setShowFaceBoxes] = useState(true);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  // Fullscreen, Photo Count & Other Options Toggle State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPhotoCount, setShowPhotoCount] = useState(true);
  const [showOtherOptions, setShowOtherOptions] = useState(false);

  // Reset secondary options when changing photos
  useEffect(() => {
    setShowOtherOptions(false);
  }, [photo?.id]);

  // Slide Animation Direction (-1 = prev, 1 = next)
  const [slideDirection, setSlideDirection] = useState<number>(1);

  // Samsung Minimal Video Player State
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const DEFAULT_FALLBACK_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  const [videoSrc, setVideoSrc] = useState<string>(
    photo?.videoUrl || photo?.highResUrl || "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
  );
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showVideoControls, setShowVideoControls] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const videoControlsTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const scrubberRef = React.useRef<HTMLDivElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  // Track swipe gesture state
  const [dragX, setDragX] = useState<number>(0);
  const [isDraggingTrack, setIsDraggingTrack] = useState<boolean>(false);
  const pointerStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsDraggingTrack(true);
    setDragX(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current || !isDraggingTrack) return;
    const deltaX = e.clientX - pointerStartRef.current.x;

    let effectiveX = deltaX;
    if ((currentIndex === 0 && deltaX > 0) || (currentIndex === photosList.length - 1 && deltaX < 0)) {
      effectiveX = deltaX * 0.25;
    }
    setDragX(effectiveX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const durationMs = Date.now() - pointerStartRef.current.time;
    pointerStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const deltaX = dragX;
    const threshold = Math.min(window.innerWidth * 0.2, 80);
    const isFlick = Math.abs(deltaX) > 35 && durationMs < 250;

    if ((deltaX < -threshold || (isFlick && deltaX < 0)) && currentIndex < photosList.length - 1) {
      handleNext();
    } else if ((deltaX > threshold || (isFlick && deltaX > 0)) && currentIndex > 0) {
      handlePrev();
    }

    setDragX(0);
    setIsDraggingTrack(false);
  };

  const currentIndex = photosList.findIndex((p) => p.id === photo.id);
  const prevPhoto = photosList.length > 1
    ? photosList[(currentIndex - 1 + photosList.length) % photosList.length]
    : null;
  const nextPhoto = photosList.length > 1
    ? photosList[(currentIndex + 1) % photosList.length]
    : null;

  const handleStageClick = () => {
    setShowOtherOptions((prev) => !prev);
    if (photo.isVideo) {
      setShowVideoControls((prev) => !prev);
    }
  };

  const handleScrubberSeek = (clientX: number) => {
    if (!scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newRatio = clickX / rect.width;
    const newTime = newRatio * (duration || 1);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleShare = async () => {
    const shareUrl = photo.highResUrl || photo.url;
    if (navigator.share) {
      try {
        await navigator.share({
          title: photo.title,
          text: `Check out "${photo.title}" on GalleyAR`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share unhandled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  };

  const handlePrev = () => {
    setSlideDirection(-1);
    if (currentIndex > 0) {
      onSelectPhoto(photosList[currentIndex - 1]);
    } else {
      onSelectPhoto(photosList[photosList.length - 1]);
    }
  };

  const handleNext = () => {
    setSlideDirection(1);
    if (currentIndex < photosList.length - 1) {
      onSelectPhoto(photosList[currentIndex + 1]);
    } else {
      onSelectPhoto(photosList[0]);
    }
  };

  const handleDeleteCurrentPhoto = () => {
    const photoToDeleteId = photo.id;
    const remaining = photosList.filter((p) => p.id !== photoToDeleteId);

    onDeletePhoto(photoToDeleteId);

    if (remaining.length === 0) {
      onClose();
    } else {
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      const nextPhoto = remaining[nextIndex];
      if (nextPhoto) {
        onSelectPhoto(nextPhoto);
      } else {
        onClose();
      }
    }
  };

  // Body scroll lock
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // 60fps smooth video scrubber position updates during video playback
  useEffect(() => {
    let animId: number;
    const syncTime = () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended && !isScrubbing) {
        setCurrentTime(videoRef.current.currentTime);
        animId = requestAnimationFrame(syncTime);
      }
    };

    if (photo?.isVideo && isPlaying && !isScrubbing) {
      animId = requestAnimationFrame(syncTime);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [photo?.isVideo, isPlaying, isScrubbing]);

  // Global event listeners for continuous smooth scrubbing anywhere on screen
  useEffect(() => {
    if (!isScrubbing) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX !== undefined) {
        handleScrubberSeek(clientX);
      }
    };

    const handleGlobalUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalMove);
    window.addEventListener("touchend", handleGlobalUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [isScrubbing]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "f" || e.key === "F") setIsFullscreen((prev) => !prev);
      if ((e.key === "Delete" || e.key === "Backspace") && !showOCRModal) {
        handleDeleteCurrentPhoto();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, photo, isFullscreen]);

  // Video Player Control Handlers
  const resetVideoControlsTimeout = () => {
    setShowVideoControls(true);
    if (videoControlsTimerRef.current) clearTimeout(videoControlsTimerRef.current);
    videoControlsTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowVideoControls(false);
      }
    }, 3000);
  };

  const attemptPlay = (forceMuted?: boolean) => {
    if (!videoRef.current) return;
    const playMuted = forceMuted !== undefined ? forceMuted : isMuted;
    videoRef.current.muted = playMuted;
    setIsMuted(playMuted);
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.log("Autoplay / play attempt info:", err?.message || "playback prevented");
          if (!playMuted && videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch((err2) => {
              console.log("Muted play attempt info:", err2?.message || "playback prevented");
              if (videoSrc !== DEFAULT_FALLBACK_VIDEO) {
                setVideoSrc(DEFAULT_FALLBACK_VIDEO);
              }
              setIsPlaying(false);
            });
          } else {
            if (videoSrc !== DEFAULT_FALLBACK_VIDEO) {
              setVideoSrc(DEFAULT_FALLBACK_VIDEO);
            }
            setIsPlaying(false);
          }
        });
    }
  };

  useEffect(() => {
    if (photo?.isVideo) {
      setVideoSrc(photo.videoUrl || photo.highResUrl || DEFAULT_FALLBACK_VIDEO);
      setVideoError(false);
      setCurrentTime(0);
      setShowVideoControls(true);
      resetVideoControlsTimeout();
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        attemptPlay(isMuted);
      }
    }
  }, [photo?.id]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      attemptPlay(isMuted);
      resetVideoControlsTimeout();
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowVideoControls(true);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    resetVideoControlsTimeout();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    resetVideoControlsTimeout();
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
    resetVideoControlsTimeout();
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Smooth video progress animation frame sync (60fps continuous dot movement)
  useEffect(() => {
    let animId: number;
    const syncTime = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
        animId = requestAnimationFrame(syncTime);
      }
    };
    if (isPlaying && photo?.isVideo) {
      animId = requestAnimationFrame(syncTime);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, photo?.id]);

  const handleProgressLineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newRatio = clickX / rect.width;
    const newTime = newRatio * (duration || 1);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    resetVideoControlsTimeout();
  };

  const handleCopyOCR = () => {
    if (photo.ocrText) {
      navigator.clipboard.writeText(photo.ocrText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden animate-fade-in select-none transition-colors duration-150"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        backgroundColor: "rgba(2, 6, 23, 0.95)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* Top Navigation Bar - Clean Default View */}
      <div className="z-20 px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer shrink-0"
            title="Close Full View"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-100 truncate">
              {photo.title}
            </h3>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>{photo.day}</span>
              <span>•</span>
              <span className="truncate">{photo.location?.name || "Location Unknown"}</span>
            </p>
          </div>
        </div>

        {/* Count Toggle & Control Bar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Photo Count Toggle Button */}
          <button
            onClick={() => setShowPhotoCount(!showPhotoCount)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
            title="Toggle Photo Count"
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

          {/* Fullscreen Mode Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Options Toggle Button */}
          <button
            onClick={() => setShowOtherOptions(!showOtherOptions)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showOtherOptions
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
            }`}
            title="Toggle Action Options"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Share Toast Notification */}
      {showShareToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-short">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Photo link copied to clipboard!</span>
        </div>
      )}

      {/* Main Lightbox Body (Center Image Track + Sidebar) */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={() => setShowOtherOptions((prev) => !prev)}
          className="flex-1 relative flex items-center justify-center select-none touch-none overflow-hidden cursor-pointer bg-black/40"
        >
          {/* Horizontal Track Element */}
          <div
            className="flex w-full h-full items-center"
            style={{
              transform: `translate3d(calc(-100% + ${dragX}px), 0, 0)`,
              transition: isDraggingTrack ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Slide 0: Previous Photo */}
            <div className="w-full h-full flex-shrink-0 flex items-center justify-center p-2 sm:p-6">
              {prevPhoto ? (
                <img
                  src={prevPhoto.highResUrl || prevPhoto.url}
                  alt={prevPhoto.title}
                  draggable={false}
                  className={`${
                    isFullscreen ? "max-h-[92vh]" : "max-h-[82vh]"
                  } max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800/80 pointer-events-none`}
                />
              ) : null}
            </div>

            {/* Slide 1: Current Active Photo */}
            <div className="w-full h-full flex-shrink-0 flex items-center justify-center p-2 sm:p-6 relative">
              <img
                src={photo.highResUrl || photo.url}
                alt={photo.title}
                draggable={false}
                className={`${
                  isFullscreen ? "max-h-[92vh]" : "max-h-[82vh]"
                } max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800/80 pointer-events-none`}
              />

              {/* Face Box Overlays */}
              {showFaceBoxes &&
                photo.people?.map((person, idx) => {
                  if (!person.faceBox) return null;
                  const { x, y, width, height } = person.faceBox;
                  return (
                    <div
                      key={idx}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                      }}
                      className="absolute border-2 border-indigo-400/90 rounded-xl bg-indigo-500/10 backdrop-blur-[1px] flex items-end justify-center pb-1 transition-all pointer-events-none shadow-md animate-pulse-subtle"
                    >
                      <span className="px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-200 text-[10px] font-bold border border-indigo-500/40">
                        {person.name}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Slide 2: Next Photo */}
            <div className="w-full h-full flex-shrink-0 flex items-center justify-center p-2 sm:p-6">
              {nextPhoto ? (
                <img
                  src={nextPhoto.highResUrl || nextPhoto.url}
                  alt={nextPhoto.title}
                  draggable={false}
                  className={`${
                    isFullscreen ? "max-h-[92vh]" : "max-h-[82vh]"
                  } max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800/80 pointer-events-none`}
                />
              ) : null}
            </div>
          </div>

          {/* Floating Action Toolbar (Revealed at Top on Screen / Photo / Video Tap) */}
          <MediaActionBar
            photo={photo}
            isVisible={showOtherOptions}
            onShare={handleShare}
            onToggleFavorite={onToggleFavorite}
            onOpenEditor={onOpenEditor}
            onDeletePhoto={handleDeleteCurrentPhoto}
            onUnhidePhoto={onUnhidePhoto}
            showInfoPanel={showInfoPanel}
            setShowInfoPanel={setShowInfoPanel}
            showOCRModal={showOCRModal}
            setShowOCRModal={setShowOCRModal}
          />

          {/* Subtle Hint Badge when Options are Hidden & Not Video */}
          {!showOtherOptions && !photo.isVideo && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity duration-300">
              <span className="px-3 py-1 rounded-full bg-slate-950/70 border border-slate-800/80 backdrop-blur-md text-[11px] font-medium text-slate-400 shadow-lg">
                Tap anywhere on screen to show options
              </span>
            </div>
          )}

          {/* Samsung Gallery Style Fixed Bottom Video Control Toggle (Perfect line & dot alignment, 60fps smooth dragging) */}
          {photo.isVideo && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`fixed bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] max-w-full flex flex-col gap-1 transition-all duration-300 z-40 pointer-events-auto select-none ${
                showVideoControls || !isPlaying
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none"
              }`}
            >
              {/* Perfect Continuous Line Track & Aligned Floating Handle Dot */}
              <div
                ref={scrubberRef}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsScrubbing(true);
                  handleScrubberSeek(e.clientX);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsScrubbing(true);
                  if (e.touches[0]) handleScrubberSeek(e.touches[0].clientX);
                }}
                className="relative w-full h-7 px-3 flex items-center cursor-pointer group/line select-none touch-none"
                title="Seek video timeline"
              >
                {/* Background Track Line */}
                <div className="w-full h-1.5 bg-white/30 group-hover/line:h-2 rounded-full overflow-hidden transition-all shadow-sm">
                  {/* Progress Fill */}
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100))}%`,
                    }}
                  />
                </div>

                {/* Moving Handle Dot (Mathematically aligned: calc(12px + (100% - 24px) * ratio) over the px-3 track line) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10"
                  style={{
                    left: `calc(12px + (100% - 24px) * ${Math.min(1, Math.max(0, currentTime / (duration || 1)))})`,
                  }}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md border-2 border-indigo-500 group-hover/line:scale-125 transition-transform" />
                </div>
              </div>

              {/* Controls Bar (Transparent background, pure text & icons) */}
              <div className="flex items-center justify-between gap-3 px-1 text-white drop-shadow-md">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 text-white fill-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                    title={isMuted ? "Unmute Audio" : "Mute Audio"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>

                  <span className="text-xs font-mono font-bold text-white tracking-wider drop-shadow ml-1">
                    {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={cyclePlaybackRate}
                    className="px-2 py-1 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 text-[11px] font-bold text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                    title="Playback Speed"
                  >
                    {playbackRate}x
                  </button>

                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                    title="Toggle Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Info / EXIF Inspector Panel (Desktop & Mobile Drawer) */}
        {showInfoPanel && (
          <>
            {/* Desktop Side Panel */}
            <div className="w-80 bg-slate-900/95 border-l border-slate-800 p-5 overflow-y-auto space-y-6 hidden md:block animate-fade-in shadow-2xl shrink-0">
              {/* Header info */}
              <div className="space-y-1 border-b border-slate-800/80 pb-4">
                <h4 className="text-base font-bold text-slate-100">{photo.title}</h4>
                <p className="text-xs text-slate-400">{photo.category} • {photo.fileSize}</p>
              </div>

              {/* Camera EXIF Details */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Camera EXIF Specs</span>
                </h5>

                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Camera</span>
                    <span className="text-slate-200 font-semibold">{photo.exif.camera}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lens</span>
                    <span className="text-slate-200 font-medium">{photo.exif.lens || "Main Lens"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aperture</span>
                    <span className="text-slate-200 font-medium">{photo.exif.aperture}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ISO Speed</span>
                    <span className="text-slate-200 font-medium">{photo.exif.iso}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shutter Speed</span>
                    <span className="text-slate-200 font-medium">{photo.exif.shutterSpeed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resolution</span>
                    <span className="text-slate-200 font-medium">{photo.resolution}</span>
                  </div>
                </div>
              </div>

              {/* Geotag Location Map snippet */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Location</span>
                </h5>

                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
                  <p className="text-xs font-bold text-slate-100">{photo.location.name}</p>
                  <p className="text-[11px] text-slate-400">{photo.location.city}, {photo.location.country}</p>
                  <div className="text-[10px] text-slate-500 font-mono pt-1">
                    GPS: {photo.location.lat.toFixed(4)}, {photo.location.lng.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* AI Tags & Face Clusters */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Smart Tags</span>
                </h5>

                <div className="flex flex-wrap gap-1.5">
                  {photo.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 text-[10px] font-medium border border-slate-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* OCR Extracted Text Box */}
              {photo.ocrText && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>OCR Extracted Text</span>
                    </span>
                    <button
                      onClick={handleCopyOCR}
                      className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                    >
                      {copiedText ? "Copied!" : "Copy All"}
                    </button>
                  </h5>

                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                    {photo.ocrText}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Bottom Sheet Drawer for Info Panel */}
            <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-slate-900 border-t border-slate-800 p-5 rounded-t-3xl max-h-[70vh] overflow-y-auto shadow-2xl space-y-5 animate-slide-up">
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

              {/* Camera EXIF Details */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Camera EXIF Specs</span>
                </h5>
                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Camera</span>
                    <span className="text-slate-200 font-semibold">{photo.exif.camera}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lens</span>
                    <span className="text-slate-200 font-medium">{photo.exif.lens || "Main Lens"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aperture</span>
                    <span className="text-slate-200 font-medium">{photo.exif.aperture}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ISO</span>
                    <span className="text-slate-200 font-medium">{photo.exif.iso}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resolution</span>
                    <span className="text-slate-200 font-medium">{photo.resolution}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Location</span>
                </h5>
                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-1 text-xs">
                  <p className="font-bold text-slate-100">{photo.location.name}</p>
                  <p className="text-slate-400">{photo.location.city}, {photo.location.country}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Smart Tags</span>
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {photo.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 text-[10px] font-medium border border-slate-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* OCR Copy Modal Popup */}
      {showOCRModal && photo.ocrText && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Extracted Text (OCR)</span>
              </h3>
              <button
                onClick={() => setShowOCRModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {photo.ocrText}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleCopyOCR}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? "Copied to Clipboard!" : "Copy Text"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

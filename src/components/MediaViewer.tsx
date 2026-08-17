import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MediaActionBar } from "./MediaActionBar";
import { UnifiedShareModal } from "./UnifiedShareModal";
import {
  X,
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
  RotateCw,
  Repeat,
  Maximize2,
  Minimize2,
  Loader2,
  MapPin,
  Camera,
  Sparkles,
  FileText,
  Copy,
  Check,
  Calendar,
} from "lucide-react";
import { Photo } from "../types";
import { haptics } from "../utils/haptics";

export interface MediaViewerProps {
  photo: Photo;
  photosList: Photo[];
  onClose: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onToggleFavorite: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onPermanentDelete?: (photoId: string) => void;
  onUnhidePhoto?: (photoId: string) => void;
  onOpenEditor?: (photo: Photo) => void;
  onAutoEnhance?: (photo: Photo) => void;
}

const DEFAULT_FALLBACK_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const GUTTER = 12; // 12px visual gap between adjacent media slots

type GestureState =
  | "NONE"
  | "HORIZONTAL_SWIPE"
  | "VERTICAL_DISMISS"
  | "PHOTO_PAN"
  | "PINCH_ZOOM";

export interface MediaViewerRef {
  handleBack: () => boolean;
}

export const MediaViewer = forwardRef<MediaViewerRef, MediaViewerProps>(({
  photo,
  photosList,
  onClose,
  onSelectPhoto,
  onToggleFavorite,
  onDeletePhoto,
  onPermanentDelete,
  onUnhidePhoto,
  onOpenEditor,
  onAutoEnhance,
}, ref) => {
  // Ordered media collection navigation indices
  const currentIndex = photosList.findIndex((p) => p.id === photo.id);
  const safeIndex = currentIndex !== -1 ? currentIndex : 0;
  const prevItem = safeIndex > 0 ? photosList[safeIndex - 1] : null;
  const nextItem = safeIndex < photosList.length - 1 ? photosList[safeIndex + 1] : null;

  // Viewport dimensions & DOM element references
  const [viewportSize, setViewportSize] = useState({
    vw: typeof window !== "undefined" ? window.innerWidth : 1000,
    vh: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mediaTrackRef = useRef<HTMLDivElement | null>(null);
  const currentSlotRef = useRef<HTMLDivElement | null>(null);
  const bgOverlayRef = useRef<HTMLDivElement | null>(null);

  // Overlay state & modals
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [showFaceBoxes, setShowFaceBoxes] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(null);
  const [showOverlayControls, setShowOverlayControls] = useState(true);

  // Auto-hide overlay controls during video playback after 4.5s of inactivity
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    if (photo.isVideo && showOverlayControls) {
      autoHideTimerRef.current = setTimeout(() => {
        // Do not auto-hide if any modal or drawer is open
        if (!showDeleteModal && !showOCRModal && !showInfoPanel && !showOtherOptions) {
          setShowOverlayControls(false);
        }
      }, 4500);
    }
  }, [photo.isVideo, showOverlayControls, showDeleteModal, showOCRModal, showInfoPanel, showOtherOptions]);

  useEffect(() => {
    resetAutoHideTimer();
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [resetAutoHideTimer]);

  // Photo zoom & pan state
  const [photoScale, setPhotoScale] = useState(1);
  const [photoPan, setPhotoPan] = useState({ x: 0, y: 0 });
  const photoScaleRef = useRef(1);
  const photoPanRef = useRef({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (showDeleteModal) {
        setShowDeleteModal(false);
        return true;
      }
      if (showOCRModal) {
        setShowOCRModal(false);
        return true;
      }
      if (showInfoPanel) {
        setShowInfoPanel(false);
        return true;
      }
      if (showOtherOptions) {
        setShowOtherOptions(false);
        return true;
      }
      if (photoScale > 1.05) {
        setPhotoScale(1);
        setPhotoPan({ x: 0, y: 0 });
        return true;
      }
      onClose();
      return true;
    },
  }));

  useEffect(() => {
    photoScaleRef.current = photoScale;
  }, [photoScale]);

  useEffect(() => {
    photoPanRef.current = photoPan;
  }, [photoPan]);

  // Reset zoom, pan & gesture state when active media changes
  useEffect(() => {
    setPhotoScale(1);
    setPhotoPan({ x: 0, y: 0 });
    setShowOtherOptions(false);
    pointerStartRef.current = null;
    gestureStateRef.current = "NONE";
    dragXRef.current = 0;
    dragYRef.current = 0;
    isAnimatingRef.current = false;
    activePointersRef.current.clear();
  }, [photo.id]);

  // Responsive Viewport Resize Observer
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        vw: window.innerWidth,
        vh: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Gesture Engine Refs
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    pointerId: number;
  } | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  const gestureStateRef = useRef<GestureState>("NONE");
  const dragXRef = useRef<number>(0);
  const dragYRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);

  // Haptics Tracking Flags
  const hasTriggeredSwipeHapticRef = useRef<boolean>(false);
  const hasTriggeredDismissHapticRef = useRef<boolean>(false);
  const hasTriggeredEdgeResistanceRef = useRef<boolean>(false);

  // Preload adjacent image resources
  useEffect(() => {
    if (prevItem && !prevItem.isVideo) {
      const img = new Image();
      img.src = prevItem.highResUrl || prevItem.url;
    }
    if (nextItem && !nextItem.isVideo) {
      const img = new Image();
      img.src = nextItem.highResUrl || nextItem.url;
    }
  }, [photo.id, prevItem?.id, nextItem?.id]);

  // Navigation handlers for next/previous
  const handlePrev = useCallback(() => {
    if (safeIndex > 0 && !isAnimatingRef.current) {
      const vw = window.innerWidth;
      const step = vw + GUTTER;
      if (mediaTrackRef.current) {
        isAnimatingRef.current = true;
        mediaTrackRef.current.style.transition =
          "transform 260ms cubic-bezier(0.2, 0, 0.2, 1)";
        mediaTrackRef.current.style.transform = `translate3d(${step}px, 0, 0)`;
        setTimeout(() => {
          if (mediaTrackRef.current) {
            mediaTrackRef.current.style.transition = "none";
            mediaTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
          }
          dragXRef.current = 0;
          isAnimatingRef.current = false;
          onSelectPhoto(photosList[safeIndex - 1]);
        }, 260);
      } else {
        onSelectPhoto(photosList[safeIndex - 1]);
      }
    }
  }, [safeIndex, photosList, onSelectPhoto]);

  const handleNext = useCallback(() => {
    if (safeIndex < photosList.length - 1 && !isAnimatingRef.current) {
      const vw = window.innerWidth;
      const step = vw + GUTTER;
      if (mediaTrackRef.current) {
        isAnimatingRef.current = true;
        mediaTrackRef.current.style.transition =
          "transform 260ms cubic-bezier(0.2, 0, 0.2, 1)";
        mediaTrackRef.current.style.transform = `translate3d(${-step}px, 0, 0)`;
        setTimeout(() => {
          if (mediaTrackRef.current) {
            mediaTrackRef.current.style.transition = "none";
            mediaTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
          }
          dragXRef.current = 0;
          isAnimatingRef.current = false;
          onSelectPhoto(photosList[safeIndex + 1]);
        }, 260);
      } else {
        onSelectPhoto(photosList[safeIndex + 1]);
      }
    }
  }, [safeIndex, photosList, onSelectPhoto]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showDeleteModal || showOCRModal) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "f" || e.key === "F") {
        onToggleFavorite(photo.id);
      } else if (e.key === "s" || e.key === "S") {
        setShowShareModal(true);
      } else if (e.key === "i" || e.key === "I") {
        setShowInfoPanel((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onClose,
    handlePrev,
    handleNext,
    onToggleFavorite,
    photo.id,
    showDeleteModal,
    showOCRModal,
  ]);

  // Pointer Gesture Engine
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isAnimatingRef.current) return;

    // Do not capture gestures if clicking interactive buttons, inputs, links, or specific controls
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest(
        "button, a, input, select, textarea, [role='button'], .no-gesture, .interactive, [data-interactive='true']"
      )
    ) {
      pointerStartRef.current = null;
      gestureStateRef.current = "NONE";
      dragXRef.current = 0;
      dragYRef.current = 0;
      return;
    }

    // Do not capture if modals or info drawer are open
    if (showDeleteModal || showOCRModal || showInfoPanel) {
      pointerStartRef.current = null;
      gestureStateRef.current = "NONE";
      return;
    }

    // Preserve system edge back gesture (< 16px)
    if (e.clientX < 16 || e.clientX > window.innerWidth - 16) {
      pointerStartRef.current = null;
      gestureStateRef.current = "NONE";
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored for non-pointer capture environments
    }

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      // Pinch gesture initialization
      const points: { x: number; y: number }[] = Array.from(
        activePointersRef.current.values()
      );
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      initialPinchDistRef.current = dist;
      initialScaleRef.current = photoScaleRef.current;
      gestureStateRef.current = "PINCH_ZOOM";
      return;
    }

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      pointerId: e.pointerId,
    };
    gestureStateRef.current = "NONE";
    dragXRef.current = 0;
    dragYRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Handle Pinch Zoom
    if (
      activePointersRef.current.size === 2 &&
      initialPinchDistRef.current &&
      !photo.isVideo
    ) {
      const points: { x: number; y: number }[] = Array.from(
        activePointersRef.current.values()
      );
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const ratio = dist / initialPinchDistRef.current;
      const newScale = Math.min(Math.max(1, initialScaleRef.current * ratio), 4.5);
      setPhotoScale(newScale);
      if (newScale <= 1.05) {
        setPhotoPan({ x: 0, y: 0 });
      }
      return;
    }

    // Must have a valid start pointer matching this pointer ID
    if (
      !pointerStartRef.current ||
      pointerStartRef.current.pointerId !== e.pointerId ||
      isAnimatingRef.current
    ) {
      return;
    }

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Classify gesture axis if not locked yet (> 10px threshold)
    if (gestureStateRef.current === "NONE") {
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        if (!photo.isVideo && photoScaleRef.current > 1.05) {
          gestureStateRef.current = "PHOTO_PAN";
        } else if (absDx >= absDy * 1.05) {
          gestureStateRef.current = "HORIZONTAL_SWIPE";
        } else if (absDy > absDx * 1.05) {
          gestureStateRef.current = "VERTICAL_DISMISS";
        }
      }
    }

    // Execute locked gesture
    if (gestureStateRef.current === "HORIZONTAL_SWIPE") {
      let effectiveX = dx;
      const isBoundary =
        (safeIndex === 0 && dx > 0) ||
        (safeIndex === photosList.length - 1 && dx < 0);

      if (isBoundary) {
        effectiveX = dx * 0.28; // Subtle rubber-band resistance
        if (!hasTriggeredEdgeResistanceRef.current && Math.abs(dx) > 15) {
          haptics.warning();
          hasTriggeredEdgeResistanceRef.current = true;
        }
      } else {
        const threshold = Math.min(100, window.innerWidth * 0.16);
        if (!hasTriggeredSwipeHapticRef.current && Math.abs(dx) > threshold) {
          haptics.light();
          hasTriggeredSwipeHapticRef.current = true;
        } else if (
          hasTriggeredSwipeHapticRef.current &&
          Math.abs(dx) < threshold * 0.5
        ) {
          hasTriggeredSwipeHapticRef.current = false;
        }
      }

      dragXRef.current = effectiveX;
      if (mediaTrackRef.current) {
        mediaTrackRef.current.style.transition = "none";
        mediaTrackRef.current.style.transform = `translate3d(${effectiveX}px, 0, 0)`;
      }
    } else if (gestureStateRef.current === "VERTICAL_DISMISS") {
      setShowOverlayControls(false);
      dragYRef.current = dy;
      const absY = Math.abs(dy);
      const threshold = window.innerHeight * 0.18;

      if (!hasTriggeredDismissHapticRef.current && absY > threshold) {
        haptics.light();
        hasTriggeredDismissHapticRef.current = true;
      } else if (
        hasTriggeredDismissHapticRef.current &&
        absY < threshold * 0.5
      ) {
        hasTriggeredDismissHapticRef.current = false;
      }

      // Move current media slot vertically
      if (currentSlotRef.current) {
        currentSlotRef.current.style.transition = "none";
        currentSlotRef.current.style.transform = `translate3d(0, ${dy}px, 0)`;
      }
      // Fade backdrop opacity in response to vertical distance
      if (bgOverlayRef.current) {
        const vh = window.innerHeight;
        const opacity = Math.max(0.1, 1 - absY / (vh * 0.55));
        bgOverlayRef.current.style.opacity = String(opacity);
      }
    } else if (gestureStateRef.current === "PHOTO_PAN") {
      const currentPan = photoPanRef.current;
      const currentScale = photoScaleRef.current;
      const maxPanX = Math.max(0, (currentScale - 1) * (window.innerWidth * 0.45));
      const maxPanY = Math.max(0, (currentScale - 1) * (window.innerHeight * 0.45));

      const newX = Math.min(maxPanX, Math.max(-maxPanX, currentPan.x + dx * 0.8));
      const newY = Math.min(maxPanY, Math.max(-maxPanY, currentPan.y + dy * 0.8));

      setPhotoPan({
        x: newX,
        y: newY,
      });
      pointerStartRef.current.x = e.clientX;
      pointerStartRef.current.y = e.clientY;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }

    if (activePointersRef.current.size < 2) {
      initialPinchDistRef.current = null;
    }

    const start = pointerStartRef.current;
    if (!start || start.pointerId !== e.pointerId) {
      pointerStartRef.current = null;
      gestureStateRef.current = "NONE";
      dragXRef.current = 0;
      dragYRef.current = 0;
      return;
    }

    const duration = Date.now() - start.time;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const step = vw + GUTTER;

    const totalDx = Math.abs(e.clientX - start.x);
    const totalDy = Math.abs(e.clientY - start.y);
    const totalDist = Math.hypot(totalDx, totalDy);

    if (gestureStateRef.current === "HORIZONTAL_SWIPE") {
      const dx = dragXRef.current;
      const velocity = Math.abs(dx) / Math.max(1, duration);
      const isFlick = velocity > 0.20 && Math.abs(dx) > 20;
      const threshold = Math.min(90, vw * 0.15);

      if (
        (dx < -threshold || (isFlick && dx < 0)) &&
        safeIndex < photosList.length - 1
      ) {
        // Navigate to Next item
        haptics.selection();
        isAnimatingRef.current = true;
        if (mediaTrackRef.current) {
          mediaTrackRef.current.style.transition =
            "transform 250ms cubic-bezier(0.2, 0, 0.2, 1)";
          mediaTrackRef.current.style.transform = `translate3d(${-step}px, 0, 0)`;
        }
        setTimeout(() => {
          if (mediaTrackRef.current) {
            mediaTrackRef.current.style.transition = "none";
            mediaTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
          }
          dragXRef.current = 0;
          isAnimatingRef.current = false;
          onSelectPhoto(photosList[safeIndex + 1]);
        }, 250);
      } else if ((dx > threshold || (isFlick && dx > 0)) && safeIndex > 0) {
        // Navigate to Previous item
        haptics.selection();
        isAnimatingRef.current = true;
        if (mediaTrackRef.current) {
          mediaTrackRef.current.style.transition =
            "transform 250ms cubic-bezier(0.2, 0, 0.2, 1)";
          mediaTrackRef.current.style.transform = `translate3d(${step}px, 0, 0)`;
        }
        setTimeout(() => {
          if (mediaTrackRef.current) {
            mediaTrackRef.current.style.transition = "none";
            mediaTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
          }
          dragXRef.current = 0;
          isAnimatingRef.current = false;
          onSelectPhoto(photosList[safeIndex - 1]);
        }, 250);
      } else {
        // Cancelled swipe: spring back to center
        isAnimatingRef.current = true;
        if (mediaTrackRef.current) {
          mediaTrackRef.current.style.transition = "transform 200ms ease-out";
          mediaTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
        }
        setTimeout(() => {
          dragXRef.current = 0;
          isAnimatingRef.current = false;
        }, 200);
      }
    } else if (gestureStateRef.current === "VERTICAL_DISMISS") {
      const dy = dragYRef.current;
      const absY = Math.abs(dy);
      const verticalVelocity = absY / Math.max(1, duration);
      const isVerticalFlick = verticalVelocity > 0.32 && absY > 40;
      const minDismissThreshold = Math.min(140, vh * 0.18);
      const isIntentionalDismiss = absY >= minDismissThreshold || isVerticalFlick;

      if (isIntentionalDismiss) {
        // Confirm Dismissal
        haptics.light();
        isAnimatingRef.current = true;
        const exitY = dy >= 0 ? vh : -vh;
        if (currentSlotRef.current) {
          currentSlotRef.current.style.transition = "transform 220ms ease-out";
          currentSlotRef.current.style.transform = `translate3d(0, ${exitY}px, 0)`;
        }
        if (bgOverlayRef.current) {
          bgOverlayRef.current.style.transition = "opacity 220ms ease-out";
          bgOverlayRef.current.style.opacity = "0";
        }
        setTimeout(() => {
          onClose();
        }, 220);
      } else {
        // Cancelled dismissal: return to center
        isAnimatingRef.current = true;
        if (currentSlotRef.current) {
          currentSlotRef.current.style.transition = "transform 200ms ease-out";
          currentSlotRef.current.style.transform = "translate3d(0, 0, 0)";
        }
        if (bgOverlayRef.current) {
          bgOverlayRef.current.style.transition = "opacity 200ms ease-out";
          bgOverlayRef.current.style.opacity = "1";
        }
        setTimeout(() => {
          dragYRef.current = 0;
          isAnimatingRef.current = false;
          setShowOverlayControls(true);
        }, 200);
      }
    } else if (gestureStateRef.current === "NONE" || totalDist < 16) {
      // Tap or small touch movement: Toggle overlay controls without exiting viewer
      if (currentSlotRef.current) {
        currentSlotRef.current.style.transition = "transform 150ms ease-out";
        currentSlotRef.current.style.transform = "translate3d(0, 0, 0)";
      }
      if (mediaTrackRef.current) {
        mediaTrackRef.current.style.transition = "transform 150ms ease-out";
        mediaTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
      }
      if (bgOverlayRef.current) {
        bgOverlayRef.current.style.transition = "opacity 150ms ease-out";
        bgOverlayRef.current.style.opacity = "1";
      }
      setShowOverlayControls((prev) => !prev);
    }

    // Reset gesture flags & state refs
    hasTriggeredSwipeHapticRef.current = false;
    hasTriggeredDismissHapticRef.current = false;
    hasTriggeredEdgeResistanceRef.current = false;

    pointerStartRef.current = null;
    gestureStateRef.current = "NONE";
    dragXRef.current = 0;
    dragYRef.current = 0;
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);
    pointerStartRef.current = null;
    gestureStateRef.current = "NONE";
    dragXRef.current = 0;
    dragYRef.current = 0;
    isAnimatingRef.current = false;

    if (currentSlotRef.current) {
      currentSlotRef.current.style.transition = "transform 150ms ease-out";
      currentSlotRef.current.style.transform = "translate3d(0, 0, 0)";
    }
    if (mediaTrackRef.current) {
      mediaTrackRef.current.style.transition = "transform 150ms ease-out";
      mediaTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
    }
    if (bgOverlayRef.current) {
      bgOverlayRef.current.style.transition = "opacity 150ms ease-out";
      bgOverlayRef.current.style.opacity = "1";
    }
  };

  // Double tap to zoom photo
  const handlePhotoDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoScale > 1.05) {
      setPhotoScale(1);
      setPhotoPan({ x: 0, y: 0 });
    } else {
      setPhotoScale(2.5);
    }
  };

  const handleShare = () => {
    haptics.selection();
    setShowShareModal(true);
  };

  const handleConfirmMoveToTrash = () => {
    const photoToDeleteId = photo.id;
    const remaining = photosList.filter((p) => p.id !== photoToDeleteId);

    onDeletePhoto(photoToDeleteId);
    setShowDeleteModal(false);

    if (remaining.length === 0) {
      onClose();
    } else {
      const nextIdx = Math.min(safeIndex, remaining.length - 1);
      const nextP = remaining[nextIdx];
      if (nextP) onSelectPhoto(nextP);
      else onClose();
    }
  };

  const handleConfirmPermanentDelete = () => {
    const photoToDeleteId = photo.id;
    const remaining = photosList.filter((p) => p.id !== photoToDeleteId);

    if (onPermanentDelete) {
      onPermanentDelete(photoToDeleteId);
    } else {
      onDeletePhoto(photoToDeleteId);
    }
    setShowDeleteModal(false);

    if (remaining.length === 0) {
      onClose();
    } else {
      const nextIdx = Math.min(safeIndex, remaining.length - 1);
      const nextP = remaining[nextIdx];
      if (nextP) onSelectPhoto(nextP);
      else onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] select-none touch-none overflow-hidden font-sans">
      {/* Dark Backdrop */}
      <div
        ref={bgOverlayRef}
        className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl z-0 pointer-events-none"
      />

      {/* Viewport Gesture Area */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* 3-Slot Horizontal Media Track with 12px Gutter Spacing */}
        <div
          ref={mediaTrackRef}
          className="flex flex-row h-full absolute top-0 will-change-transform"
          style={{
            width: `calc(300% + ${GUTTER * 2}px)`,
            left: `calc(-100% - ${GUTTER}px)`,
            gap: `${GUTTER}px`,
            transform: "translate3d(0px, 0, 0)",
          }}
        >
          {/* Slot 0: Previous Item */}
          <div
            className="h-full flex items-center justify-center shrink-0 relative overflow-hidden"
            style={{ width: `calc((100% - ${GUTTER * 2}px) / 3)` }}
            key={prevItem ? prevItem.id : "empty-prev"}
          >
            {prevItem && <MediaSlotItem photo={prevItem} isActive={false} />}
          </div>

          {/* Slot 1: Active Current Item */}
          <div
            ref={currentSlotRef}
            className="h-full flex items-center justify-center shrink-0 relative overflow-hidden"
            style={{ width: `calc((100% - ${GUTTER * 2}px) / 3)` }}
            key={photo.id}
          >
            <MediaSlotItem
              photo={photo}
              isActive={true}
              scale={photoScale}
              pan={photoPan}
              onDoubleTap={handlePhotoDoubleTap}
              showFaceBoxes={showFaceBoxes}
              showOtherOptions={showOtherOptions}
              setShowOtherOptions={setShowOtherOptions}
              showOverlayControls={showOverlayControls}
              onToggleOverlayControls={() => setShowOverlayControls((prev) => !prev)}
            />
          </div>

          {/* Slot 2: Next Item */}
          <div
            className="h-full flex items-center justify-center shrink-0 relative overflow-hidden"
            style={{ width: `calc((100% - ${GUTTER * 2}px) / 3)` }}
            key={nextItem ? nextItem.id : "empty-next"}
          >
            {nextItem && <MediaSlotItem photo={nextItem} isActive={false} />}
          </div>
        </div>
      </div>

      {/* Header Overlay Controls */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={`absolute top-0 left-0 right-0 z-30 p-2.5 sm:p-4 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-slate-950/95 via-slate-950/60 to-transparent transition-opacity duration-150 ${
          showOverlayControls
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
            title="Close Viewer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="hidden md:block text-left">
            <h2 className="text-sm font-bold text-slate-100 truncate max-w-[120px] lg:max-w-xs">
              {photo.title}
            </h2>
            <p className="text-[11px] text-slate-400">
              {photo.date || "GalleyAR Item"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Index Counter */}
          <span className="px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-semibold shadow-md whitespace-nowrap">
            {safeIndex + 1} / {photosList.length}
          </span>

          {/* Action Bar inside Header */}
          <MediaActionBar
            photo={photo}
            isVisible={showOverlayControls}
            onShare={handleShare}
            onToggleFavorite={onToggleFavorite}
            onOpenEditor={onOpenEditor}
            onAutoEnhance={onAutoEnhance}
            onDeletePhoto={() => setShowDeleteModal(true)}
            onUnhidePhoto={onUnhidePhoto}
            showInfoPanel={showInfoPanel}
            setShowInfoPanel={setShowInfoPanel}
            showOCRModal={showOCRModal}
            setShowOCRModal={setShowOCRModal}
          />
        </div>
      </div>

      {/* Desktop Chevron Left / Right Buttons */}
      {safeIndex > 0 && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className={`hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-900/70 hover:bg-slate-800 border border-slate-700/80 text-white backdrop-blur-md shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer ${
            showOverlayControls
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          title="Previous Item"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {safeIndex < photosList.length - 1 && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className={`hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-900/70 hover:bg-slate-800 border border-slate-700/80 text-white backdrop-blur-md shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer ${
            showOverlayControls
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          title="Next Item"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Share Toast Notice */}
      {shareToastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-full bg-slate-900 border border-sky-500/50 text-sky-300 text-xs font-bold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2 pointer-events-none">
          <Share2 className="w-3.5 h-3.5 text-sky-400" />
          <span>{shareToastMessage}</span>
        </div>
      )}

      {/* Unified Share Modal Sheet */}
      <UnifiedShareModal
        isOpen={showShareModal}
        photo={photo}
        onClose={() => setShowShareModal(false)}
        onShowToast={(msg) => {
          setShareToastMessage(msg);
          setTimeout(() => setShareToastMessage(null), 3000);
        }}
      />

      {/* EXIF Info Panel Sidebar Drawer */}
      <AnimatePresence>
        {showInfoPanel && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-96 bg-slate-950/95 border-l border-slate-800/90 backdrop-blur-2xl p-6 overflow-y-auto space-y-6 text-slate-100 text-left shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Media Details</h3>
              </div>
              <button
                onClick={() => setShowInfoPanel(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Metadata */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                General Info
              </h4>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400">File Name</p>
                  <p className="text-xs font-semibold text-slate-200 break-all">
                    {photo.title || "Untitled Media"}
                  </p>
                </div>
                {photo.date && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      {(() => {
                        try {
                          const d = new Date(photo.date);
                          if (!isNaN(d.getTime())) {
                            return d.toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          }
                          return photo.date;
                        } catch {
                          return photo.date;
                        }
                      })()}
                    </span>
                  </div>
                )}
                {photo.fileSize && photo.fileSize !== "Unknown" && (
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="text-slate-400">File Size:</span>
                    <span className="font-medium">{photo.fileSize}</span>
                  </div>
                )}
                {photo.location && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>
                      {typeof photo.location === "object"
                        ? [photo.location.name, photo.location.city, photo.location.country]
                            .filter(Boolean)
                            .join(", ")
                        : String(photo.location)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Camera / EXIF Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Camera / Device
              </h4>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Device:</span>
                  <span className="font-medium">
                    {photo.camera || photo.exif?.camera || "Not available"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Resolution:</span>
                  <span className="font-medium">
                    {photo.resolution || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="font-medium">
                    {photo.isVideo ? (photo.duration ? `Video (${photo.duration})` : "Video") : "Photo"}
                  </span>
                </div>
                {photo.exif?.aperture && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Aperture:</span>
                    <span className="font-medium">{photo.exif.aperture}</span>
                  </div>
                )}
                {photo.exif?.iso && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">ISO:</span>
                    <span className="font-medium">{photo.exif.iso}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags & Recognition */}
            {photo.tags && photo.tags.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tags & Objects
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {photo.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {photo.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Description
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  {photo.description}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative text-left">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Delete Media Item
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Choose deletion option
                  </p>
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
              "
              <span className="font-semibold text-slate-100">
                {photo.title}
              </span>
              "
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
                  <p className="text-[10px] text-slate-400">
                    Can be restored within 30 days
                  </p>
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
                  <p className="text-[10px] text-rose-300/70">
                    Will be permanently removed immediately
                  </p>
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

      {/* OCR Text Extract Modal */}
      {showOCRModal && photo.ocrText && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Extracted Text (OCR)
                </h3>
              </div>
              <button
                onClick={() => setShowOCRModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-60 overflow-y-auto text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap select-text">
              {photo.ocrText}
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400">
                Recognized text from image
              </span>
              <button
                onClick={() => {
                  if (photo.ocrText && navigator.clipboard) {
                    navigator.clipboard.writeText(photo.ocrText).catch(() => {});
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2000);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                {copiedText ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

/* Individual Media Slot Renderer */
interface MediaSlotItemProps {
  photo: Photo;
  isActive: boolean;
  scale?: number;
  pan?: { x: number; y: number };
  onDoubleTap?: (e: React.MouseEvent) => void;
  showFaceBoxes?: boolean;
  showOtherOptions?: boolean;
  setShowOtherOptions?: React.Dispatch<React.SetStateAction<boolean>>;
  showOverlayControls?: boolean;
  onToggleOverlayControls?: () => void;
}

const MediaSlotItem: React.FC<MediaSlotItemProps> = ({
  photo,
  isActive,
  scale = 1,
  pan = { x: 0, y: 0 },
  onDoubleTap,
  showFaceBoxes,
  showOverlayControls = true,
  onToggleOverlayControls,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasVideoError, setHasVideoError] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  const [videoUrl, setVideoUrl] = useState<string>(
    photo.videoUrl || photo.highResUrl || DEFAULT_FALLBACK_VIDEO
  );

  // Image load & error state
  const [imgSrc, setImgSrc] = useState<string>(photo.highResUrl || photo.url);
  const [isImgLoading, setIsImgLoading] = useState<boolean>(true);
  const [hasImgError, setHasImgError] = useState<boolean>(false);

  useEffect(() => {
    setVideoUrl(photo.videoUrl || photo.highResUrl || DEFAULT_FALLBACK_VIDEO);
    setHasVideoError(false);
    setIsLoading(true);

    setImgSrc(photo.highResUrl || photo.url);
    setIsImgLoading(true);
    setHasImgError(false);
  }, [photo.id, photo.highResUrl, photo.url, photo.videoUrl]);

  // Manage Active Video Playback
  useEffect(() => {
    if (photo.isVideo) {
      if (isActive) {
        setIsPlaying(true);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
      } else {
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
    }
  }, [isActive, photo.isVideo]);

  const togglePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    haptics.selection();
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSkipBack = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    haptics.light();
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleSkipForward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    haptics.light();
    videoRef.current.currentTime = Math.min(duration || 0, videoRef.current.currentTime + 10);
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleScrubberSeek = (clientX: number) => {
    if (!scrubberRef.current || !videoRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const newTime = ratio * (duration || 1);
    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  };

  const handleScrubberPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsScrubbing(true);
    handleScrubberSeek(e.clientX);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleScrubberPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    handleScrubberSeek(e.clientX);
  };

  const handleScrubberPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    setIsScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    haptics.selection();
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

  const toggleLoop = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    haptics.selection();
    setIsLooping((prev) => {
      const next = !prev;
      if (videoRef.current) videoRef.current.loop = next;
      return next;
    });
  };

  const cyclePlaybackRate = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    haptics.selection();
    const rates = [0.5, 1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) videoRef.current.playbackRate = nextRate;
  };

  const handleToggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    haptics.selection();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (photo.isVideo) {
    const progressPercent = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

    return (
      <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden">
        {!hasVideoError ? (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            loop={isLooping}
            muted={isMuted}
            preload={isActive ? "auto" : "metadata"}
            onTimeUpdate={() => {
              if (videoRef.current && !isScrubbing) setCurrentTime(videoRef.current.currentTime);
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
                setIsLoading(false);
              }
            }}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
            onError={() => {
              if (videoUrl !== DEFAULT_FALLBACK_VIDEO) {
                setVideoUrl(DEFAULT_FALLBACK_VIDEO);
              } else {
                setHasVideoError(true);
                setIsLoading(false);
              }
            }}
            className="max-h-full max-w-full object-contain pointer-events-none shadow-2xl select-none touch-none"
          />
        ) : (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3 max-w-sm">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 w-fit mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-200">Video Preview Unavailable</p>
            <p className="text-xs text-slate-400">The video file could not be loaded on this device.</p>
            <button
              onClick={() => {
                setHasVideoError(false);
                setIsLoading(true);
                setVideoUrl(photo.videoUrl || DEFAULT_FALLBACK_VIDEO);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && isActive && !hasVideoError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-4 rounded-full bg-slate-900/80 backdrop-blur-md text-indigo-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          </div>
        )}

        {/* Video Overlay Controls & Action Toggles */}
        {isActive && !hasVideoError && (
          <div
            className={`absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 transition-all duration-200 pointer-events-none ${
              showOverlayControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Center Big Play/Pause Toggle with 10s Skip Buttons */}
            <div className="flex-1 flex items-center justify-center gap-6 sm:gap-10">
              {/* Skip Back 10s */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={handleSkipBack}
                className="p-3.5 sm:p-4 rounded-full bg-slate-900/75 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 backdrop-blur-xl shadow-xl transform transition-all hover:scale-110 active:scale-90 pointer-events-auto cursor-pointer group flex items-center justify-center"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-active:-rotate-45" />
              </button>

              {/* Main Play / Pause Button */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={togglePlayPause}
                className="p-5 sm:p-6 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/50 backdrop-blur-xl shadow-2xl shadow-indigo-600/40 transform transition-all hover:scale-110 active:scale-95 pointer-events-auto cursor-pointer flex items-center justify-center"
                title={isPlaying ? "Pause Video" : "Play Video"}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-white" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
                )}
              </button>

              {/* Skip Forward 10s */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={handleSkipForward}
                className="p-3.5 sm:p-4 rounded-full bg-slate-900/75 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 backdrop-blur-xl shadow-xl transform transition-all hover:scale-110 active:scale-90 pointer-events-auto cursor-pointer group flex items-center justify-center"
                title="Forward 10 seconds"
              >
                <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-active:rotate-45" />
              </button>
            </div>

            {/* Bottom Scrubber & Video Controls Bar */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-950/90 border border-slate-800/90 backdrop-blur-2xl p-3 sm:p-4 rounded-2xl space-y-3 pointer-events-auto shadow-2xl max-w-2xl mx-auto w-full"
            >
              {/* Interactive Progress Scrubber */}
              <div
                ref={scrubberRef}
                onPointerDown={handleScrubberPointerDown}
                onPointerMove={handleScrubberPointerMove}
                onPointerUp={handleScrubberPointerUp}
                onPointerCancel={handleScrubberPointerUp}
                className="relative w-full h-4 bg-slate-900/50 rounded-full cursor-pointer flex items-center group py-1"
              >
                <div className="relative w-full h-1.5 group-hover:h-2 bg-slate-800 rounded-full overflow-hidden transition-all">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-sky-400 rounded-full"
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>
                {/* Scrubber thumb circle */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-indigo-600 transition-transform pointer-events-none group-hover:scale-125"
                  style={{
                    left: `calc(${progressPercent}% - 7px)`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-200">
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <button
                    onClick={togglePlayPause}
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-800 text-slate-100 cursor-pointer transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                  </button>

                  <button
                    onClick={handleSkipBack}
                    className="hidden xs:flex p-1.5 sm:p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
                    title="Rewind 10s"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleSkipForward}
                    className="hidden xs:flex p-1.5 sm:p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
                    title="Forward 10s"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>

                  <span className="font-mono text-[11px] text-slate-300 ml-1">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Loop Toggle */}
                  <button
                    onClick={toggleLoop}
                    className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer ${
                      isLooping
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                    title={isLooping ? "Looping enabled" : "Looping disabled"}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </button>

                  {/* Playback speed switcher */}
                  <button
                    onClick={cyclePlaybackRate}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-indigo-300 cursor-pointer transition-all hover:scale-105 active:scale-95"
                    title="Change speed"
                  >
                    {playbackRate}x
                  </button>

                  {/* Fullscreen Toggle */}
                  <button
                    onClick={handleToggleFullscreen}
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Photo Item
  return (
    <div
      onDoubleClick={onDoubleTap}
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
    >
      <div
        className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-100 ease-out"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
        }}
      >
        {!hasImgError ? (
          <img
            src={imgSrc}
            alt={photo.title}
            draggable={false}
            onLoad={() => setIsImgLoading(false)}
            onError={() => {
              if (imgSrc !== photo.url && photo.url) {
                setImgSrc(photo.url);
              } else {
                setHasImgError(true);
                setIsImgLoading(false);
              }
            }}
            className="max-h-full max-w-full object-contain shadow-2xl pointer-events-none"
          />
        ) : (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3 max-w-sm pointer-events-auto">
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-200">Unable to Load Image</p>
            <p className="text-xs text-slate-400">The image file or high-res preview could not be rendered.</p>
            <button
              onClick={() => {
                setHasImgError(false);
                setIsImgLoading(true);
                setImgSrc(photo.url || photo.highResUrl);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
            >
              Retry Image
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isImgLoading && !hasImgError && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-3.5 rounded-full bg-slate-900/80 backdrop-blur-md text-indigo-400 shadow-xl">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          </div>
        )}

        {/* Facial Recognition Boxes */}
        {isActive &&
          !hasImgError &&
          showFaceBoxes &&
          photo.faces &&
          photo.faces.map((face) => {
            const leftVal = face.x ?? face.faceBox?.x ?? 0;
            const topVal = face.y ?? face.faceBox?.y ?? 0;
            const widthVal = face.width ?? face.faceBox?.width ?? 0;
            const heightVal = face.height ?? face.faceBox?.height ?? 0;
            return (
              <div
                key={face.id}
                className="absolute border-2 border-indigo-400/90 bg-indigo-500/10 rounded-2xl pointer-events-auto transition-all hover:border-indigo-300 group cursor-pointer"
                style={{
                  left: `${leftVal}%`,
                  top: `${topVal}%`,
                  width: `${widthVal}%`,
                  height: `${heightVal}%`,
                }}
              >
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-500/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {face.name || "Person"}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

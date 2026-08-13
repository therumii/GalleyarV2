import React, { useState, useRef, useEffect } from "react";
import {
  Heart,
  Play,
  CheckCircle,
  MapPin,
  Sparkles,
  Maximize2,
  Share2,
  Check,
} from "lucide-react";
import { Photo, GridDensity, TimelineZoom, SortByOption, SortOrderOption } from "../types";
import { haptics } from "../utils/haptics";

interface TimelineGridProps {
  photos: Photo[];
  gridDensity: GridDensity;
  timelineZoom: TimelineZoom;
  columnCount?: number;
  onChangeColumnCount?: (count: number) => void;
  selectedPhotoIds: string[];
  onToggleSelectPhoto: (photoId: string) => void;
  onOpenPhoto: (photo: Photo) => void;
  onToggleFavorite: (photoId: string, e: React.MouseEvent) => void;
  sortBy?: SortByOption;
  sortOrder?: SortOrderOption;
}

interface PhotoGridItemProps {
  photo: Photo;
  isSelected: boolean;
  columnCount: number;
  hasSelectionMode: boolean;
  onToggleSelectPhoto: (photoId: string) => void;
  onOpenPhoto: (photo: Photo) => void;
  onToggleFavorite: (photoId: string, e: React.MouseEvent) => void;
  onSharePhoto: (photo: Photo, e: React.MouseEvent) => void;
}

const PhotoGridItem: React.FC<PhotoGridItemProps> = ({
  photo,
  isSelected,
  columnCount,
  hasSelectionMode,
  onToggleSelectPhoto,
  onOpenPhoto,
  onToggleFavorite,
  onSharePhoto,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const DEFAULT_FALLBACK_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  const [videoSrc, setVideoSrc] = useState<string>(photo.videoUrl || photo.highResUrl || DEFAULT_FALLBACK_VIDEO);
  const [hasVideoError, setHasVideoError] = useState<boolean>(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const startHold = (clientX: number, clientY: number) => {
    isHoldRef.current = false;
    startPosRef.current = { x: clientX, y: clientY };
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      isHoldRef.current = true;
      if (hasSelectionMode) {
        onOpenPhoto(photo);
      } else {
        onToggleSelectPhoto(photo.id);
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 420);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startPosRef.current) {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > 8 || dy > 8) {
        cancelHold();
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isHoldRef.current) {
      isHoldRef.current = false;
      return;
    }
    if (hasSelectionMode) {
      haptics.selection();
      onToggleSelectPhoto(photo.id);
    } else {
      onOpenPhoto(photo);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={(e) => startHold(e.clientX, e.clientY)}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onClick={handleClick}
      className={`group relative overflow-hidden bg-slate-900 border transition-all duration-300 cursor-pointer aspect-square ${
        columnCount >= 6 ? "rounded-lg" : "rounded-2xl"
      } ${
        isSelected
          ? "ring-2 ring-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/20 scale-[0.98]"
          : "border-slate-800/80 hover:border-slate-600 hover:shadow-xl hover:-translate-y-0.5"
      }`}
    >
      {/* Selection Checkbox Badge */}
      {(hasSelectionMode || isSelected) && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            haptics.selection();
            onToggleSelectPhoto(photo.id);
          }}
          className="absolute top-2 left-2 z-20 p-0.5 rounded-full bg-slate-950/80 border border-slate-700/80 backdrop-blur-md cursor-pointer"
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/80 text-slate-400 border border-slate-600"
            }`}
          >
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        </div>
      )}
      {photo.isVideo && isHovered && !hasVideoError ? (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          onError={() => {
            if (videoSrc !== DEFAULT_FALLBACK_VIDEO) {
              setVideoSrc(DEFAULT_FALLBACK_VIDEO);
            } else {
              setHasVideoError(true);
            }
          }}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <img
          src={photo.url}
          alt={photo.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none select-none"
        />
      )}

      {/* Top Badges Bar (Share on Hover) */}
      {columnCount <= 6 && (
        <div className="absolute top-1.5 right-1.5 flex items-center justify-end pointer-events-none z-10">
          <div className="pointer-events-auto">
            <button
              onClick={(e) => onSharePhoto(photo, e)}
              className="p-1 rounded-full bg-slate-950/70 hover:bg-slate-900 backdrop-blur-md text-slate-300 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              title="Share Photo"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Video Badge */}
      {photo.isVideo && (
        <>
          <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md text-[10px] font-bold text-slate-100 flex items-center gap-1 border border-slate-700/60 shadow-lg pointer-events-none z-10">
            <Play className="w-3 h-3 fill-indigo-400 text-indigo-400" />
            <span>{photo.duration || "0:15"}</span>
          </div>

          {/* Center Play Button Overlay on Hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <div className="w-10 h-10 rounded-full bg-slate-950/80 border border-indigo-500/50 backdrop-blur-md flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
            </div>
          </div>
        </>
      )}

      {/* Hover Overlay Title */}
      {columnCount <= 5 && (
        <div
          className={`absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end pointer-events-none z-10 ${
            photo.isVideo ? "pl-14" : ""
          }`}
        >
          <p className="text-xs font-semibold text-slate-100 truncate">
            {photo.title}
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            {photo.location?.name}
          </p>
        </div>
      )}
    </div>
  );
};

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  photos = [],
  gridDensity,
  timelineZoom,
  columnCount: externalColumnCount,
  onChangeColumnCount,
  selectedPhotoIds = [],
  onToggleSelectPhoto,
  onOpenPhoto,
  onToggleFavorite,
  sortBy = "date",
  sortOrder = "desc",
}) => {
  const [internalColumnCount, setInternalColumnCount] = useState<number>(
    gridDensity === "compact" ? 5 : gridDensity === "comfort" ? 4 : 3
  );

  const activeColumnCount = externalColumnCount !== undefined ? externalColumnCount : internalColumnCount;

  const setColumnCount = (updater: number | ((prev: number) => number)) => {
    const nextVal = typeof updater === "function" ? updater(activeColumnCount) : updater;
    const clamped = Math.max(2, Math.min(8, nextVal));
    if (onChangeColumnCount) {
      onChangeColumnCount(clamped);
    } else {
      setInternalColumnCount(clamped);
    }
  };

  const initialPinchDistance = useRef<number | null>(null);
  const [showPinchToast, setShowPinchToast] = useState<boolean>(false);
  const [shareToastText, setShareToastText] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleSharePhoto = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = photo.highResUrl || photo.url;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: photo.title,
          text: `Check out "${photo.title}" on GalleyAR`,
          url: url,
        })
        .catch(() => {});
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
      setShareToastText(`Copied link for "${photo.title}"`);
      setTimeout(() => setShareToastText(null), 2500);
    }
  };

  const triggerToast = () => {
    setShowPinchToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setShowPinchToast(false);
    }, 1500);
  };

  // Pinch gesture handlers for Touch screens
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = currentDist - initialPinchDistance.current;

      const threshold = 32;

      if (delta > threshold) {
        // Pinch Out (spread fingers) -> Zoom In -> Fewer columns (2-8)
        setColumnCount((prev) => {
          const next = Math.max(2, prev - 1);
          if (next !== prev) triggerToast();
          return next;
        });
        initialPinchDistance.current = currentDist;
      } else if (delta < -threshold) {
        // Pinch In (squeeze fingers) -> Zoom Out -> More columns (2-8)
        setColumnCount((prev) => {
          const next = Math.min(8, prev + 1);
          if (next !== prev) triggerToast();
          return next;
        });
        initialPinchDistance.current = currentDist;
      }
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistance.current = null;
  };

  // Trackpad / Wheel Pinch Zoom
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setColumnCount((prev) => {
            const next = Math.max(2, prev - 1);
            if (next !== prev) triggerToast();
            return next;
          });
        } else if (e.deltaY > 0) {
          setColumnCount((prev) => {
            const next = Math.min(8, prev + 1);
            if (next !== prev) triggerToast();
            return next;
          });
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Group photos according to sorted order:
  const getGroupedPhotos = () => {
    // Deduplicate photos by ID while preserving input array sort order
    const uniqueMap = new Map<string, Photo>();
    photos.forEach((p) => {
      if (p && p.id && !uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, p);
      }
    });
    const uniquePhotos = Array.from(uniqueMap.values());

    if (uniquePhotos.length === 0) return [];

    if (timelineZoom === "all") {
      return [{ groupKey: "All Media", locationSub: `${uniquePhotos.length} Media Items`, photos: uniquePhotos }];
    }

    if (sortBy === "title") {
      // Group photos in dictionary form by starting character
      const groups: { groupKey: string; locationSub: string; photos: Photo[] }[] = [];
      const groupMap = new Map<string, { locationSub: string; photos: Photo[] }>();

      uniquePhotos.forEach((photo) => {
        const titleTrimmed = (photo.title || "").trim();
        const firstChar = titleTrimmed ? titleTrimmed[0].toUpperCase() : "#";
        const isLetter = /^[A-Z]$/.test(firstChar);
        const groupKey = isLetter ? firstChar : "#";
        const locationSub = "Dictionary Index • Alphabetical";

        let existing = groupMap.get(groupKey);
        if (!existing) {
          existing = { locationSub, photos: [] };
          groupMap.set(groupKey, existing);
          groups.push({ groupKey, locationSub, photos: existing.photos });
        }
        existing.photos.push(photo);
      });

      return groups;
    }

    if (sortBy === "category") {
      const groups: { groupKey: string; locationSub: string; photos: Photo[] }[] = [];
      const groupMap = new Map<string, { locationSub: string; photos: Photo[] }>();

      uniquePhotos.forEach((photo) => {
        const groupKey = photo.category || "General";
        const locationSub = "Category Collection";

        let existing = groupMap.get(groupKey);
        if (!existing) {
          existing = { locationSub, photos: [] };
          groupMap.set(groupKey, existing);
          groups.push({ groupKey, locationSub, photos: existing.photos });
        }
        existing.photos.push(photo);
      });

      return groups;
    }

    if (sortBy === "fileSize") {
      return [{ groupKey: "Sorted by File Size", locationSub: `${uniquePhotos.length} Media Items`, photos: uniquePhotos }];
    }

    // Default: Sort by Date Taken
    let groupingMode: "days" | "months" | "years" = "days";
    if (timelineZoom && (timelineZoom === "years" || timelineZoom === "months" || timelineZoom === "days")) {
      groupingMode = timelineZoom;
    } else if (activeColumnCount >= 7) {
      groupingMode = "years";
    } else if (activeColumnCount === 5 || activeColumnCount === 6) {
      groupingMode = "months";
    }

    const groups: { groupKey: string; locationSub: string; photos: Photo[] }[] = [];
    const groupMap = new Map<string, { locationSub: string; photos: Photo[] }>();

    uniquePhotos.forEach((photo) => {
      let groupKey = photo.day || "Recent";
      let locationSub = photo.location?.city
        ? `${photo.location.city}, ${photo.location.country}`
        : "Photos";

      if (groupingMode === "years") {
        groupKey = photo.year ? `Year ${photo.year}` : "Yearly View";
        locationSub = "Memories & Yearly Highlights";
      } else if (groupingMode === "months") {
        groupKey = photo.month ? photo.month : "Monthly View";
        locationSub = `${photo.year || ""} Monthly Collection`;
      } else {
        if (photo.day) {
          groupKey = photo.day;
        } else if (photo.date) {
          const parsed = new Date(photo.date);
          if (!isNaN(parsed.getTime())) {
            groupKey = parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          } else {
            groupKey = "Date View";
          }
        } else {
          groupKey = "Date View";
        }
      }

      let existing = groupMap.get(groupKey);
      if (!existing) {
        existing = { locationSub, photos: [] };
        groupMap.set(groupKey, existing);
        groups.push({ groupKey, locationSub, photos: existing.photos });
      }
      existing.photos.push(photo);
    });

    return groups;
  };

  const getToastLabel = (cols: number) => {
    if (cols >= 7) return `${cols} Columns Grid • Yearly View`;
    if (cols === 5 || cols === 6) return `${cols} Columns Grid • Monthly View`;
    return `${cols} Columns Grid • Date-wise View`;
  };

  const grouped = getGroupedPhotos();

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
          <Sparkles className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-base font-bold text-slate-200">No Photos or Videos Found</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Try clearing search filters or upload your own media to build your gallery!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={gridContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="p-3 sm:p-6 space-y-6 relative pb-24 touch-pan-y select-none"
    >
      {/* Pinch Zoom Floating Toast Indicator */}
      {showPinchToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-slate-900/95 border border-indigo-500/50 text-indigo-300 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <Maximize2 className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>{getToastLabel(activeColumnCount)}</span>
        </div>
      )}

      {/* Share Toast Notification */}
      {shareToastText && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900 border border-sky-500/50 text-sky-200 text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-bounce-short">
          <Check className="w-4 h-4 text-sky-400" />
          <span>{shareToastText}</span>
        </div>
      )}

      {grouped.map((group, groupIdx) => (
        <div key={groupIdx} className="flex flex-col gap-3 mb-8">
          {/* Timeline Group Header (Normal document flow, clean spacing, no overlap) */}
          <div className="py-2.5 px-4 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight shrink-0">
                {group.groupKey}
              </h3>
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="truncate">{group.locationSub}</span>
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
              {group.photos.length} item{group.photos.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Photo Grid with Dynamic Columns (2 - 8 Columns) */}
          <div
            className="grid transition-all duration-300"
            style={{
              gridTemplateColumns: `repeat(${activeColumnCount}, minmax(0, 1fr))`,
              gap:
                gridDensity === "compact"
                  ? activeColumnCount >= 7
                    ? "3px"
                    : activeColumnCount >= 5
                    ? "6px"
                    : "8px"
                  : activeColumnCount >= 7
                  ? "6px"
                  : activeColumnCount >= 5
                  ? "12px"
                  : "16px",
            }}
          >
            {group.photos.map((photo) => (
              <PhotoGridItem
                key={photo.id}
                photo={photo}
                isSelected={selectedPhotoIds.includes(photo.id)}
                columnCount={activeColumnCount}
                hasSelectionMode={selectedPhotoIds.length > 0}
                onToggleSelectPhoto={onToggleSelectPhoto}
                onOpenPhoto={onOpenPhoto}
                onToggleFavorite={onToggleFavorite}
                onSharePhoto={handleSharePhoto}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};


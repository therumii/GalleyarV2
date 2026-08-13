import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCheck, Folder, Heart, Plus, Share2, Trash2, X } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Header, HeaderRef } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { TimelineGrid } from "./components/TimelineGrid";
import { AlbumsView, AlbumsViewRef } from "./components/AlbumsView";
import { MemoriesView, MemoriesViewRef } from "./components/MemoriesView";
import { PeopleView, PeopleViewRef } from "./components/PeopleView";
import { PlacesMapView, PlacesMapViewRef } from "./components/PlacesMapView";
import { PhotoLightbox } from "./components/PhotoLightbox";
import { PhotoEditorModal, PhotoEditorRef } from "./components/PhotoEditorModal";
import { VideoEditorModal, VideoEditorRef } from "./components/VideoEditorModal";
import { UploadModal } from "./components/UploadModal";
import { HiddenVaultModal, HiddenVaultRef } from "./components/HiddenVaultModal";
import { MediaViewerRef } from "./components/MediaViewer";
import { TrashView } from "./components/TrashView";
import { AddToAlbumVaultModal } from "./components/AddToAlbumVaultModal";
import { BatchShareModal } from "./components/BatchShareModal";

import {
  Photo,
  Album,
  PersonCluster,
  MemoryStory,
  ViewMode,
  NavState,
  TimelineZoom,
  GridDensity,
  SortByOption,
  SortOrderOption,
} from "./types";
import {
  INITIAL_PHOTOS,
  INITIAL_ALBUMS,
  INITIAL_PEOPLE,
  INITIAL_STORIES,
} from "./data/initialPhotos";
import { searchPhotosWithAI } from "./services/api";

export default function App() {
  // Main Photos State with local persistence fallback
  const [photos, setPhotos] = useState<Photo[]>(() => {
    try {
      const saved = localStorage.getItem("galleyar_photos_db") || localStorage.getItem("lumina_photos_db");
      return saved ? JSON.parse(saved) : INITIAL_PHOTOS;
    } catch {
      return INITIAL_PHOTOS;
    }
  });

  const [albums, setAlbums] = useState<Album[]>(INITIAL_ALBUMS);
  const [people, setPeople] = useState<PersonCluster[]>(INITIAL_PEOPLE);
  const [stories, setStories] = useState<MemoryStory[]>(INITIAL_STORIES);

  // Navigation & View State
  const [navState, setNavState] = useState<NavState>({
    view: "photos",
    albumId: null,
    personId: null,
    storyId: null,
    city: null,
    activePhotoId: null,
    activeEditorId: null,
    isSettingsOpen: false,
  });

  const navHistoryRef = useRef<NavState[]>([]);

  const currentView = navState.view;

  const navigateTo = useCallback(
    (target: Partial<NavState>, scopedList?: Photo[] | null) => {
      setNavState((current) => {
        const nextView = target.view !== undefined ? target.view : current.view;
        const isViewChanging = nextView !== current.view;

        const nextState: NavState = {
          view: nextView,
          albumId:
            target.albumId !== undefined
              ? target.albumId
              : isViewChanging
              ? null
              : current.albumId,
          personId:
            target.personId !== undefined
              ? target.personId
              : isViewChanging
              ? null
              : current.personId,
          storyId:
            target.storyId !== undefined
              ? target.storyId
              : isViewChanging
              ? null
              : current.storyId,
          city:
            target.city !== undefined
              ? target.city
              : isViewChanging
              ? null
              : current.city,
          activePhotoId:
            target.activePhotoId !== undefined
              ? target.activePhotoId
              : isViewChanging
              ? null
              : current.activePhotoId,
          activeEditorId:
            target.activeEditorId !== undefined
              ? target.activeEditorId
              : isViewChanging
              ? null
              : current.activeEditorId,
          isSettingsOpen:
            target.isSettingsOpen !== undefined
              ? target.isSettingsOpen
              : isViewChanging
              ? false
              : current.isSettingsOpen,
        };

        const isSameState =
          current.view === nextState.view &&
          (current.albumId || null) === (nextState.albumId || null) &&
          (current.personId || null) === (nextState.personId || null) &&
          (current.storyId || null) === (nextState.storyId || null) &&
          (current.city || null) === (nextState.city || null) &&
          (current.activePhotoId || null) === (nextState.activePhotoId || null) &&
          (current.activeEditorId || null) === (nextState.activeEditorId || null) &&
          Boolean(current.isSettingsOpen) === Boolean(nextState.isSettingsOpen);

        if (isSameState) return current;

        // If navigating to root Home Screen ("photos" with no sub-filter), clear navigation stack
        const isTargetRootHome =
          nextState.view === "photos" &&
          !nextState.albumId &&
          !nextState.personId &&
          !nextState.storyId &&
          !nextState.city &&
          !nextState.activePhotoId &&
          !nextState.activeEditorId;

        if (isTargetRootHome) {
          navHistoryRef.current = [];
        } else {
          navHistoryRef.current.push({ ...current });
          try {
            window.history.pushState(
              { navDepth: navHistoryRef.current.length },
              ""
            );
          } catch {}
        }

        if (scopedList !== undefined) {
          setActiveLightboxList(scopedList);
        }

        setMatchedPhotoIds(null);
        setSearchQuery("");

        return nextState;
      });
    },
    []
  );

  const handleSelectPhotoInViewer = useCallback((photo: Photo) => {
    setNavState((current) => ({
      ...current,
      activePhotoId: photo.id,
    }));
  }, []);

  const [timelineZoom, setTimelineZoom] = useState<TimelineZoom>("days");

  // Grid Density State & Persistence
  const [gridDensity, setGridDensity] = useState<GridDensity>(() => {
    try {
      return (localStorage.getItem("galleyar_grid_density") as GridDensity) || "comfort";
    } catch {
      return "comfort";
    }
  });

  const [columnCount, setColumnCount] = useState<number>(() => {
    return gridDensity === "compact" ? 5 : 4;
  });

  // Sorting Preferences State
  const [sortBy, setSortBy] = useState<SortByOption>(() => {
    try {
      return (localStorage.getItem("galleyar_sort_by") as SortByOption) || "date";
    } catch {
      return "date";
    }
  });

  const [sortOrder, setSortOrder] = useState<SortOrderOption>(() => {
    try {
      return (localStorage.getItem("galleyar_sort_order") as SortOrderOption) || "desc";
    } catch {
      return "desc";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("galleyar_sort_by", sortBy);
      localStorage.setItem("galleyar_sort_order", sortOrder);
      localStorage.setItem("galleyar_grid_density", gridDensity);
    } catch {}
  }, [sortBy, sortOrder, gridDensity]);

  const handleGridDensityChange = (newDensity: GridDensity) => {
    setGridDensity(newDensity);
    if (newDensity === "compact") {
      setColumnCount(5);
    } else {
      setColumnCount(4);
    }
  };

  const handleColumnCountChange = (newCount: number) => {
    const clamped = Math.max(2, Math.min(8, newCount));
    setColumnCount(clamped);
    if (clamped >= 7) {
      setTimelineZoom("years");
    } else if (clamped === 5 || clamped === 6) {
      setTimelineZoom("months");
    } else {
      setTimelineZoom("days");
    }
  };

  const handleTimelineZoomChange = (zoom: TimelineZoom) => {
    setTimelineZoom(zoom);
    if (zoom === "years") {
      setColumnCount(7);
    } else if (zoom === "months") {
      setColumnCount(5);
    } else if (zoom === "days") {
      setColumnCount(4);
    }
  };

  // Navigation & Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAlbumOpened, setIsAlbumOpened] = useState(false);
  const [showAddToAlbumModal, setShowAddToAlbumModal] = useState(false);
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [batchToastNotice, setBatchToastNotice] = useState<string | null>(null);

  // Reset album opened state when switching main views
  useEffect(() => {
    if (currentView !== "albums") {
      setIsAlbumOpened(false);
    }
  }, [currentView]);

  // Lock background body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [sidebarOpen]);

  // Swipe gesture for main tab switching & left-to-right sidebar menu trigger
  const MAIN_TABS: ViewMode[] = [
    "photos",
    "videos",
    "albums",
    "memories",
  ];
  const [tabDragStart, setTabDragStart] = useState<{ x: number; y: number } | null>(
    null
  );

  const activeLightboxPhoto = useMemo(() => {
    return navState.activePhotoId
      ? photos.find((p) => p.id === navState.activePhotoId) || null
      : null;
  }, [navState.activePhotoId, photos]);

  const activeEditorPhoto = useMemo(() => {
    return navState.activeEditorId
      ? photos.find((p) => p.id === navState.activeEditorId) || null
      : null;
  }, [navState.activeEditorId, photos]);

  const handleTabTouchStart = (e: React.TouchEvent) => {
    // Disable section switching gesture if an album is opened or modals are active
    if (
      e.touches.length === 1 &&
      !activeLightboxPhoto &&
      !activeEditorPhoto &&
      !showUploadModal &&
      !isAlbumOpened
    ) {
      setTabDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTabTouchEnd = (e: React.TouchEvent) => {
    if (
      !tabDragStart ||
      activeLightboxPhoto ||
      activeEditorPhoto ||
      showUploadModal ||
      isAlbumOpened
    ) {
      setTabDragStart(null);
      return;
    }
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = tabDragStart.x - endX;
    const deltaY = tabDragStart.y - endY;

    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && Math.abs(deltaX) > 35) {
      if (deltaX < -35) {
        // Swiped Right (Finger moved Left-to-Right)
        if (sidebarOpen) {
          // Already open
        } else if (currentView === "photos") {
          // Swipe right in photos section opens sidebar
          setSidebarOpen(true);
        } else {
          // In other sections, swiping right navigates to previous tab
          const currentIdx = MAIN_TABS.indexOf(currentView);
          if (currentIdx > 0) {
            navigateTo({ view: MAIN_TABS[currentIdx - 1] });
          }
        }
      } else if (deltaX > 35) {
        // Swiped Left (Finger moved Right-to-Left)
        if (sidebarOpen) {
          // Swipe left closes sidebar
          setSidebarOpen(false);
        } else {
          // Swiped left when sidebar is closed -> Next Tab
          const currentIdx = MAIN_TABS.indexOf(currentView);
          if (currentIdx !== -1 && currentIdx < MAIN_TABS.length - 1) {
            navigateTo({ view: MAIN_TABS[currentIdx + 1] });
          }
        }
      }
    }
    setTabDragStart(null);
  };

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isAISearching, setIsAISearching] = useState(false);
  const [matchedPhotoIds, setMatchedPhotoIds] = useState<string[] | null>(null);

  // Selection & Lightbox Modals
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [activeLightboxList, setActiveLightboxList] = useState<Photo[] | null>(
    null
  );

  // Dialog Modals
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Child Component References for Back Navigation
  const headerRef = useRef<HeaderRef>(null);
  const mediaViewerRef = useRef<MediaViewerRef>(null);
  const photoEditorRef = useRef<PhotoEditorRef>(null);
  const videoEditorRef = useRef<VideoEditorRef>(null);
  const hiddenVaultRef = useRef<HiddenVaultRef>(null);
  const albumsViewRef = useRef<AlbumsViewRef>(null);
  const peopleViewRef = useRef<PeopleViewRef>(null);
  const memoriesViewRef = useRef<MemoriesViewRef>(null);
  const placesMapViewRef = useRef<PlacesMapViewRef>(null);

  const lastBackTimestampRef = useRef<number>(0);
  const prevHasOverlayRef = useRef<boolean>(false);

  // Centralized Back Navigation Logic
  const handleGlobalBack = useCallback(
    (options?: { isPopState?: boolean }) => {
      const now = Date.now();
      if (now - lastBackTimestampRef.current < 80) {
        return true; // Ignore rapid duplicate triggers within 80ms
      }
      lastBackTimestampRef.current = now;

      // 1. Editor Modals (Unsaved changes prompt / editor exit)
      if (navState.activeEditorId) {
        const editorPhoto = photos.find((p) => p.id === navState.activeEditorId);
        if (editorPhoto?.isVideo) {
          if (videoEditorRef.current?.handleBack()) return true;
        } else {
          if (photoEditorRef.current?.handleBack()) return true;
        }
      }

      // 2. Lightbox / Media Viewer
      if (navState.activePhotoId) {
        if (mediaViewerRef.current?.handleBack()) return true;
      }

      // 3. App-level Modals
      if (showUploadModal) {
        setShowUploadModal(false);
        return true;
      }
      if (showAddToAlbumModal) {
        setShowAddToAlbumModal(false);
        return true;
      }
      if (showBatchShareModal) {
        setShowBatchShareModal(false);
        return true;
      }

      // 4. Batch Selection Mode in Gallery
      if (selectedPhotoIds.length > 0) {
        setSelectedPhotoIds([]);
        return true;
      }

      // 5. Header Modals / Search Expansion
      if (headerRef.current?.hasOpenModal()) {
        headerRef.current.closeOpenModal();
        return true;
      }

      // 6. View-specific sub-modals / active sub-views
      if (currentView === "hidden" && hiddenVaultRef.current) {
        if (hiddenVaultRef.current.handleBack()) return true;
      }
      if (currentView === "albums" && albumsViewRef.current) {
        if (albumsViewRef.current.handleBack()) return true;
      }
      if (currentView === "people" && peopleViewRef.current) {
        if (peopleViewRef.current.handleBack()) return true;
      }
      if (currentView === "memories" && memoriesViewRef.current) {
        if (memoriesViewRef.current.handleBack()) return true;
      }
      if (currentView === "places" && placesMapViewRef.current) {
        if (placesMapViewRef.current.handleBack()) return true;
      }

      // 7. Sidebar Drawer
      if (sidebarOpen) {
        setSidebarOpen(false);
        return true;
      }

      // 8. Search Filter Active
      if (matchedPhotoIds !== null || searchQuery.trim().length > 0) {
        setMatchedPhotoIds(null);
        setSearchQuery("");
        return true;
      }

      // Check if we are currently at the Root Home Screen ("photos" with no album/person/story/city filter)
      const isCurrentlyAtRootHome =
        currentView === "photos" &&
        !navState.albumId &&
        !navState.personId &&
        !navState.storyId &&
        !navState.city &&
        !navState.isSettingsOpen;

      if (isCurrentlyAtRootHome) {
        // Clear stack and return false so mobile back button closes/exits the app naturally
        navHistoryRef.current = [];
        return false;
      }

      // 9. Navigation History Stack Pop (for other views like albums/memories)
      if (navHistoryRef.current.length > 0) {
        const previousState = navHistoryRef.current.pop();
        if (previousState) {
          setNavState(previousState);
          if (!options?.isPopState) {
            try {
              window.history.back();
            } catch {}
          }
          return true;
        }
      }

      // 10. Fallback to Root "photos" View
      if (
        currentView !== "photos" ||
        navState.albumId ||
        navState.personId ||
        navState.storyId ||
        navState.city ||
        navState.isSettingsOpen
      ) {
        setNavState({
          view: "photos",
          albumId: null,
          personId: null,
          storyId: null,
          city: null,
          activePhotoId: null,
          activeEditorId: null,
          isSettingsOpen: false,
        });
        navHistoryRef.current = [];
        return true;
      }

      return false;
    },
    [
      navState,
      photos,
      showUploadModal,
      showAddToAlbumModal,
      showBatchShareModal,
      selectedPhotoIds.length,
      currentView,
      sidebarOpen,
      matchedPhotoIds,
      searchQuery,
    ]
  );

  // Sync history stack for Android Back Gesture & PopState
  useEffect(() => {
    const hasOverlayState =
      Boolean(navState.activeEditorId) ||
      Boolean(navState.activePhotoId) ||
      showUploadModal ||
      showAddToAlbumModal ||
      showBatchShareModal ||
      selectedPhotoIds.length > 0 ||
      sidebarOpen ||
      currentView !== "photos" ||
      isAlbumOpened;

    if (hasOverlayState && !prevHasOverlayRef.current) {
      try {
        window.history.pushState({ galleyarDepth: Date.now() }, "");
      } catch {}
    }
    prevHasOverlayRef.current = hasOverlayState;
  }, [
    Boolean(navState.activeEditorId),
    Boolean(navState.activePhotoId),
    showUploadModal,
    showAddToAlbumModal,
    showBatchShareModal,
    selectedPhotoIds.length > 0,
    sidebarOpen,
    currentView,
    isAlbumOpened,
  ]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleGlobalBack({ isPopState: true });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleGlobalBack();
      }
    };

    // Native Android Capacitor App backButton listener support
    const setupCapacitorBackButton = async () => {
      try {
        const capacitor = (window as any).Capacitor;
        if (capacitor && capacitor.Plugins && capacitor.Plugins.App) {
          capacitor.Plugins.App.addListener("backButton", () => {
            const handled = handleGlobalBack();
            if (!handled && capacitor.Plugins.App.minimizeApp) {
              capacitor.Plugins.App.minimizeApp();
            }
          });
        }
      } catch (err) {}
    };

    setupCapacitorBackButton();

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleGlobalBack]);

  // Save photos to local storage on change safely with quota fallback
  useEffect(() => {
    try {
      localStorage.setItem("galleyar_photos_db", JSON.stringify(photos));
    } catch (err) {
      console.warn("localStorage quota exceeded while saving photos:", err);
      try {
        const lightweight = photos.map((p) => {
          let highRes = p.highResUrl;
          let mainUrl = p.url;
          if (highRes && highRes.startsWith("data:") && highRes.length > 50000) {
            highRes = mainUrl && !mainUrl.startsWith("data:") ? mainUrl : "";
          }
          if (mainUrl && mainUrl.startsWith("data:") && mainUrl.length > 50000) {
            mainUrl = "";
          }
          return {
            ...p,
            highResUrl: highRes,
            url: mainUrl || p.url,
          };
        });
        localStorage.setItem("galleyar_photos_db", JSON.stringify(lightweight));
      } catch {
        // Silently catch quota error so React state works seamlessly in memory
      }
    }
  }, [photos]);

  // Photo Filtering & Sorting based on view, search, and sort preferences
  const rawFilteredPhotos = photos.filter((p) => {
    if (p.isTrash && currentView !== "trash") return false;
    if (p.isHidden && currentView !== "hidden") return false;

    if (currentView === "trash") return p.isTrash;
    if (currentView === "hidden") return p.isHidden;

    if (matchedPhotoIds !== null) {
      return matchedPhotoIds.includes(p.id);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.location?.name && p.location.name.toLowerCase().includes(q)) ||
        (p.location?.city && p.location.city.toLowerCase().includes(q)) ||
        (p.location?.country && p.location.country.toLowerCase().includes(q)) ||
        (p.date && p.date.toLowerCase().includes(q)) ||
        (p.year && p.year.toString().includes(q)) ||
        (p.month && p.month.toLowerCase().includes(q)) ||
        (p.day && p.day.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
        (p.people && p.people.some((pe) => pe.name?.toLowerCase().includes(q))) ||
        (p.ocrText && p.ocrText.toLowerCase().includes(q)) ||
        (p.exif?.camera && p.exif.camera.toLowerCase().includes(q))
      );
    }

    return true;
  });

  // Deduplicate by ID to guarantee photos never appear twice in photos/videos view
  const uniquePhotoMap = new Map<string, Photo>();
  rawFilteredPhotos.forEach((p) => {
    if (!uniquePhotoMap.has(p.id)) {
      uniquePhotoMap.set(p.id, p);
    }
  });

  const getPhotoTimestamp = (p: Photo): number => {
    if (p.date) {
      const parsed = Date.parse(p.date);
      if (!isNaN(parsed)) return parsed;
    }
    if (p.year) {
      return new Date(p.year, 0, 1).getTime();
    }
    return 0;
  };

  const visiblePhotos = Array.from(uniquePhotoMap.values()).sort((a, b) => {
    let comparison = 0;
    if (sortBy === "date") {
      const timeA = getPhotoTimestamp(a);
      const timeB = getPhotoTimestamp(b);
      comparison = timeA - timeB;
      // Secondary sort by title if timestamps match
      if (comparison === 0) {
        comparison = (a.title || "").localeCompare(b.title || "", undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
    } else if (sortBy === "title") {
      // Natural alphanumeric dictionary form sort
      comparison = (a.title || "").localeCompare(b.title || "", undefined, {
        numeric: true,
        sensitivity: "base",
      });
      // Secondary sort by date
      if (comparison === 0) {
        const timeA = getPhotoTimestamp(a);
        const timeB = getPhotoTimestamp(b);
        comparison = timeA - timeB;
      }
    } else if (sortBy === "category") {
      comparison = (a.category || "").localeCompare(b.category || "");
      if (comparison === 0) {
        comparison = (a.title || "").localeCompare(b.title || "", undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
    } else if (sortBy === "fileSize") {
      const parseSize = (s?: string) => {
        if (!s) return 0;
        const match = s.match(/([\d.]+)\s*(KB|MB|GB)?/i);
        if (!match) return 0;
        let num = parseFloat(match[1]);
        const unit = (match[2] || "MB").toUpperCase();
        if (unit === "KB") num *= 1024;
        if (unit === "MB") num *= 1024 * 1024;
        if (unit === "GB") num *= 1024 * 1024 * 1024;
        return num;
      };
      comparison = parseSize(a.fileSize) - parseSize(b.fileSize);
      if (comparison === 0) {
        comparison = (a.title || "").localeCompare(b.title || "", undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Handlers
  const handleToggleSelectPhoto = (photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleToggleFavorite = (photoId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, isTrash: true, isHidden: false } : p))
    );
  };

  const handleRestorePhoto = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, isTrash: false } : p))
    );
  };

  const handlePermanentDelete = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleEmptyTrash = () => {
    setPhotos((prev) => prev.filter((p) => !p.isTrash));
  };

  const handleUnhidePhoto = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, isHidden: false } : p))
    );
  };

  const handleHidePhotos = (photoIdsToHide: string[]) => {
    setPhotos((prev) =>
      prev.map((p) =>
        photoIdsToHide.includes(p.id) ? { ...p, isHidden: true } : p
      )
    );
    setSelectedPhotoIds([]);
  };

  // Batch actions
  const handleBatchFavorite = () => {
    setPhotos((prev) =>
      prev.map((p) =>
        selectedPhotoIds.includes(p.id) ? { ...p, isFavorite: true } : p
      )
    );
    setSelectedPhotoIds([]);
  };

  const handleBatchDelete = () => {
    setPhotos((prev) =>
      prev.map((p) =>
        selectedPhotoIds.includes(p.id) ? { ...p, isTrash: true, isHidden: false } : p
      )
    );
    setSelectedPhotoIds([]);
  };

  const handleBatchShare = () => {
    const selectedPhotos = photos.filter((p) => selectedPhotoIds.includes(p.id));
    if (selectedPhotos.length === 0) return;
    setShowBatchShareModal(true);
  };

  // Execute AI Search with Gemini API
  const handleExecuteAISearch = async (queryStr: string) => {
    if (!queryStr.trim()) {
      setMatchedPhotoIds(null);
      return;
    }

    setIsAISearching(true);
    navigateTo({ view: "photos" });

    const matches = await searchPhotosWithAI(queryStr, photos);
    if (matches.length > 0) {
      const ids = matches.map((m) => m.id);
      setMatchedPhotoIds(ids);
    } else {
      setMatchedPhotoIds([]);
    }

    setIsAISearching(false);
  };

  // Save Edited Photo or Video
  const handleSaveEditedPhoto = (updatedPhoto: Photo, isCopy?: boolean) => {
    if (isCopy) {
      setPhotos((prev) => [updatedPhoto, ...prev]);
      setNavState((current) => ({ ...current, activePhotoId: updatedPhoto.id }));
      setBatchToastNotice(`Created new copy: "${updatedPhoto.title}"`);
      setTimeout(() => setBatchToastNotice(null), 3000);
    } else {
      setPhotos((prev) =>
        prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
      );
      if (activeLightboxPhoto?.id === updatedPhoto.id) {
        setNavState((current) => ({ ...current, activePhotoId: updatedPhoto.id }));
      }
      setBatchToastNotice(`Saved changes to "${updatedPhoto.title}"`);
      setTimeout(() => setBatchToastNotice(null), 3000);
    }
  };

  // Edit Album Info
  const handleEditAlbum = (albumId: string, name: string, description: string) => {
    setAlbums((prev) =>
      prev.map((a) => (a.id === albumId ? { ...a, name, description } : a))
    );
  };

  // Add Photos to Album
  const handleAddPhotosToAlbum = (albumId: string, photoIdsToAdd: string[]) => {
    if (albumId === "album-favorites") {
      setPhotos((prev) =>
        prev.map((p) => (photoIdsToAdd.includes(p.id) ? { ...p, isFavorite: true } : p))
      );
    }
    setAlbums((prev) =>
      prev.map((a) => {
        if (a.id === albumId) {
          const updatedIds = Array.from(new Set([...a.photoIds, ...photoIdsToAdd]));
          return { ...a, photoIds: updatedIds };
        }
        return a;
      })
    );
  };

  // Remove Photo from Album
  const handleRemoveFromAlbum = (albumId: string, photoIdToRemove: string) => {
    if (albumId === "album-favorites") {
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoIdToRemove ? { ...p, isFavorite: false } : p))
      );
    }
    setAlbums((prev) =>
      prev.map((a) => {
        if (a.id === albumId) {
          return { ...a, photoIds: a.photoIds.filter((id) => id !== photoIdToRemove) };
        }
        return a;
      })
    );
  };

  // Delete Custom Album
  const handleDeleteAlbum = (albumId: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
  };

  // Create Custom Album
  const handleCreateAlbum = (name: string, description: string) => {
    const newAlbum: Album = {
      id: `album-${Date.now()}`,
      name,
      type: "custom",
      icon: "Folder",
      photoIds: [],
      createdAt: new Date().toISOString(),
      description,
    };
    setAlbums((prev) => [...prev, newAlbum]);
  };

  const handleCreateAlbumAndAdd = (name: string, description: string, photoIdsToAdd: string[]) => {
    const newAlbum: Album = {
      id: `album-${Date.now()}`,
      name,
      type: "custom",
      icon: "Folder",
      photoIds: photoIdsToAdd,
      createdAt: new Date().toISOString(),
      description,
    };
    setAlbums((prev) => [...prev, newAlbum]);
    setSelectedPhotoIds([]);
  };

  // Add Uploaded Photo
  const handleAddUploadedPhoto = (newPhoto: Photo) => {
    setPhotos((prev) => [newPhoto, ...prev]);
  };

  // Update Person Cluster Name
  const handleUpdatePersonName = (personId: string, newName: string) => {
    setPeople((prev) =>
      prev.map((person) =>
        person.id === personId ? { ...person, name: newName } : person
      )
    );
  };

  const isAllTimelineSelected =
    visiblePhotos.length > 0 &&
    visiblePhotos.every((p) => selectedPhotoIds.includes(p.id));

  const handleSelectAllTimeline = () => {
    if (isAllTimelineSelected) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(visiblePhotos.map((p) => p.id));
    }
  };

  return (
    <div className="h-full h-[100dvh] w-full w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={(view) => {
            navigateTo({ view });
            setSidebarOpen(false);
          }}
          favoritesCount={photos.filter((p) => p.isFavorite && !p.isTrash).length}
          trashCount={photos.filter((p) => p.isTrash).length}
          hiddenCount={photos.filter((p) => p.isHidden).length}
          onOpenUpload={() => setShowUploadModal(true)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content View Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden h-full min-h-0">
          <Header
            ref={headerRef}
            currentView={currentView}
            isSettingsOpenProp={navState.isSettingsOpen}
            onToggleSettings={(show) => navigateTo({ isSettingsOpen: show })}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (!q.trim()) setMatchedPhotoIds(null);
            }}
            onExecuteAISearch={handleExecuteAISearch}
            isAISearching={isAISearching}
            gridDensity={gridDensity}
            onChangeGridDensity={handleGridDensityChange}
            timelineZoom={timelineZoom}
            onChangeTimelineZoom={handleTimelineZoomChange}
            columnCount={columnCount}
            onChangeColumnCount={handleColumnCountChange}
            sortBy={sortBy}
            onChangeSortBy={setSortBy}
            sortOrder={sortOrder}
            onChangeSortOrder={setSortOrder}
            selectedPhotoIds={selectedPhotoIds}
            onClearSelection={() => setSelectedPhotoIds([])}
            onSelectAll={handleSelectAllTimeline}
            isAllSelected={isAllTimelineSelected}
            onBatchFavorite={handleBatchFavorite}
            onBatchDelete={handleBatchDelete}
            onBatchShare={handleBatchShare}
            onOpenAddToAlbumModal={() => setShowAddToAlbumModal(true)}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenUploadModal={() => setShowUploadModal(true)}
          />

          {/* View Router with horizontal swipe tab switching and liquid view transitions */}
          <div
            onTouchStart={handleTabTouchStart}
            onTouchEnd={handleTabTouchEnd}
            className={`flex-1 ${sidebarOpen ? "overflow-hidden touch-none" : "overflow-y-auto"} min-h-0 ${currentView === "hidden" || isAlbumOpened ? "pb-0" : "pb-20 lg:pb-0"}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full h-full"
              >
                {currentView === "photos" && (
                  <TimelineGrid
                    photos={visiblePhotos}
                    gridDensity={gridDensity}
                    timelineZoom={timelineZoom}
                    columnCount={columnCount}
                    onChangeColumnCount={handleColumnCountChange}
                    selectedPhotoIds={selectedPhotoIds}
                    onToggleSelectPhoto={handleToggleSelectPhoto}
                    onOpenPhoto={(photo) => {
                      navigateTo({ activePhotoId: photo.id }, visiblePhotos);
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                )}

                {currentView === "videos" && (
                  <TimelineGrid
                    photos={visiblePhotos.filter((p) => p.isVideo)}
                    gridDensity={gridDensity}
                    timelineZoom={timelineZoom}
                    columnCount={columnCount}
                    onChangeColumnCount={handleColumnCountChange}
                    selectedPhotoIds={selectedPhotoIds}
                    onToggleSelectPhoto={handleToggleSelectPhoto}
                    onOpenPhoto={(photo) => {
                      const videoList = visiblePhotos.filter((p) => p.isVideo);
                      navigateTo({ activePhotoId: photo.id }, videoList);
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                )}

                {currentView === "albums" && (
                  <AlbumsView
                    ref={albumsViewRef}
                    albums={albums}
                    photos={photos.filter((p) => !p.isTrash && !p.isHidden)}
                    selectedAlbumIdProp={navState.albumId}
                    onSelectAlbum={(albumId) => navigateTo({ view: "albums", albumId })}
                    onCreateAlbum={handleCreateAlbum}
                    onEditAlbum={handleEditAlbum}
                    onAddPhotosToAlbum={handleAddPhotosToAlbum}
                    onRemoveFromAlbum={handleRemoveFromAlbum}
                    onDeleteAlbum={handleDeleteAlbum}
                    onToggleFavorite={handleToggleFavorite}
                    onDeletePhoto={handleDeletePhoto}
                    onOpenedAlbumChange={(isOpened) => setIsAlbumOpened(isOpened)}
                    onOpenPhoto={(photo, scopedList) => {
                      navigateTo({ activePhotoId: photo.id }, scopedList || null);
                    }}
                  />
                )}

                {currentView === "memories" && (
                  <MemoriesView
                    ref={memoriesViewRef}
                    stories={stories}
                    photos={photos.filter((p) => !p.isTrash && !p.isHidden)}
                    selectedStoryIdProp={navState.storyId}
                    onSelectStory={(storyId) => navigateTo({ view: "memories", storyId })}
                    onAddStory={(story) => setStories((prev) => [story, ...prev])}
                    onOpenPhoto={(photo, scopedList) => {
                      navigateTo({ activePhotoId: photo.id }, scopedList || null);
                    }}
                  />
                )}

                {currentView === "people" && (
                  <PeopleView
                    ref={peopleViewRef}
                    people={people}
                    photos={photos.filter((p) => !p.isTrash && !p.isHidden)}
                    selectedPersonIdProp={navState.personId}
                    onSelectPerson={(personId) => navigateTo({ view: "people", personId })}
                    onOpenPhoto={(photo, scopedList) => {
                      navigateTo({ activePhotoId: photo.id }, scopedList || null);
                    }}
                    onUpdatePersonName={handleUpdatePersonName}
                  />
                )}

                {currentView === "places" && (
                  <PlacesMapView
                    ref={placesMapViewRef}
                    photos={photos.filter((p) => !p.isTrash && !p.isHidden)}
                    selectedCityProp={navState.city}
                    onSelectCity={(city) => navigateTo({ view: "places", city })}
                    onOpenPhoto={(photo, scopedList) => {
                      navigateTo({ activePhotoId: photo.id }, scopedList || null);
                    }}
                  />
                )}

                {currentView === "hidden" && (
                  <HiddenVaultModal
                    ref={hiddenVaultRef}
                    hiddenPhotos={photos.filter((p) => p.isHidden && !p.isTrash)}
                    allGalleryPhotos={photos}
                    onOpenPhoto={(photo, scopedList) => {
                      navigateTo({ activePhotoId: photo.id }, scopedList || null);
                    }}
                    onUnhidePhoto={handleUnhidePhoto}
                    onHidePhotos={handleHidePhotos}
                    onDeletePhoto={handleDeletePhoto}
                    onPermanentDelete={handlePermanentDelete}
                    onToggleFavorite={handleToggleFavorite}
                    onBack={() => {
                      navigateTo({ view: "photos" });
                      setSidebarOpen(true);
                    }}
                  />
                )}

                {currentView === "trash" && (
                  <TrashView
                    trashPhotos={photos.filter((p) => p.isTrash)}
                    onRestorePhoto={handleRestorePhoto}
                    onPermanentDelete={handlePermanentDelete}
                    onEmptyTrash={handleEmptyTrash}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Navigation Bar with Liquid Bubble Highlight */}
        {currentView !== "hidden" && !isAlbumOpened && (
          <BottomNav
            currentView={currentView}
            onSelectView={(view) => {
              navigateTo({ view });
            }}
          />
        )}
      </div>

      {/* Add Photos to Album & Private Vault Modal */}
      <AddToAlbumVaultModal
        isOpen={showAddToAlbumModal}
        selectedPhotoIds={selectedPhotoIds}
        photos={photos}
        albums={albums}
        onClose={() => setShowAddToAlbumModal(false)}
        onAddToAlbum={(albumId, photoIds) => {
          handleAddPhotosToAlbum(albumId, photoIds);
          setSelectedPhotoIds([]);
        }}
        onCreateAlbum={(name, description) => {
          handleCreateAlbumAndAdd(name, description, selectedPhotoIds);
        }}
        onHidePhotos={(photoIds) => {
          handleHidePhotos(photoIds);
        }}
        onShowToast={(msg) => {
          setBatchToastNotice(msg);
          setTimeout(() => setBatchToastNotice(null), 3500);
        }}
      />

      {/* Multi-Item Share Modal */}
      <BatchShareModal
        isOpen={showBatchShareModal}
        selectedPhotos={photos.filter((p) => selectedPhotoIds.includes(p.id))}
        onClose={() => setShowBatchShareModal(false)}
        onShowToast={(msg) => {
          setBatchToastNotice(msg);
          setTimeout(() => setBatchToastNotice(null), 3500);
        }}
      />

      {/* Floating Toast Notice */}
      {batchToastNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-full bg-slate-900 border border-indigo-500/50 text-indigo-200 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-bounce-short">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{batchToastNotice}</span>
        </div>
      )}

      {/* Lightbox Photo Viewer Overlay */}
      {activeLightboxPhoto && (
        <PhotoLightbox
          ref={mediaViewerRef}
          photo={activeLightboxPhoto}
          photosList={activeLightboxList || visiblePhotos}
          onClose={() => navigateTo({ activePhotoId: null })}
          onSelectPhoto={handleSelectPhotoInViewer}
          onToggleFavorite={handleToggleFavorite}
          onDeletePhoto={handleDeletePhoto}
          onPermanentDelete={handlePermanentDelete}
          onUnhidePhoto={handleUnhidePhoto}
          onOpenEditor={(p) => navigateTo({ activeEditorId: p.id })}
        />
      )}

      {/* Photo & Video Editor Overlays */}
      {activeEditorPhoto && activeEditorPhoto.isVideo && (
        <VideoEditorModal
          ref={videoEditorRef}
          photo={activeEditorPhoto}
          onSave={handleSaveEditedPhoto}
          onClose={() => navigateTo({ activeEditorId: null })}
        />
      )}

      {activeEditorPhoto && !activeEditorPhoto.isVideo && (
        <PhotoEditorModal
          ref={photoEditorRef}
          photo={activeEditorPhoto}
          onSave={handleSaveEditedPhoto}
          onClose={() => navigateTo({ activeEditorId: null })}
        />
      )}

      {/* Upload Photo Modal */}
      {showUploadModal && (
        <UploadModal
          onAddPhoto={handleAddUploadedPhoto}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCheck, Folder, Heart, Plus, Share2, Trash2, X, Smartphone, Camera, Film, FolderPlus, Upload, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
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
import { DeviceMediaSyncModal } from "./components/DeviceMediaSyncModal";
import { AndroidPermissionView } from "./components/AndroidPermissionView";
import { EmptyGalleryState } from "./components/EmptyGalleryState";
import { SplashScreen } from "./components/SplashScreen";
import { androidMediaService, AndroidPermissionState } from "./services/androidMediaService";

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
import { searchPhotosWithAI } from "./services/api";

export default function App() {
  // Main Real Device Photos State
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [customAlbums, setCustomAlbums] = useState<Album[]>(() => {
    try {
      const saved = localStorage.getItem("galleyar_custom_albums");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customStories, setCustomStories] = useState<MemoryStory[]>([]);

  const [permissionState, setPermissionState] = useState<AndroidPermissionState>(() =>
    androidMediaService.getPermissionState()
  );

  const [isAppReady, setIsAppReady] = useState<boolean>(false);

  // Hidden native file input refs for direct camera capture and device file selection
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Load real device media from MediaStore / IndexedDB on startup
  useEffect(() => {
    const loadStoredMedia = async () => {
      try {
        const dbPhotos = await androidMediaService.queryDeviceMedia();
        if (dbPhotos && dbPhotos.length > 0) {
          setPhotos(dbPhotos);
          setPermissionState("granted");
        } else {
          const perm = androidMediaService.getPermissionState();
          setPermissionState(perm);
        }
      } catch (err) {
        console.warn("Could not load photos from device storage:", err);
      } finally {
        setIsAppReady(true);
      }
    };
    loadStoredMedia();

    // Subscribe to media changes (additions, deletions, edits)
    const unsubscribe = androidMediaService.subscribeMediaChanges(async () => {
      const updated = await androidMediaService.queryDeviceMedia();
      setPhotos(updated);
    });
    return () => unsubscribe();
  }, []);

  // Compute dynamic system & bucket albums based on real device media
  const albums = useMemo<Album[]>(() => {
    const dynamic = androidMediaService.generateDynamicAlbums(photos);
    // Merge custom user created albums
    const existingIds = new Set(dynamic.map((a) => a.id));
    const nonDuplicates = customAlbums.filter((a) => !existingIds.has(a.id));
    return [...dynamic, ...nonDuplicates];
  }, [photos, customAlbums]);

  // Compute people clusters dynamically from real photos
  const people = useMemo<PersonCluster[]>(() => {
    const active = photos.filter((p) => !p.isTrash && !p.isHidden);
    const personMap = new Map<string, { id: string; name: string; photoIds: string[]; coverPhotoUrl: string }>();
    
    active.forEach((p) => {
      if (p.people && p.people.length > 0) {
        p.people.forEach((person) => {
          if (!personMap.has(person.id)) {
            personMap.set(person.id, {
              id: person.id,
              name: person.name,
              photoIds: [],
              coverPhotoUrl: p.url,
            });
          }
          personMap.get(person.id)!.photoIds.push(p.id);
        });
      }
    });

    return Array.from(personMap.values());
  }, [photos]);

  // Compute memory stories dynamically from real photos
  const stories = useMemo<MemoryStory[]>(() => {
    const active = photos.filter((p) => !p.isTrash && !p.isHidden);
    if (active.length === 0) return customStories;

    const map = new Map<string, Photo[]>();
    active.forEach((p) => {
      const key = p.month || (p.year ? `Year ${p.year}` : "Recent Highlights");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });

    const list: MemoryStory[] = [];
    for (const [key, pList] of map.entries()) {
      if (pList.length >= 1) {
        list.push({
          id: `story-${key.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
          title: `${key} Highlights`,
          subtitle: `${pList.length} photo${pList.length > 1 ? "s" : ""} & video${pList.length > 1 ? "s" : ""}`,
          narrative: `Moments and highlights from your device media in ${key}.`,
          soundtrack: "Acoustic Sunset Melody",
          dateRange: key,
          coverPhotoUrl: pList[0].url,
          photoIds: pList.map((p) => p.id),
          palette: pList[0].dominantColors || ["#4f46e5", "#7c3aed", "#0f172a"],
        });
      }
    }
    return [...customStories, ...list];
  }, [photos, customStories]);

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
    "people",
    "places",
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
    // Disable section switching gesture if lightbox or editor modals are active
    if (
      e.touches.length === 1 &&
      !activeLightboxPhoto &&
      !activeEditorPhoto &&
      !showUploadModal
    ) {
      setTabDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTabTouchEnd = (e: React.TouchEvent) => {
    if (
      !tabDragStart ||
      activeLightboxPhoto ||
      activeEditorPhoto ||
      showUploadModal
    ) {
      setTabDragStart(null);
      return;
    }
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = tabDragStart.x - endX;
    const deltaY = tabDragStart.y - endY;

    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.25 && Math.abs(deltaX) > 40) {
      if (deltaX < -40) {
        // Swiped Right (Finger moved Left-to-Right)
        if (sidebarOpen) {
          // Already open
        } else if (isAlbumOpened && currentView === "albums") {
          // Inside an opened album: swipe right returns to albums overview
          albumsViewRef.current?.handleBack();
        } else if (currentView === "people" && peopleViewRef.current?.handleBack()) {
          // Handled closing person detail
        } else if (currentView === "places" && placesMapViewRef.current?.handleBack()) {
          // Handled closing city detail
        } else if (currentView === "hidden") {
          navigateTo({ view: "photos" });
        } else if (currentView === "trash") {
          navigateTo({ view: "photos" });
        } else if (currentView === "photos") {
          // Swipe right on photos home opens sidebar
          setSidebarOpen(true);
        } else {
          // In other sections, swiping right navigates to previous tab
          const currentIdx = MAIN_TABS.indexOf(currentView);
          if (currentIdx > 0) {
            navigateTo({ view: MAIN_TABS[currentIdx - 1] });
          }
        }
      } else if (deltaX > 40) {
        // Swiped Left (Finger moved Right-to-Left)
        if (sidebarOpen) {
          // Swipe left closes sidebar
          setSidebarOpen(false);
        } else if (!isAlbumOpened) {
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
  const [showDeviceSyncModal, setShowDeviceSyncModal] = useState(false);

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
      if (showDeviceSyncModal) {
        setShowDeviceSyncModal(false);
        return true;
      }
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
      showDeviceSyncModal,
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
      showDeviceSyncModal ||
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
    showDeviceSyncModal,
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

  const saveCustomAlbums = (updated: Album[]) => {
    setCustomAlbums(updated);
    try {
      localStorage.setItem("galleyar_custom_albums", JSON.stringify(updated));
    } catch {}
  };

  // Edit Album Info
  const handleEditAlbum = (albumId: string, name: string, description: string) => {
    saveCustomAlbums(
      customAlbums.map((a) => (a.id === albumId ? { ...a, name, description } : a))
    );
  };

  // Change Album Cover Photo
  const handleChangeAlbumCover = (albumId: string, coverUrl: string) => {
    saveCustomAlbums(
      customAlbums.map((a) => (a.id === albumId ? { ...a, coverUrl } : a))
    );
  };

  // Add Photos to Album
  const handleAddPhotosToAlbum = (albumId: string, photoIdsToAdd: string[]) => {
    if (albumId === "album-favorites") {
      setPhotos((prev) =>
        prev.map((p) => (photoIdsToAdd.includes(p.id) ? { ...p, isFavorite: true } : p))
      );
    }
    saveCustomAlbums(
      customAlbums.map((a) => {
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
    saveCustomAlbums(
      customAlbums.map((a) => {
        if (a.id === albumId) {
          return { ...a, photoIds: a.photoIds.filter((id) => id !== photoIdToRemove) };
        }
        return a;
      })
    );
  };

  // Delete Custom Album
  const handleDeleteAlbum = (albumId: string) => {
    saveCustomAlbums(customAlbums.filter((a) => a.id !== albumId));
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
    saveCustomAlbums([...customAlbums, newAlbum]);
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
    saveCustomAlbums([...customAlbums, newAlbum]);
    setSelectedPhotoIds([]);
  };

  // Add Uploaded Photo
  const handleAddUploadedPhoto = (newPhoto: Photo) => {
    setPhotos((prev) => {
      const updated = [newPhoto, ...prev];
      return updated;
    });
    setBatchToastNotice(`Added "${newPhoto.title}" to gallery`);
    setTimeout(() => setBatchToastNotice(null), 3000);
  };

  // Import Device Photos / Videos from Phone Storage / APK
  const handleImportDevicePhotos = (newPhotos: Photo[]) => {
    setPhotos((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const uniqueNew = newPhotos.filter((p) => !existingIds.has(p.id));
      return [...uniqueNew, ...prev];
    });
    setPermissionState("granted");
    setBatchToastNotice(`Loaded ${newPhotos.length} media items from phone storage`);
    setTimeout(() => setBatchToastNotice(null), 3500);
  };

  // Direct Device Media File Selector Change
  const handleDeviceFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const { photos: newItems, count } = await androidMediaService.importDeviceFiles(files);
      if (count > 0) {
        setPhotos((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = newItems.filter((p) => !existingIds.has(p.id));
          return [...fresh, ...prev];
        });
        setPermissionState("granted");
        setBatchToastNotice(`Imported ${count} photos & videos from device`);
        setTimeout(() => setBatchToastNotice(null), 3000);
      }
    }
    e.target.value = "";
  };

  const handlePermissionGranted = async () => {
    setPermissionState("granted");
    const media = await androidMediaService.queryDeviceMedia();
    if (media.length > 0) {
      setPhotos(media);
    }
  };

  // Update Person Cluster Name
  const handleUpdatePersonName = (personId: string, newName: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.people && p.people.some((per) => per.id === personId)) {
          return {
            ...p,
            people: p.people.map((per) => (per.id === personId ? { ...per, name: newName } : per)),
          };
        }
        return p;
      })
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
          onOpenDeviceSync={() => setShowDeviceSyncModal(true)}
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
            onOpenDeviceSyncModal={() => setShowDeviceSyncModal(true)}
          />

          {/* View Router with horizontal swipe tab switching and liquid view transitions */}
          <div
            onTouchStart={handleTabTouchStart}
            onTouchEnd={handleTabTouchEnd}
            className={`flex-1 ${sidebarOpen ? "overflow-hidden touch-none" : "overflow-y-auto"} min-h-0`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full min-h-full"
              >
                {currentView === "photos" && (
                  <>
                    {(permissionState === "prompt" || permissionState === "denied") && photos.length === 0 ? (
                      <AndroidPermissionView
                        permissionState={permissionState}
                        onPermissionGranted={handlePermissionGranted}
                        onOpenCustomPicker={() => deviceFileInputRef.current?.click()}
                      />
                    ) : visiblePhotos.length === 0 ? (
                      <EmptyGalleryState
                        view="photos"
                        onTakePhoto={() => cameraPhotoInputRef.current?.click()}
                        onRecordVideo={() => cameraVideoInputRef.current?.click()}
                        onPickMedia={() => deviceFileInputRef.current?.click()}
                        onScanFolder={() => folderInputRef.current?.click()}
                      />
                    ) : (
                      <>
                        {permissionState === "limited" && (
                          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Showing selected photos and videos from your Android device.</span>
                            </div>
                            <button
                              onClick={() => deviceFileInputRef.current?.click()}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
                            >
                              Add More
                            </button>
                          </div>
                        )}
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
                      </>
                    )}
                  </>
                )}

                {currentView === "videos" && (
                  <>
                    {(permissionState === "prompt" || permissionState === "denied") && photos.length === 0 ? (
                      <AndroidPermissionView
                        permissionState={permissionState}
                        onPermissionGranted={handlePermissionGranted}
                        onOpenCustomPicker={() => deviceFileInputRef.current?.click()}
                      />
                    ) : visiblePhotos.filter((p) => p.isVideo).length === 0 ? (
                      <EmptyGalleryState
                        view="videos"
                        onTakePhoto={() => cameraPhotoInputRef.current?.click()}
                        onRecordVideo={() => cameraVideoInputRef.current?.click()}
                        onPickMedia={() => deviceFileInputRef.current?.click()}
                        onScanFolder={() => folderInputRef.current?.click()}
                      />
                    ) : (
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
                  </>
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
                    onChangeAlbumCover={handleChangeAlbumCover}
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
                    onAddStory={(story) => setCustomStories((prev) => [story, ...prev])}
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

      {/* Upload Photo & Video Modal */}
      {showUploadModal && (
        <UploadModal
          onAddPhoto={handleAddUploadedPhoto}
          onAddMultiplePhotos={handleImportDevicePhotos}
          onOpenDeviceSync={() => {
            setShowUploadModal(false);
            setShowDeviceSyncModal(true);
          }}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Real Phone Storage & APK Media Scanner Modal */}
      <DeviceMediaSyncModal
        isOpen={showDeviceSyncModal}
        onClose={() => setShowDeviceSyncModal(false)}
        onImportPhotos={handleImportDevicePhotos}
        currentPhotoCount={photos.length}
      />

      {/* Hidden Native Device Inputs for Direct Real Device Access */}
      <input
        ref={deviceFileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleDeviceFileInputChange}
      />
      <input
        ref={cameraPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleDeviceFileInputChange}
      />
      <input
        ref={cameraVideoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleDeviceFileInputChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        className="hidden"
        onChange={handleDeviceFileInputChange}
      />

      {/* App Opening Splash Screen with Centered Normal-Sized Logo */}
      <SplashScreen isReady={isAppReady} minDurationMs={1200} />
    </div>
  );
}

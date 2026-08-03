import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCheck, Folder, Heart, Plus, Share2, Trash2, X } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { TimelineGrid } from "./components/TimelineGrid";
import { AlbumsView } from "./components/AlbumsView";
import { MemoriesView } from "./components/MemoriesView";
import { PeopleView } from "./components/PeopleView";
import { PlacesMapView } from "./components/PlacesMapView";
import { PhotoLightbox } from "./components/PhotoLightbox";
import { PhotoEditorModal } from "./components/PhotoEditorModal";
import { VideoEditorModal } from "./components/VideoEditorModal";
import { UploadModal } from "./components/UploadModal";
import { HiddenVaultModal } from "./components/HiddenVaultModal";
import { TrashView } from "./components/TrashView";

import {
  Photo,
  Album,
  PersonCluster,
  MemoryStory,
  ViewMode,
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
  const [currentView, setCurrentView] = useState<ViewMode>("photos");
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
  const [batchToastNotice, setBatchToastNotice] = useState<string | null>(null);

  // Reset album opened state when switching main views
  useEffect(() => {
    if (currentView !== "albums") {
      setIsAlbumOpened(false);
    }
  }, [currentView]);

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
            setCurrentView(MAIN_TABS[currentIdx - 1]);
            setMatchedPhotoIds(null);
            setSearchQuery("");
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
            setCurrentView(MAIN_TABS[currentIdx + 1]);
            setMatchedPhotoIds(null);
            setSearchQuery("");
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
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<Photo | null>(
    null
  );
  const [activeLightboxList, setActiveLightboxList] = useState<Photo[] | null>(
    null
  );
  const [activeEditorPhoto, setActiveEditorPhoto] = useState<Photo | null>(
    null
  );

  // Dialog Modals
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Save photos to local storage on change
  useEffect(() => {
    localStorage.setItem("galleyar_photos_db", JSON.stringify(photos));
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

  const visiblePhotos = Array.from(uniquePhotoMap.values()).sort((a, b) => {
    let comparison = 0;
    if (sortBy === "date") {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      comparison = timeA - timeB;
    } else if (sortBy === "title") {
      comparison = (a.title || "").localeCompare(b.title || "");
    } else if (sortBy === "category") {
      comparison = (a.category || "").localeCompare(b.category || "");
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
    if (activeLightboxPhoto && activeLightboxPhoto.id === photoId) {
      setActiveLightboxPhoto((prev) =>
        prev ? { ...prev, isFavorite: !prev.isFavorite } : null
      );
    }
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
    const urls = selectedPhotos.map((p) => p.highResUrl || p.url).join("\n");
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `${selectedPhotos.length} Photos - GalleyAR`,
          text: `Sharing ${selectedPhotos.length} photos from GalleyAR`,
          url: selectedPhotos[0]?.highResUrl || selectedPhotos[0]?.url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(urls);
      alert(`Copied links for ${selectedPhotos.length} photos to clipboard!`);
    }
  };

  // Execute AI Search with Gemini API
  const handleExecuteAISearch = async (queryStr: string) => {
    if (!queryStr.trim()) {
      setMatchedPhotoIds(null);
      return;
    }

    setIsAISearching(true);
    setCurrentView("photos");

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
      setActiveLightboxPhoto(updatedPhoto);
      setBatchToastNotice(`Created new copy: "${updatedPhoto.title}"`);
      setTimeout(() => setBatchToastNotice(null), 3000);
    } else {
      setPhotos((prev) =>
        prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
      );
      if (activeLightboxPhoto?.id === updatedPhoto.id) {
        setActiveLightboxPhoto(updatedPhoto);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={(view) => {
            setCurrentView(view);
            setMatchedPhotoIds(null);
            setSearchQuery("");
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
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
          <Header
            currentView={currentView}
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
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenUploadModal={() => setShowUploadModal(true)}
          />

          {/* Floating Batch Selection Bar for Main Photos/Videos Gallery */}
          {selectedPhotoIds.length > 0 && (currentView === "photos" || currentView === "videos") && (
            <div className="sticky top-16 z-25 mx-3 sm:mx-6 my-2 bg-indigo-950/95 border border-indigo-500/50 p-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xl backdrop-blur-xl animate-fade-in">
              <div className="flex items-center gap-2.5">
                {/* Box next to text: 1 tick when partially selected, 2 ticks when all selected */}
                <button
                  onClick={handleSelectAllTimeline}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    isAllTimelineSelected
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/30"
                      : "bg-slate-900 text-indigo-400 hover:text-indigo-300 border-indigo-500/40 hover:bg-slate-800"
                  }`}
                  title={isAllTimelineSelected ? "Deselect All Items" : "Select All Items"}
                >
                  {isAllTimelineSelected ? (
                    <CheckCheck className="w-4 h-4 text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-indigo-400" />
                  )}
                </button>

                <span className="text-xs font-bold text-indigo-200">
                  {selectedPhotoIds.length} item{selectedPhotoIds.length > 1 ? "s" : ""} selected
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAddToAlbumModal(true)}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
                  title="Add selected items to an album"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold hidden sm:inline">Add to Album</span>
                </button>

                <button
                  onClick={handleBatchShare}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-700/60 cursor-pointer"
                  title="Share Selected"
                >
                  <Share2 className="w-4 h-4 text-sky-400" />
                </button>

                <button
                  onClick={handleBatchFavorite}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-700/60 cursor-pointer"
                  title="Favorite Selected"
                >
                  <Heart className="w-4 h-4 fill-pink-400 text-pink-400" />
                </button>

                <button
                  onClick={handleBatchDelete}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 cursor-pointer"
                  title="Delete Selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedPhotoIds([])}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-700/60 cursor-pointer"
                  title="Clear Selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* View Router with horizontal swipe tab switching and liquid view transitions */}
          <div
            onTouchStart={handleTabTouchStart}
            onTouchEnd={handleTabTouchEnd}
            className={`flex-1 ${currentView === "hidden" || isAlbumOpened ? "pb-0" : "pb-20 lg:pb-0"} overflow-hidden`}
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
                      setActiveLightboxList(null);
                      setActiveLightboxPhoto(photo);
                    }}
                    onToggleFavorite={handleToggleFavorite}
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
                      setActiveLightboxList(visiblePhotos.filter((p) => p.isVideo));
                      setActiveLightboxPhoto(photo);
                    }}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )}

                {currentView === "albums" && (
                  <AlbumsView
                    albums={albums}
                    photos={photos.filter((p) => !p.isTrash && !p.isHidden)}
                    onCreateAlbum={handleCreateAlbum}
                    onEditAlbum={handleEditAlbum}
                    onAddPhotosToAlbum={handleAddPhotosToAlbum}
                    onRemoveFromAlbum={handleRemoveFromAlbum}
                    onDeleteAlbum={handleDeleteAlbum}
                    onToggleFavorite={handleToggleFavorite}
                    onDeletePhoto={handleDeletePhoto}
                    onOpenedAlbumChange={(isOpened) => setIsAlbumOpened(isOpened)}
                    onOpenPhoto={(photo, scopedList) => {
                      setActiveLightboxList(scopedList || null);
                      setActiveLightboxPhoto(photo);
                    }}
                  />
                )}

                {currentView === "memories" && (
                  <MemoriesView
                    stories={stories}
                    photos={photos.filter((p) => !p.isTrash && !p.isHidden)}
                    onAddStory={(story) => setStories((prev) => [story, ...prev])}
                    onOpenPhoto={(photo) => setActiveLightboxPhoto(photo)}
                  />
                )}

                {currentView === "people" && (
                  <PeopleView
                    people={people}
                    photos={photos.filter((p) => !p.isTrash && !p.isHidden)}
                    onOpenPhoto={(photo) => setActiveLightboxPhoto(photo)}
                    onUpdatePersonName={handleUpdatePersonName}
                  />
                )}

                {currentView === "places" && (
                  <PlacesMapView
                    photos={photos.filter((p) => !p.isTrash && !p.isHidden)}
                    onOpenPhoto={(photo) => setActiveLightboxPhoto(photo)}
                  />
                )}

                {currentView === "hidden" && (
                  <HiddenVaultModal
                    hiddenPhotos={photos.filter((p) => p.isHidden && !p.isTrash)}
                    allGalleryPhotos={photos}
                    onOpenPhoto={(photo, scopedList) => {
                      setActiveLightboxList(scopedList || null);
                      setActiveLightboxPhoto(photo);
                    }}
                    onUnhidePhoto={handleUnhidePhoto}
                    onHidePhotos={handleHidePhotos}
                    onDeletePhoto={handleDeletePhoto}
                    onPermanentDelete={handlePermanentDelete}
                    onToggleFavorite={handleToggleFavorite}
                    onBack={() => setCurrentView("photos")}
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
              setCurrentView(view);
              setMatchedPhotoIds(null);
              setSearchQuery("");
            }}
          />
        )}
      </div>

      {/* Add Photos to Album Modal from Gallery Selection */}
      {showAddToAlbumModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" />
                  <span>Add Photos to Album</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Targeting {selectedPhotoIds.length} selected item{selectedPhotoIds.length > 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setShowAddToAlbumModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-slate-300">Select Target Album:</p>
              {albums.map((album) => {
                const albumPhotoCount = album.photoIds?.length || 0;
                return (
                  <button
                    key={album.id}
                    onClick={() => {
                      handleAddPhotosToAlbum(album.id, selectedPhotoIds);
                      setBatchToastNotice(`Added ${selectedPhotoIds.length} item(s) to "${album.name}"`);
                      setSelectedPhotoIds([]);
                      setShowAddToAlbumModal(false);
                      setTimeout(() => setBatchToastNotice(null), 3200);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-indigo-500/60 hover:bg-slate-850 flex items-center justify-between transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-100 truncate">{album.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          {albumPhotoCount} item{albumPhotoCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white text-[11px] font-bold border border-indigo-500/30 shrink-0 transition-all">
                      Add Here
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-800 pt-3">
              <button
                onClick={() => {
                  setShowAddToAlbumModal(false);
                  const name = prompt("Enter new album name:");
                  if (name && name.trim()) {
                    handleCreateAlbum(name.trim(), "");
                    setTimeout(() => {
                      // Add to the newest created album
                      const newestAlbum = albums[albums.length - 1];
                      if (newestAlbum) {
                        handleAddPhotosToAlbum(newestAlbum.id, selectedPhotoIds);
                      }
                    }, 100);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>+ Create New Album & Add</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
          photo={photos.find((p) => p.id === activeLightboxPhoto.id) || activeLightboxPhoto}
          photosList={activeLightboxList || visiblePhotos}
          onClose={() => {
            setActiveLightboxPhoto(null);
            setActiveLightboxList(null);
          }}
          onSelectPhoto={(p) => setActiveLightboxPhoto(p)}
          onToggleFavorite={handleToggleFavorite}
          onDeletePhoto={handleDeletePhoto}
          onPermanentDelete={handlePermanentDelete}
          onUnhidePhoto={handleUnhidePhoto}
          onOpenEditor={(p) => {
            setActiveEditorPhoto(p);
            setActiveLightboxPhoto(null);
          }}
        />
      )}

      {/* Photo & Video Editor Overlays */}
      {activeEditorPhoto && activeEditorPhoto.isVideo && (
        <VideoEditorModal
          photo={activeEditorPhoto}
          onSave={handleSaveEditedPhoto}
          onClose={() => setActiveEditorPhoto(null)}
        />
      )}

      {activeEditorPhoto && !activeEditorPhoto.isVideo && (
        <PhotoEditorModal
          photo={activeEditorPhoto}
          onSave={handleSaveEditedPhoto}
          onClose={() => setActiveEditorPhoto(null)}
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

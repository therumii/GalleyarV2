import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Search,
  Grid,
  Menu,
  Sparkles,
  SlidersHorizontal,
  X,
  CheckSquare,
  Trash2,
  Heart,
  Upload,
  Share2,
  Settings,
  Shield,
  Zap,
  Info,
  Database,
  Check,
  CheckCheck,
  Plus,
  Clock,
  History,
  Calendar,
  MapPin,
  FileText,
  Tag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  KeyRound,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { GridDensity, SortByOption, SortOrderOption, TimelineZoom, ViewMode } from "../types";
import { isPinConfigured } from "../utils/cryptoVault";
import { VaultPinModal } from "./VaultPinModal";
import { haptics } from "../utils/haptics";

interface HeaderProps {
  currentView: ViewMode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExecuteAISearch: (query: string) => void;
  isAISearching: boolean;
  gridDensity: GridDensity;
  onChangeGridDensity: (density: GridDensity) => void;
  timelineZoom: TimelineZoom;
  onChangeTimelineZoom: (zoom: TimelineZoom) => void;
  columnCount?: number;
  onChangeColumnCount?: (count: number) => void;
  sortBy?: SortByOption;
  onChangeSortBy?: (sort: SortByOption) => void;
  sortOrder?: SortOrderOption;
  onChangeSortOrder?: (order: SortOrderOption) => void;
  selectedPhotoIds: string[];
  onClearSelection: () => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  onBatchFavorite: () => void;
  onBatchDelete: () => void;
  onBatchShare?: () => void;
  onOpenAddToAlbumModal?: () => void;
  onToggleSidebar: () => void;
  onOpenUploadModal: () => void;
  isSettingsOpenProp?: boolean;
  onToggleSettings?: (show: boolean) => void;
}

export interface HeaderRef {
  hasOpenModal: () => boolean;
  closeOpenModal: () => boolean;
}

export const Header = forwardRef<HeaderRef, HeaderProps>(({
  currentView,
  searchQuery,
  onSearchChange,
  onExecuteAISearch,
  isAISearching,
  gridDensity,
  onChangeGridDensity,
  timelineZoom,
  onChangeTimelineZoom,
  columnCount = 4,
  onChangeColumnCount,
  sortBy = "date",
  onChangeSortBy,
  sortOrder = "desc",
  onChangeSortOrder,
  selectedPhotoIds,
  onClearSelection,
  onSelectAll,
  isAllSelected = false,
  onBatchFavorite,
  onBatchDelete,
  onBatchShare,
  onOpenAddToAlbumModal,
  onToggleSidebar,
  onOpenUploadModal,
  isSettingsOpenProp,
  onToggleSettings,
}, ref) => {
  const [showQuickChips, setShowQuickChips] = useState(false);
  const [internalSettingsModal, setInternalSettingsModal] = useState(false);
  const showSettingsModal = isSettingsOpenProp !== undefined ? isSettingsOpenProp : internalSettingsModal;

  const [showVaultPinModal, setShowVaultPinModal] = useState(false);
  const [isVaultPinSet, setIsVaultPinSet] = useState<boolean>(() => isPinConfigured());
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  type SettingsSubTab = "overview" | "sort" | "grid" | "haptics" | "vault" | "info";
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>("overview");

  // Draft settings state (separate draft vs saved settings)
  const [draftSortBy, setDraftSortBy] = useState<SortByOption>(sortBy);
  const [draftSortOrder, setDraftSortOrder] = useState<SortOrderOption>(sortOrder);
  const [draftGridDensity, setDraftGridDensity] = useState<GridDensity>(gridDensity);
  const [draftHaptics, setDraftHaptics] = useState<boolean>(() => haptics.isEnabled());

  const handleToggleSettingsModal = (targetShow?: boolean, initialTab: SettingsSubTab = "overview") => {
    const nextShow = targetShow !== undefined ? targetShow : !showSettingsModal;
    if (nextShow === showSettingsModal) return;
    if (nextShow) {
      setDraftSortBy(sortBy);
      setDraftSortOrder(sortOrder);
      setDraftGridDensity(gridDensity);
      setDraftHaptics(haptics.isEnabled());
      setIsVaultPinSet(isPinConfigured());
      setSettingsSubTab(initialTab);
    }
    setInternalSettingsModal(nextShow);
    if (onToggleSettings) {
      onToggleSettings(nextShow);
    }
  };

  useImperativeHandle(ref, () => ({
    hasOpenModal: () => showVaultPinModal || showSettingsModal || isSearchExpanded,
    closeOpenModal: () => {
      if (showVaultPinModal) {
        setShowVaultPinModal(false);
        return true;
      }
      if (showSettingsModal) {
        if (settingsSubTab !== "overview") {
          setSettingsSubTab("overview");
          return true;
        }
        handleToggleSettingsModal(false);
        return true;
      }
      if (isSearchExpanded) {
        setIsSearchExpanded(false);
        return true;
      }
      return false;
    },
  }));

  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("galleyar_recent_searches");
      return saved
        ? JSON.parse(saved)
        : ["Tokyo, Japan", "July 2026", "Sunset Beach", "Receipts"];
    } catch (e) {
      return ["Tokyo, Japan", "July 2026", "Sunset Beach", "Receipts"];
    }
  });

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    const clean = query.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== clean.toLowerCase()
      );
      const updated = [clean, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(
          "galleyar_recent_searches",
          JSON.stringify(updated)
        );
      } catch (e) {}
      return updated;
    });
  };

  const removeRecentSearch = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      try {
        localStorage.setItem(
          "galleyar_recent_searches",
          JSON.stringify(updated)
        );
      } catch (e) {}
      return updated;
    });
  };

  const clearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem("galleyar_recent_searches");
    } catch (e) {}
  };

  const categorizedSuggestions = [
    { label: "July 2026", category: "Date", icon: Calendar },
    { label: "2025", category: "Date", icon: Calendar },
    { label: "Tokyo, Japan", category: "Location", icon: MapPin },
    { label: "Kyoto", category: "Location", icon: MapPin },
    { label: "Paris, France", category: "Location", icon: MapPin },
    { label: "Sunset Beach", category: "Location", icon: MapPin },
    { label: "Receipts & OCR", category: "File / Doc", icon: FileText },
    { label: "Screenshots", category: "File / Cat", icon: FileText },
    { label: "Milo Dog", category: "People / Pet", icon: Tag },
  ];

  const handleSelectSearchTerm = (term: string) => {
    onSearchChange(term);
    saveRecentSearch(term);
    onExecuteAISearch(term);
    setShowQuickChips(false);
  };

  const settingsContainerRef = useRef<HTMLDivElement>(null);

  // Close search suggestions and blur keyboard when tapping anywhere outside search container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        (showQuickChips || isSearchExpanded) &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowQuickChips(false);
        if (!searchQuery.trim()) {
          setIsSearchExpanded(false);
        }
        searchInputRef.current?.blur();
      }
      if (
        showSettingsModal &&
        settingsContainerRef.current &&
        !settingsContainerRef.current.contains(event.target as Node)
      ) {
        handleToggleSettingsModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showSettingsModal, showQuickChips, isSearchExpanded, searchQuery]);

  const getViewTitle = () => {
    switch (currentView) {
      case "photos":
        return "Galleyar";
      case "videos":
        return "Videos";
      case "albums":
        return "Albums";
      case "memories":
        return "Memories";
      case "people":
        return "People & Pets";
      case "places":
        return "Places Map";
      case "search":
        return "Smart Search Results";
      case "trash":
        return "Recently Deleted";
      case "hidden":
        return "Personal Diaries";
      default:
        return "Galleyar";
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      onExecuteAISearch(searchQuery.trim());
      setShowQuickChips(false);
    }
  };

  const handleSaveSettings = () => {
    if (onChangeSortBy) onChangeSortBy(draftSortBy);
    if (onChangeSortOrder) onChangeSortOrder(draftSortOrder);
    onChangeGridDensity(draftGridDensity);
    haptics.setEnabled(draftHaptics);
    if (draftHaptics) {
      haptics.success();
    }
    setSavedSettingsNotice("Settings saved successfully!");
    setTimeout(() => {
      setSavedSettingsNotice("");
      handleToggleSettingsModal(false);
    }, 1200);
  };

  if (selectedPhotoIds.length > 0) {
    return (
      <header className="shrink-0 z-40 bg-indigo-950/95 border-b border-indigo-500/50 px-3 sm:px-4 py-2 sm:py-2.5 backdrop-blur-2xl transition-all shadow-xl animate-fade-in">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Side: Exit Selection & Select All & Selection Count */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <button
              onClick={onClearSelection}
              className="p-1.5 sm:p-2 rounded-xl text-indigo-300 hover:text-white hover:bg-indigo-900/80 transition-all cursor-pointer shrink-0"
              title="Exit Selection Mode"
            >
              <X className="w-5 h-5 text-indigo-300" />
            </button>

            {onSelectAll && (
              <button
                onClick={onSelectAll}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isAllSelected
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30"
                    : "bg-indigo-900/60 text-indigo-300 hover:text-white border-indigo-500/40 hover:bg-indigo-800/80"
                }`}
                title={isAllSelected ? "Deselect All Items" : "Select All Items"}
              >
                {isAllSelected ? (
                  <CheckCheck className="w-4 h-4 text-white" />
                ) : (
                  <Check className="w-4 h-4 text-indigo-300" />
                )}
              </button>
            )}

            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base lg:text-lg font-bold text-indigo-100 tracking-tight truncate flex items-center gap-1.5">
                <span>{selectedPhotoIds.length}</span>
                <span className="font-medium text-indigo-200">
                  item{selectedPhotoIds.length > 1 ? "s" : ""} selected
                </span>
              </h2>
            </div>
          </div>

          {/* Right Side: Batch Action Controls */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {onOpenAddToAlbumModal && (
              <button
                onClick={onOpenAddToAlbumModal}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
                title="Add selected items to an album"
              >
                <Plus className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold hidden sm:inline">Add to Album</span>
              </button>
            )}

            {onBatchShare && (
              <button
                onClick={onBatchShare}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-slate-700/60 cursor-pointer transition-all shadow-sm"
                title="Share Selected"
              >
                <Share2 className="w-4 h-4 text-sky-400" />
              </button>
            )}

            <button
              onClick={onBatchFavorite}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-pink-400 border border-slate-700/60 cursor-pointer transition-all shadow-sm"
              title="Favorite Selected"
            >
              <Heart className="w-4 h-4 fill-pink-400 text-pink-400" />
            </button>

            <button
              onClick={onBatchDelete}
              className="p-2 rounded-xl bg-red-900/40 hover:bg-red-900/70 text-red-400 border border-red-700/60 cursor-pointer transition-all shadow-sm"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="shrink-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-b border-slate-800/80 px-3 sm:px-4 py-2 sm:py-2.5">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Side: 3 Lines Menu Icon & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 transition-all cursor-pointer shrink-0"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5 text-slate-200" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-100 tracking-tight truncate">
              {getViewTitle()}
            </h2>
          </div>
        </div>

        {/* Right Side Controls & Search Bar next to Upload Button */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 min-w-0">
          {currentView !== "hidden" && (
            <>
              {/* Search Icon / Elaborated Expandable Search Bar Next to Upload Button */}
              {!isSearchExpanded && !searchQuery.trim() ? (
                <button
                  onClick={() => {
                    setIsSearchExpanded(true);
                    setShowQuickChips(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Search Photos & Videos"
                >
                  <Search className="w-4 h-4 text-indigo-400" />
                  <span className="hidden xl:inline text-xs font-medium text-slate-400">Search</span>
                </button>
              ) : (
                <div ref={searchContainerRef} className="relative transition-all duration-300 w-52 xs:w-64 sm:w-80 md:w-[360px] lg:w-[420px]">
                  <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      onFocus={() => {
                        setIsSearchExpanded(true);
                        setShowQuickChips(true);
                      }}
                      placeholder="Search photos, receipts, location..."
                      className="w-full bg-slate-900/95 border border-indigo-500/60 rounded-2xl pl-8 pr-20 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-lg"
                    />
                    <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2" />

                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          onSearchChange("");
                          setIsSearchExpanded(false);
                          setShowQuickChips(false);
                        }}
                        className="absolute right-16 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                        title="Clear Search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isAISearching || !searchQuery.trim()}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-medium flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer shadow-md"
                    >
                      {isAISearching ? (
                        <span className="animate-spin text-xs">🌀</span>
                      ) : (
                        <Sparkles className="w-3 h-3 text-amber-300" />
                      )}
                      <span>Ask AI</span>
                    </button>
                  </form>

                  {/* Recent Searches & Suggestions Overlay Dropdown */}
                  {showQuickChips && (
                    <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 md:w-[360px] lg:w-[420px] p-3 bg-slate-900/98 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto animate-fade-in text-left">
                      {/* Section 1: Recent Searches (Shown First) */}
                      {recentSearches.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              <span>Recent Searches</span>
                            </span>
                            <button
                              onClick={clearAllRecentSearches}
                              className="text-[10px] font-semibold text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {recentSearches.map((term, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSelectSearchTerm(term)}
                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-200 text-xs font-medium transition-all cursor-pointer shadow-sm"
                              >
                                <History className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
                                <span>{term}</span>
                                <span
                                  onClick={(e) => removeRecentSearch(term, e)}
                                  className="ml-0.5 text-slate-500 hover:text-rose-400 p-0.5 rounded hover:bg-slate-800 transition-colors"
                                  title="Remove from recent"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Suggestions (Shown Below Recent Searches) */}
                      <div className="space-y-2 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Suggestions & Smart Filters</span>
                          </span>
                          <button
                            onClick={() => setShowQuickChips(false)}
                            className="text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {categorizedSuggestions.map((item, idx) => {
                            const IconComp = item.icon;
                            return (
                              <button
                                key={idx}
                                onClick={() => handleSelectSearchTerm(item.label)}
                                className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-800/60 hover:border-slate-700 text-xs transition-all cursor-pointer text-left group"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <IconComp className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                                  <span className="truncate font-medium">{item.label}</span>
                                </div>
                                <span className="text-[9px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/80 shrink-0">
                                  {item.category}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={onOpenUploadModal}
                className="p-2 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Upload Photos"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span className="hidden md:inline text-xs font-semibold">Upload</span>
              </button>
            </>
          )}

          {/* Timeline View Zoom Selector for Photos View */}
          {(currentView === "photos" || currentView === "videos") && (
            <div className="hidden lg:flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-medium">
              {(["years", "months", "days", "all"] as TimelineZoom[]).map(
                (zoom) => (
                  <button
                    key={zoom}
                    onClick={() => onChangeTimelineZoom(zoom)}
                    className={`px-2 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                      timelineZoom === zoom
                        ? "bg-indigo-600 text-white font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {zoom}
                  </button>
                )
              )}
            </div>
          )}

          {/* Grid Density & Settings Buttons */}
          <div className="relative flex items-center gap-1.5">
            {/* Grid Density Buttons */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => onChangeGridDensity("compact")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  gridDensity === "compact"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Compact Grid"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangeGridDensity("comfort")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  gridDensity === "comfort"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Comfort Grid"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Settings Icon in Right Corner */}
          <div className="relative" ref={settingsContainerRef}>
            <button
              onClick={() => handleToggleSettingsModal(!showSettingsModal)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showSettingsModal
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/30"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800"
              }`}
              title="Galleyar Settings"
            >
              <Settings className="w-4 h-4 text-slate-300 hover:text-indigo-300" />
            </button>

            {/* Settings Toggle Dropdown Menu Popover */}
            {showSettingsModal && !showVaultPinModal && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-800/90 rounded-2xl shadow-2xl p-4 sm:p-5 z-50 flex flex-col gap-3.5 animate-fade-in text-left">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {settingsSubTab === "overview" ? (
                      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                        <Settings className="w-4 h-4" />
                      </div>
                    ) : (
                      <button
                        onClick={() => setSettingsSubTab("overview")}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 shrink-0 cursor-pointer flex items-center justify-center transition-all"
                        title="Back to Settings Overview"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-100 truncate">
                        {settingsSubTab === "overview" && "Galleyar Settings"}
                        {settingsSubTab === "sort" && "Sort & Order Photos"}
                        {settingsSubTab === "haptics" && "Haptic Feedback"}
                        {settingsSubTab === "vault" && "Personal Diaries Security"}
                        {settingsSubTab === "grid" && "Grid Density & Layout"}
                        {settingsSubTab === "info" && "Engine & AI Features"}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate">
                        {settingsSubTab === "overview" && "Select an option to customize"}
                        {settingsSubTab === "sort" && "Organize timeline & media listings"}
                        {settingsSubTab === "haptics" && "Tactile vibration feedback"}
                        {settingsSubTab === "vault" && "Passcode protection & privacy"}
                        {settingsSubTab === "grid" && "Adjust thumbnail spacing"}
                        {settingsSubTab === "info" && "AI Search, OCR & Storage stats"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSettingsModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Notification message */}
                {savedSettingsNotice && (
                  <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{savedSettingsNotice}</span>
                  </div>
                )}

                {/* Main Settings Overview List */}
                {settingsSubTab === "overview" && (
                  <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-0.5">
                    {/* 1. Sort By */}
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab("sort")}
                      className="w-full text-left p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-indigo-500/50 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 group-hover:bg-indigo-500/20 transition-all">
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                            Sort Photos & Videos
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">Date, Name, Category, or Size</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                          {draftSortBy === "fileSize" ? "Size" : draftSortBy} • {draftSortOrder === "asc" ? "Asc" : "Desc"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* 2. Haptic Feedback */}
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab("haptics")}
                      className="w-full text-left p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-amber-500/50 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 group-hover:bg-amber-500/20 transition-all">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                            Haptic Feedback
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">Touch vibration for swipes & editor</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            draftHaptics
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {draftHaptics ? "Enabled" : "Off"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* 3. Private Vault Security */}
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab("vault")}
                      className="w-full text-left p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-emerald-500/50 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 group-hover:bg-emerald-500/20 transition-all">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                            Personal Diaries Security
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">Passcode & lock controls</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isVaultPinSet
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {isVaultPinSet ? "Protected" : "Set Passcode"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* 4. Grid Density */}
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab("grid")}
                      className="w-full text-left p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-sky-500/50 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0 group-hover:bg-sky-500/20 transition-all">
                          <Grid className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                            Grid Density & Layout
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">Compact vs Comfort layout</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-semibold text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/30 capitalize">
                          {draftGridDensity}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* 5. Engine & AI Info */}
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab("info")}
                      className="w-full text-left p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-purple-500/50 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 group-hover:bg-purple-500/20 transition-all">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                            Galleyar Engine & AI
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">OCR, search & database details</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                          Active
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Sub-Tab 1: Sort & Order */}
                {settingsSubTab === "sort" && (
                  <div className="space-y-3.5 max-h-[62vh] overflow-y-auto pr-0.5 animate-fade-in">
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 block">
                        Select Sort Field:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "date" as SortByOption, label: "Date Taken", desc: "Chronological" },
                          { id: "title" as SortByOption, label: "Name / Title", desc: "Alphabetical" },
                          { id: "category" as SortByOption, label: "Category", desc: "Type & Tag" },
                          { id: "fileSize" as SortByOption, label: "File Size", desc: "Storage size" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setDraftSortBy(item.id);
                              if (draftHaptics) haptics.selection();
                            }}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1 ${
                              draftSortBy === item.id
                                ? "bg-indigo-600/25 text-indigo-100 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30"
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold">{item.label}</span>
                              {draftSortBy === item.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 block">
                        Select Direction:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftSortOrder("asc");
                            if (draftHaptics) haptics.selection();
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            draftSortOrder === "asc"
                              ? "bg-indigo-600/25 text-indigo-100 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <ArrowUp className="w-4 h-4 text-emerald-400" />
                          <span>Ascending (A-Z)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftSortOrder("desc");
                            if (draftHaptics) haptics.selection();
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            draftSortOrder === "desc"
                              ? "bg-indigo-600/25 text-indigo-100 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <ArrowDown className="w-4 h-4 text-indigo-400" />
                          <span>Descending (Z-A)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: Haptic Feedback */}
                {settingsSubTab === "haptics" && (
                  <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-0.5 animate-fade-in">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-100">Tactile Haptics</div>
                          <p className="text-[11px] text-slate-400">Vibrate on taps, swipes & editor actions</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !draftHaptics;
                            setDraftHaptics(next);
                            if (next) haptics.selection();
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            draftHaptics ? "bg-amber-500" : "bg-slate-800"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              draftHaptics ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Test Haptics Section */}
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-amber-400 block">
                        Test Vibration Feedback:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => haptics.selection()}
                          className="py-2 px-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-all cursor-pointer text-center"
                        >
                          Selection
                        </button>
                        <button
                          type="button"
                          onClick={() => haptics.success()}
                          className="py-2 px-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-[11px] font-semibold text-emerald-300 transition-all cursor-pointer text-center"
                        >
                          Success
                        </button>
                        <button
                          type="button"
                          onClick={() => haptics.warning()}
                          className="py-2 px-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 text-[11px] font-semibold text-amber-300 transition-all cursor-pointer text-center"
                        >
                          Warning
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 3: Private Vault Security */}
                {settingsSubTab === "vault" && (
                  <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-0.5 animate-fade-in">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-xl border ${
                              isVaultPinSet
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}
                          >
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-100">Passcode Protection</div>
                            <p className="text-[11px] text-slate-400">
                              {isVaultPinSet ? "4-digit PIN is currently active" : "No passcode configured yet"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            isVaultPinSet
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {isVaultPinSet ? "Active" : "Not Set"}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Setting a numeric PIN locks your hidden media. Browsing or unhiding items from the Private Vault will prompt for this passcode.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          handleToggleSettingsModal(false);
                          setShowVaultPinModal(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/30"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>{isVaultPinSet ? "Change Passcode PIN" : "Configure Passcode Lock"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 4: Grid Density */}
                {settingsSubTab === "grid" && (
                  <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-0.5 animate-fade-in">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-sky-400 block">
                        Select Grid Spacing:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftGridDensity("compact");
                            if (draftHaptics) haptics.selection();
                          }}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                            draftGridDensity === "compact"
                              ? "bg-sky-600/25 text-sky-100 border-sky-500/80 shadow-md ring-1 ring-sky-500/30"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Grid className="w-4 h-4 text-sky-400" />
                            {draftGridDensity === "compact" && <Check className="w-3.5 h-3.5 text-sky-400" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold">Compact</div>
                            <p className="text-[10px] text-slate-400 mt-0.5">More photos on screen</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDraftGridDensity("comfort");
                            if (draftHaptics) haptics.selection();
                          }}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                            draftGridDensity === "comfort"
                              ? "bg-sky-600/25 text-sky-100 border-sky-500/80 shadow-md ring-1 ring-sky-500/30"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                            {draftGridDensity === "comfort" && <Check className="w-3.5 h-3.5 text-sky-400" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold">Comfort</div>
                            <p className="text-[10px] text-slate-400 mt-0.5">Spacious with details</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 5: App Info & AI Engine */}
                {settingsSubTab === "info" && (
                  <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-0.5 animate-fade-in">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>AI Search & Intelligent Index</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Galleyar uses natural language search processing, automatic receipt/OCR text extraction, facial grouping, and location metadata indexing.
                      </p>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                          <Database className="w-4 h-4 text-slate-400" />
                          <span>Local Database Storage</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          IndexedDB Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        All photo changes, albums, and custom metadata are automatically persisted in your local web storage.
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-800">
                  {settingsSubTab !== "overview" && (
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab("overview")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer mr-auto flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleSettingsModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>

          <VaultPinModal
            isOpen={showVaultPinModal}
            onClose={() => setShowVaultPinModal(false)}
            onSuccess={() => setIsVaultPinSet(isPinConfigured())}
          />
        </div>
      </div>
    </header>
  );
});


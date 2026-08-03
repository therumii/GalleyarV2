import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { GridDensity, SortByOption, SortOrderOption, TimelineZoom, ViewMode } from "../types";
import { isPinConfigured } from "../utils/cryptoVault";
import { VaultPinModal } from "./VaultPinModal";

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
  onToggleSidebar: () => void;
  onOpenUploadModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
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
  onToggleSidebar,
  onOpenUploadModal,
}) => {
  const [showQuickChips, setShowQuickChips] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showVaultPinModal, setShowVaultPinModal] = useState(false);
  const [isVaultPinSet, setIsVaultPinSet] = useState<boolean>(() => isPinConfigured());
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Draft settings state (separate draft vs saved settings)
  const [draftSortBy, setDraftSortBy] = useState<SortByOption>(sortBy);
  const [draftSortOrder, setDraftSortOrder] = useState<SortOrderOption>(sortOrder);
  const [draftGridDensity, setDraftGridDensity] = useState<GridDensity>(gridDensity);

  const handleToggleSettingsModal = () => {
    if (!showSettingsModal) {
      // Opening modal: copy current saved settings to draft
      setDraftSortBy(sortBy);
      setDraftSortOrder(sortOrder);
      setDraftGridDensity(gridDensity);
      setIsVaultPinSet(isPinConfigured());
      setShowSettingsModal(true);
    } else {
      setShowSettingsModal(false);
    }
  };

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
        settingsContainerRef.current &&
        !settingsContainerRef.current.contains(event.target as Node)
      ) {
        setShowSettingsModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

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
        return "Private Vault";
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
    setSavedSettingsNotice("Settings saved successfully!");
    setTimeout(() => {
      setSavedSettingsNotice("");
      setShowSettingsModal(false);
    }, 1200);
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-2xl border-b border-slate-800/80 px-3 sm:px-4 py-2 sm:py-2.5">
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
              onClick={handleToggleSettingsModal}
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
            {showSettingsModal && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-800/90 rounded-2xl shadow-2xl p-4 sm:p-5 z-50 flex flex-col gap-4 animate-fade-in text-left">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Galleyar Settings</h3>
                      <p className="text-[11px] text-slate-400">Preferences and photo controls</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
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

                {/* Settings Sections */}
                <div className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1">
                  {/* App Info */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Galleyar Engine & AI</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Galleyar runs with smart AI natural language search, auto OCR receipt extraction, and facial recognition.
                    </p>
                  </div>

                  {/* Sort Photos Preferences */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Sort Photos & Videos</span>
                      </div>
                      <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        {draftSortBy === "fileSize" ? "Size" : draftSortBy} • {draftSortOrder === "asc" ? "Asc" : "Desc"}
                      </span>
                    </div>

                    {/* Sort Field Options */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Sort Field:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "date" as SortByOption, label: "Date Taken" },
                          { id: "title" as SortByOption, label: "Name / Title" },
                          { id: "category" as SortByOption, label: "Category" },
                          { id: "fileSize" as SortByOption, label: "File Size" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setDraftSortBy(item.id)}
                            className={`p-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between cursor-pointer transition-all ${
                              draftSortBy === item.id
                                ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm"
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                            }`}
                          >
                            <span>{item.label}</span>
                            {draftSortBy === item.id && <Check className="w-3 h-3 text-indigo-400" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort Order Direction */}
                    <div className="space-y-1 pt-1 border-t border-slate-800/60">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Sort Direction:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDraftSortOrder("asc")}
                          className={`p-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            draftSortOrder === "asc"
                              ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <ArrowUp className="w-3 h-3 text-emerald-400" />
                          <span>Ascending</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraftSortOrder("desc")}
                          className={`p-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            draftSortOrder === "desc"
                              ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <ArrowDown className="w-3 h-3 text-indigo-400" />
                          <span>Descending</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* View Layout & Density */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <Grid className="w-3.5 h-3.5 text-slate-400" />
                      <span>Grid Density</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDraftGridDensity("compact")}
                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          draftGridDensity === "compact"
                            ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/60"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span>Compact</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftGridDensity("comfort")}
                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          draftGridDensity === "comfort"
                            ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/60"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Comfort</span>
                      </button>
                    </div>
                  </div>

                  {/* Vault Security */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Private Vault Security</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isVaultPinSet
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {isVaultPinSet ? "PIN Configured" : "PIN Not Configured"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isVaultPinSet
                        ? "Passcode access control is active for Private Vault media."
                        : "Set up a numeric passcode to protect your hidden photos."}
                    </p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsModal(false);
                          setShowVaultPinModal(true);
                        }}
                        className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-indigo-300 hover:text-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{isVaultPinSet ? "Change Passcode" : "Set Up Passcode"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Local Storage */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        <span>Local Database Persistence</span>
                      </div>
                      <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Changes are synced to local storage automatically.
                    </p>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
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
};


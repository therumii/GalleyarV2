import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  Folder,
  Plus,
  Heart,
  FileText,
  Dog,
  Compass,
  Mountain,
  ChevronRight,
  X,
  Trash2,
  FolderHeart,
  Check,
  CheckCheck,
  Edit,
  Pencil,
  Image,
  ArrowLeft,
  MinusCircle,
  CheckSquare,
  CheckCircle,
  Share2,
  MoreVertical,
  Copy,
  FolderPlus,
  Play,
} from "lucide-react";
import { Album, Photo } from "../types";
import { BatchShareModal } from "./BatchShareModal";

interface AlbumPhotoCardProps {
  photo: Photo;
  albumPhotos: Photo[];
  isSelected: boolean;
  hasSelectionMode: boolean;
  onToggleSelectPhoto: (photoId: string) => void;
  onOpenPhoto: (photo: Photo, albumPhotosList?: Photo[]) => void;
  onRemoveFromAlbum?: (albumId: string, photoId: string) => void;
  onSetAsCover?: (photoUrl: string) => void;
  selectedAlbumId: string;
  onOpenMoveCopyModal?: (photoIds: string[]) => void;
}

const AlbumPhotoCard: React.FC<AlbumPhotoCardProps> = ({
  photo,
  albumPhotos,
  isSelected,
  hasSelectionMode,
  onToggleSelectPhoto,
  onOpenPhoto,
  onRemoveFromAlbum,
  onSetAsCover,
  selectedAlbumId,
  onOpenMoveCopyModal,
}) => {
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
        onOpenPhoto(photo, albumPhotos);
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

  const handleClick = () => {
    if (isHoldRef.current) {
      isHoldRef.current = false;
      return;
    }
    if (hasSelectionMode) {
      onToggleSelectPhoto(photo.id);
    } else {
      onOpenPhoto(photo, albumPhotos);
    }
  };

  return (
    <div
      onPointerDown={(e) => startHold(e.clientX, e.clientY)}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onClick={handleClick}
      className={`group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border transition-all cursor-pointer shadow-md select-none ${
        isSelected
          ? "border-indigo-500 ring-2 ring-indigo-500/50 scale-[0.98]"
          : "border-slate-800 hover:border-indigo-500"
      }`}
    >
      <img
        src={photo.url}
        alt={photo.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform pointer-events-none"
      />

      {/* Quick "Set as Album Cover" Button */}
      {onSetAsCover && !hasSelectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetAsCover(photo.url);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-md z-10 cursor-pointer"
          title="Set as album cover"
        >
          <Image className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Video Indicator: Minimal Play Button & Duration Timestamp */}
      {(photo.isVideo || photo.duration) && (
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between pointer-events-none z-10">
          <div className="w-6 h-6 rounded-full bg-slate-950/75 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-3 h-3 fill-white text-white translate-x-[0.5px]" />
          </div>
          <span className="px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-white/10 backdrop-blur-md text-[10px] sm:text-[11px] font-mono font-semibold text-white/95 shadow-md">
            {photo.duration || "0:15"}
          </span>
        </div>
      )}
    </div>
  );
};

interface AlbumsViewProps {
  albums: Album[];
  photos: Photo[];
  onCreateAlbum: (name: string, description: string) => void;
  onEditAlbum?: (albumId: string, name: string, description: string) => void;
  onChangeAlbumCover?: (albumId: string, coverUrl: string) => void;
  onAddPhotosToAlbum?: (albumId: string, photoIds: string[]) => void;
  onRemoveFromAlbum?: (albumId: string, photoId: string) => void;
  onDeleteAlbum?: (albumId: string) => void;
  onOpenPhoto: (photo: Photo, albumPhotosList?: Photo[]) => void;
  onToggleFavorite?: (photoId: string) => void;
  onDeletePhoto?: (photoId: string) => void;
  onOpenedAlbumChange?: (isOpened: boolean) => void;
  selectedAlbumIdProp?: string | null;
  onSelectAlbum?: (albumId: string | null) => void;
}

export interface AlbumsViewRef {
  handleBack: () => boolean;
}

export const AlbumsView = forwardRef<AlbumsViewRef, AlbumsViewProps>(({
  albums = [],
  photos = [],
  onCreateAlbum,
  onEditAlbum,
  onChangeAlbumCover,
  onAddPhotosToAlbum,
  onRemoveFromAlbum,
  onDeleteAlbum,
  onOpenPhoto,
  onToggleFavorite,
  onDeletePhoto,
  onOpenedAlbumChange,
  selectedAlbumIdProp,
  onSelectAlbum,
}, ref) => {
  const [internalSelectedAlbumId, setInternalSelectedAlbumId] = useState<string | null>(null);
  const selectedAlbumId = selectedAlbumIdProp !== undefined ? selectedAlbumIdProp : internalSelectedAlbumId;

  const handleSetSelectedAlbumId = (id: string | null) => {
    setInternalSelectedAlbumId(id);
    if (onSelectAlbum) {
      onSelectAlbum(id);
    }
  };

  // Notify parent component whether an album is currently opened
  useEffect(() => {
    if (onOpenedAlbumChange) {
      onOpenedAlbumChange(Boolean(selectedAlbumId));
    }
  }, [selectedAlbumId, onOpenedAlbumChange]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDesc, setNewAlbumDesc] = useState("");

  // Album Photos Multi-Selection State
  const [selectedPhotoIdsInAlbum, setSelectedPhotoIdsInAlbum] = useState<string[]>([]);

  // Edit Album Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAlbumName, setEditAlbumName] = useState("");
  const [editAlbumDesc, setEditAlbumDesc] = useState("");

  // Add Photos to Album Modal State
  const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);
  const [selectedPhotoIdsToAdd, setSelectedPhotoIdsToAdd] = useState<string[]>([]);

  // Move / Copy to Album Modal State
  const [showMoveCopyModal, setShowMoveCopyModal] = useState(false);
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [moveCopyMode, setMoveCopyMode] = useState<"move" | "copy">("move");
  const [targetPhotoIdsForMoveCopy, setTargetPhotoIdsForMoveCopy] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Change Cover Photo Modal State
  const [showCoverPickerModal, setShowCoverPickerModal] = useState(false);
  const [coverPickerAlbum, setCoverPickerAlbum] = useState<Album | null>(null);
  const [coverPickerTab, setCoverPickerTab] = useState<"album" | "all">("album");

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (showCoverPickerModal) {
        setShowCoverPickerModal(false);
        setCoverPickerAlbum(null);
        return true;
      }
      if (showCreateModal) {
        setShowCreateModal(false);
        return true;
      }
      if (showEditModal) {
        setShowEditModal(false);
        return true;
      }
      if (showAddPhotosModal) {
        setShowAddPhotosModal(false);
        setSelectedPhotoIdsToAdd([]);
        return true;
      }
      if (showMoveCopyModal) {
        setShowMoveCopyModal(false);
        setTargetPhotoIdsForMoveCopy([]);
        return true;
      }
      if (showBatchShareModal) {
        setShowBatchShareModal(false);
        return true;
      }
      if (selectedPhotoIdsInAlbum.length > 0) {
        setSelectedPhotoIdsInAlbum([]);
        return true;
      }
      if (selectedAlbumId) {
        handleSetSelectedAlbumId(null);
        return true;
      }
      return false;
    },
  }));

  const handleOpenCoverPicker = (album: Album, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCoverPickerAlbum(album);
    setCoverPickerTab("album");
    setShowCoverPickerModal(true);
  };

  const handleSelectCoverPhoto = (coverUrl: string) => {
    if (!coverPickerAlbum) return;
    onChangeAlbumCover?.(coverPickerAlbum.id, coverUrl);
    setToastMessage(`Album cover updated for "${coverPickerAlbum.name}"!`);
    setTimeout(() => setToastMessage(null), 3000);
    setShowCoverPickerModal(false);
    setCoverPickerAlbum(null);
  };

  const handleOpenMoveCopy = (photoIds: string[]) => {
    if (photoIds.length === 0) return;
    setTargetPhotoIdsForMoveCopy(photoIds);
    setMoveCopyMode("move");
    setShowMoveCopyModal(true);
  };

  const handleExecuteMoveCopy = (destAlbumId: string) => {
    const destAlbum = albums.find((a) => a.id === destAlbumId);
    if (!destAlbum || targetPhotoIdsForMoveCopy.length === 0) return;

    if (moveCopyMode === "copy") {
      if (onAddPhotosToAlbum) {
        onAddPhotosToAlbum(destAlbumId, targetPhotoIdsForMoveCopy);
      }
      setToastMessage(`Copied ${targetPhotoIdsForMoveCopy.length} item(s) to "${destAlbum.name}"`);
    } else {
      if (onAddPhotosToAlbum) {
        onAddPhotosToAlbum(destAlbumId, targetPhotoIdsForMoveCopy);
      }
      if (selectedAlbumId && onRemoveFromAlbum) {
        targetPhotoIdsForMoveCopy.forEach((id) => {
          onRemoveFromAlbum(selectedAlbumId, id);
        });
      }
      setToastMessage(`Moved ${targetPhotoIdsForMoveCopy.length} item(s) to "${destAlbum.name}"`);
    }

    setSelectedPhotoIdsInAlbum([]);
    setShowMoveCopyModal(false);
    setTargetPhotoIdsForMoveCopy([]);

    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId);
  const isSelectedFavAlbum = selectedAlbum?.id === "album-favorites";
  const albumPhotos = selectedAlbum
    ? isSelectedFavAlbum
      ? photos.filter((p) => p.isFavorite && !p.isTrash && !p.isHidden)
      : photos.filter((p) => selectedAlbum.photoIds?.includes(p.id) && !p.isTrash && !p.isHidden)
    : [];

  // If selected album no longer exists or becomes empty, automatically exit to albums grid
  useEffect(() => {
    if (selectedAlbumId) {
      const currentAlb = albums.find((a) => a.id === selectedAlbumId);
      if (!currentAlb || albumPhotos.length === 0) {
        handleSetSelectedAlbumId(null);
      }
    }
  }, [selectedAlbumId, albumPhotos.length, albums]);

  const isAllSelectedInAlbum =
    albumPhotos.length > 0 &&
    albumPhotos.every((p) => selectedPhotoIdsInAlbum.includes(p.id));

  const handleToggleSelectAllInAlbum = () => {
    if (isAllSelectedInAlbum) {
      setSelectedPhotoIdsInAlbum([]);
    } else {
      setSelectedPhotoIdsInAlbum(albumPhotos.map((p) => p.id));
    }
  };

  const handleToggleSelectPhotoInAlbum = (photoId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedPhotoIdsInAlbum((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleBatchRemoveFromAlbum = () => {
    if (!selectedAlbum || !onRemoveFromAlbum) return;
    selectedPhotoIdsInAlbum.forEach((id) => {
      onRemoveFromAlbum(selectedAlbum.id, id);
    });
    setSelectedPhotoIdsInAlbum([]);
  };

  const handleBatchFavoriteAlbum = () => {
    if (!onToggleFavorite) return;
    selectedPhotoIdsInAlbum.forEach((id) => {
      onToggleFavorite(id);
    });
    setSelectedPhotoIdsInAlbum([]);
  };

  const handleBatchDeleteAlbum = () => {
    if (!onDeletePhoto) return;
    selectedPhotoIdsInAlbum.forEach((id) => {
      onDeletePhoto(id);
    });
    setSelectedPhotoIdsInAlbum([]);
  };

  const handleBatchShareAlbum = () => {
    const selected = albumPhotos.filter((p) => selectedPhotoIdsInAlbum.includes(p.id));
    if (selected.length === 0) return;
    setShowBatchShareModal(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAlbumName.trim()) {
      onCreateAlbum(newAlbumName.trim(), newAlbumDesc.trim());
      setNewAlbumName("");
      setNewAlbumDesc("");
      setShowCreateModal(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAlbum && editAlbumName.trim() && onEditAlbum) {
      onEditAlbum(selectedAlbum.id, editAlbumName.trim(), editAlbumDesc.trim());
      setShowEditModal(false);
    }
  };

  const handleAddPhotosSubmit = () => {
    if (selectedAlbum && selectedPhotoIdsToAdd.length > 0 && onAddPhotosToAlbum) {
      onAddPhotosToAlbum(selectedAlbum.id, selectedPhotoIdsToAdd);
      setSelectedPhotoIdsToAdd([]);
      setShowAddPhotosModal(false);
    }
  };

  const openEditModal = () => {
    if (selectedAlbum) {
      setEditAlbumName(selectedAlbum.name);
      setEditAlbumDesc(selectedAlbum.description || "");
      setShowEditModal(true);
    }
  };

  const getAlbumIcon = (iconName?: string) => {
    switch (iconName) {
      case "Heart":
        return Heart;
      case "FileText":
        return FileText;
      case "Dog":
        return Dog;
      case "Compass":
        return Compass;
      case "Mountain":
        return Mountain;
      default:
        return Folder;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-36 sm:pb-40">
      {/* If viewing a specific album */}
      {selectedAlbum ? (
        <div className="space-y-6 animate-fade-in">
          {/* Album Header (Transforms into Action Toggle Bar when items are selected) */}
          {selectedPhotoIdsInAlbum.length > 0 ? (
            <div className="flex items-center justify-between bg-indigo-950/95 border border-indigo-500/50 p-3 sm:p-4 rounded-3xl shadow-xl backdrop-blur-xl animate-fade-in gap-3">
              {/* Left Side: Clear Selection & Select All & Selection Count */}
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setSelectedPhotoIdsInAlbum([])}
                  className="p-1.5 sm:p-2 rounded-xl text-indigo-300 hover:text-white hover:bg-indigo-900/80 transition-all cursor-pointer shrink-0"
                  title="Exit Selection Mode"
                >
                  <X className="w-5 h-5 text-indigo-300" />
                </button>

                <button
                  onClick={handleToggleSelectAllInAlbum}
                  className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    isAllSelectedInAlbum
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30"
                      : "bg-indigo-900/60 text-indigo-300 hover:text-white border-indigo-500/40 hover:bg-indigo-800/80"
                  }`}
                  title={isAllSelectedInAlbum ? "Deselect All Items" : "Select All Items"}
                >
                  {isAllSelectedInAlbum ? (
                    <CheckCheck className="w-4 h-4 text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-indigo-300" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base lg:text-lg font-bold text-indigo-100 tracking-tight truncate flex items-center gap-1.5">
                    <span>{selectedPhotoIdsInAlbum.length}</span>
                    <span className="font-medium text-indigo-200">
                      item{selectedPhotoIdsInAlbum.length > 1 ? "s" : ""} selected
                    </span>
                  </h2>
                </div>
              </div>

              {/* Right Side: Batch Actions */}
              <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => handleOpenMoveCopy(selectedPhotoIdsInAlbum)}
                  className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 cursor-pointer shadow-md flex items-center gap-1.5 transition-all text-xs font-semibold"
                  title="Move or Copy selected to album"
                >
                  <MoreVertical className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Move / Copy</span>
                </button>

                {onRemoveFromAlbum && (
                  <button
                    onClick={handleBatchRemoveFromAlbum}
                    className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 cursor-pointer transition-all shadow-sm"
                    title="Remove selected from album"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleBatchShareAlbum}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-700/60 cursor-pointer transition-all shadow-sm"
                  title="Share Selected"
                >
                  <Share2 className="w-4 h-4 text-sky-400" />
                </button>

                {onToggleFavorite && (
                  <button
                    onClick={handleBatchFavoriteAlbum}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-700/60 cursor-pointer transition-all shadow-sm"
                    title="Favorite Selected"
                  >
                    <Heart className="w-4 h-4 fill-pink-400 text-pink-400" />
                  </button>
                )}

                {onDeletePhoto && (
                  <button
                    onClick={handleBatchDeleteAlbum}
                    className="p-2 rounded-xl bg-red-900/40 hover:bg-red-900/70 text-red-400 border border-red-700/60 cursor-pointer transition-all shadow-sm"
                    title="Delete Selected"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between bg-slate-900/90 p-5 rounded-3xl border border-slate-800 gap-4 shadow-lg">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleSetSelectedAlbumId(null)}
                  className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                    <span>{selectedAlbum.name}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {albumPhotos.length} photos
                    </span>
                  </h2>
                  {selectedAlbum.description && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedAlbum.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Select All / Deselect All Items in Album */}
                {albumPhotos.length > 0 && (
                  <button
                    onClick={handleToggleSelectAllInAlbum}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isAllSelectedInAlbum || selectedPhotoIdsInAlbum.length > 0
                        ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/80"
                    }`}
                    title={isAllSelectedInAlbum ? "Deselect All Items" : "Select All Items"}
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isAllSelectedInAlbum ? "Deselect All" : "Select All"}</span>
                  </button>
                )}

                {/* Add Photos to Album */}
                <button
                  onClick={() => {
                    setSelectedPhotoIdsToAdd([]);
                    setShowAddPhotosModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Photos</span>
                </button>

                {/* Change Cover Photo */}
                <button
                  onClick={() => handleOpenCoverPicker(selectedAlbum)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Change album cover photo"
                >
                  <Image className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cover</span>
                </button>

                {/* Edit Album Details */}
                <button
                  onClick={openEditModal}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Edit</span>
                </button>

                {/* Delete Album */}
                {selectedAlbum.type !== "system" && onDeleteAlbum && (
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete album "${selectedAlbum.name}"?`)) {
                        onDeleteAlbum(selectedAlbum.id);
                        handleSetSelectedAlbumId(null);
                      }
                    }}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                    title="Delete Album"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}



          {/* Album Photos Grid */}
          {albumPhotos.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-3xl text-slate-500 space-y-3">
              <Folder className="w-12 h-12 mx-auto text-slate-600" />
              <h3 className="text-sm font-bold text-slate-200">
                This album is empty
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add photos to this album to keep your memories organized.
              </p>
              <button
                onClick={() => setShowAddPhotosModal(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Photos Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {albumPhotos.map((photo) => (
                <AlbumPhotoCard
                  key={photo.id}
                  photo={photo}
                  albumPhotos={albumPhotos}
                  isSelected={selectedPhotoIdsInAlbum.includes(photo.id)}
                  hasSelectionMode={selectedPhotoIdsInAlbum.length > 0}
                  onToggleSelectPhoto={(id) => handleToggleSelectPhotoInAlbum(id)}
                  onOpenPhoto={onOpenPhoto}
                  onRemoveFromAlbum={onRemoveFromAlbum}
                  onSetAsCover={(url) => handleSelectCoverPhoto(url)}
                  selectedAlbumId={selectedAlbum.id}
                  onOpenMoveCopyModal={(ids) => handleOpenMoveCopy(ids)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Albums Grid View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Your Albums</h2>
              <p className="text-xs text-slate-400">
                Organized collections, favorites, and custom albums
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Album</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {albums.map((album) => {
              const IconComponent = getAlbumIcon(album.icon);
              const isFavAlbum = album.id === "album-favorites";
              const validAlbumPhotos = isFavAlbum
                ? photos.filter((p) => p.isFavorite && !p.isTrash && !p.isHidden)
                : photos.filter((p) => album.photoIds?.includes(p.id) && !p.isTrash && !p.isHidden);
              const count = validAlbumPhotos.length;
              const displayCover = album.coverUrl || validAlbumPhotos[0]?.url;

              return (
                <div
                  key={album.id}
                  onClick={() => handleSetSelectedAlbumId(album.id)}
                  className="group rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-sm relative"
                >
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 mb-3 relative">
                    {displayCover ? (
                      <img
                        src={displayCover}
                        alt={album.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Folder className="w-10 h-10" />
                      </div>
                    )}

                    <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md text-indigo-400 border border-slate-700/50">
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Change Cover Button on Album Card */}
                    <button
                      onClick={(e) => handleOpenCoverPicker(album, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-md z-10 cursor-pointer"
                      title="Change album cover"
                    >
                      <Image className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-slate-200">
                      {count} items
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                      <span>{album.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {album.description || "Collection"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create New Album Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FolderHeart className="w-5 h-5 text-indigo-400" />
                <span>Create New Album</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Album Name
                </label>
                <input
                  type="text"
                  required
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="e.g. Summer Roadtrip 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newAlbumDesc}
                  onChange={(e) => setNewAlbumDesc(e.target.value)}
                  placeholder="Add a memorable note or description..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Album Details Modal */}
      {showEditModal && selectedAlbum && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-400" />
                <span>Edit Album Info</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Album Name
                </label>
                <input
                  type="text"
                  required
                  value={editAlbumName}
                  onChange={(e) => setEditAlbumName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description
                </label>
                <textarea
                  value={editAlbumDesc}
                  onChange={(e) => setEditAlbumDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Cover Photo Option in Edit Modal */}
              <div className="pt-1">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Album Cover Photo
                </label>
                <div className="flex items-center gap-3 p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-700/50">
                    {selectedAlbum.coverUrl ? (
                      <img
                        src={selectedAlbum.coverUrl}
                        alt="Current Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Image className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">
                      {selectedAlbum.coverUrl ? "Custom cover selected" : "Default album photo"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        handleOpenCoverPicker(selectedAlbum);
                      }}
                      className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Image className="w-3.5 h-3.5" />
                      <span>Choose New Cover Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Photos to Album Modal */}
      {showAddPhotosModal && selectedAlbum && (() => {
        const isFavModalAlbum = selectedAlbum.id === "album-favorites";
        const candidatePhotos = photos.filter(
          (p) => !p.isTrash && !p.isHidden && (isFavModalAlbum ? !p.isFavorite : !selectedAlbum.photoIds.includes(p.id))
        );
        const isAllCandidatesSelected =
          candidatePhotos.length > 0 &&
          candidatePhotos.every((p) => selectedPhotoIdsToAdd.includes(p.id));

        const toggleSelectAllCandidates = () => {
          if (isAllCandidatesSelected) {
            setSelectedPhotoIdsToAdd([]);
          } else {
            setSelectedPhotoIdsToAdd(candidatePhotos.map((p) => p.id));
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[88vh] h-full sm:h-auto flex flex-col p-4 sm:p-6 shadow-2xl animate-fade-in overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 shrink-0 gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 truncate">
                    <Plus className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate">Add Photos to "{selectedAlbum.name}"</span>
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    Select photos from gallery to include in this album
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {candidatePhotos.length > 0 && (
                    <button
                      onClick={toggleSelectAllCandidates}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{isAllCandidatesSelected ? "Deselect All" : "Select All"}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowAddPhotosModal(false);
                      setSelectedPhotoIdsToAdd([]);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Photo Grid */}
              <div className="flex-1 min-h-0 overflow-y-auto py-3 px-1 my-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photos
                    .filter((p) => !p.isTrash && !p.isHidden)
                    .map((photo) => {
                      const alreadyInAlbum = isFavModalAlbum ? photo.isFavorite : selectedAlbum.photoIds.includes(photo.id);
                      const isSelected = selectedPhotoIdsToAdd.includes(photo.id) || alreadyInAlbum;

                      return (
                        <div
                          key={photo.id}
                          onClick={() => {
                            if (alreadyInAlbum) return;
                            if (selectedPhotoIdsToAdd.includes(photo.id)) {
                              setSelectedPhotoIdsToAdd(
                                selectedPhotoIdsToAdd.filter((id) => id !== photo.id)
                              );
                            } else {
                              setSelectedPhotoIdsToAdd([...selectedPhotoIdsToAdd, photo.id]);
                            }
                          }}
                          className={`group relative aspect-square rounded-2xl overflow-hidden border transition-all select-none shadow-md ${
                            alreadyInAlbum
                              ? "border-emerald-500/50 opacity-80 cursor-default"
                              : isSelected
                              ? "border-indigo-500 ring-2 ring-indigo-500/50 cursor-pointer scale-[0.98]"
                              : "border-slate-800 hover:border-slate-700 cursor-pointer"
                          }`}
                        >
                          <img
                            src={photo.url}
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div
                            className={`absolute top-2 right-2 w-6 h-6 rounded-full border flex items-center justify-center transition-all shadow-lg z-10 ${
                              alreadyInAlbum
                                ? "bg-emerald-600 border-emerald-400 text-white"
                                : isSelected
                                ? "bg-indigo-600 border-indigo-400 text-white"
                                : "bg-slate-950/70 border-slate-600 text-transparent opacity-80 group-hover:opacity-100"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>

                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent">
                            <p className="text-[10px] font-medium text-slate-200 truncate">
                              {photo.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-800 pt-3.5 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xs text-slate-400 font-medium text-center sm:text-left">
                  {selectedPhotoIdsToAdd.length} new photos selected
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => {
                      setShowAddPhotosModal(false);
                      setSelectedPhotoIdsToAdd([]);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={selectedPhotoIdsToAdd.length === 0}
                    onClick={handleAddPhotosSubmit}
                    className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold cursor-pointer shadow-md transition-colors"
                  >
                    Add Selected
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Move / Copy to Album Picker Modal */}
      {showMoveCopyModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <MoreVertical className="w-5 h-5 text-indigo-400" />
                  <span>Move or Copy to Album</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Targeting {targetPhotoIdsForMoveCopy.length} item{targetPhotoIdsForMoveCopy.length > 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setShowMoveCopyModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selection Tabs (Move vs Copy) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
              <button
                onClick={() => setMoveCopyMode("move")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  moveCopyMode === "move"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FolderPlus className="w-4 h-4 text-indigo-200" />
                <span>Move to Album</span>
              </button>
              <button
                onClick={() => setMoveCopyMode("copy")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  moveCopyMode === "copy"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Copy className="w-4 h-4 text-indigo-200" />
                <span>Copy to Album</span>
              </button>
            </div>

            {/* Destination Album List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-slate-300">Select Target Album:</p>
              {albums.map((album) => {
                const isCurrent = album.id === selectedAlbumId;
                const IconComp = getAlbumIcon(album.icon);
                const albumPhotoCount = album.photoIds?.length || 0;
                const isDisabled = isCurrent && moveCopyMode === "move";

                return (
                  <div
                    key={album.id}
                    onClick={() => {
                      if (!isDisabled) {
                        handleExecuteMoveCopy(album.id);
                      }
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all select-none ${
                      isDisabled
                        ? "bg-slate-950/40 border-slate-800/60 opacity-40 cursor-not-allowed"
                        : "bg-slate-950/80 border-slate-800/80 hover:border-indigo-500/60 hover:bg-slate-850 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-100 truncate flex items-center gap-2">
                          <span>{album.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">
                              Current
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          {albumPhotoCount} item{albumPhotoCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    {!isDisabled && (
                      <span className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white text-[11px] font-bold border border-indigo-500/30 transition-all shrink-0">
                        {moveCopyMode === "move" ? "Move Here" : "Copy Here"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Create Album Option */}
            <div className="border-t border-slate-800 pt-3">
              <button
                onClick={() => {
                  setShowMoveCopyModal(false);
                  setShowCreateModal(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>+ Create New Album</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Item Share Modal for Album Selection */}
      <BatchShareModal
        isOpen={showBatchShareModal}
        selectedPhotos={albumPhotos.filter((p) => selectedPhotoIdsInAlbum.includes(p.id))}
        onClose={() => setShowBatchShareModal(false)}
        onShowToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      {/* Change Album Cover Photo Picker Modal */}
      {showCoverPickerModal && coverPickerAlbum && (() => {
        const isFavCoverAlbum = coverPickerAlbum.id === "album-favorites";
        const albumSpecificPhotos = isFavCoverAlbum
          ? photos.filter((p) => p.isFavorite && !p.isTrash && !p.isHidden)
          : photos.filter((p) => coverPickerAlbum.photoIds.includes(p.id) && !p.isTrash && !p.isHidden);

        const displayedPhotos =
          coverPickerTab === "album" && albumSpecificPhotos.length > 0
            ? albumSpecificPhotos
            : photos.filter((p) => !p.isTrash && !p.isHidden);

        const currentCover = coverPickerAlbum.coverUrl || albumSpecificPhotos[0]?.url;

        return (
          <div className="fixed inset-0 z-[75] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[88vh] h-full sm:h-auto flex flex-col p-4 sm:p-6 shadow-2xl animate-fade-in overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 shrink-0 gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 truncate">
                    <Image className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate">Set Cover Photo for "{coverPickerAlbum.name}"</span>
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    Tap any photo to set it as the cover photo for this album
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCoverPickerModal(false);
                    setCoverPickerAlbum(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Source Tabs (From Album vs All Photos) */}
              <div className="flex items-center gap-2 pt-3 pb-1 shrink-0">
                <button
                  onClick={() => setCoverPickerTab("album")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    coverPickerTab === "album"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>From Album ({albumSpecificPhotos.length})</span>
                </button>
                <button
                  onClick={() => setCoverPickerTab("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    coverPickerTab === "all"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>All Gallery Photos ({photos.filter((p) => !p.isTrash && !p.isHidden).length})</span>
                </button>
              </div>

              {/* Scrollable Photo Grid */}
              <div className="flex-1 min-h-0 overflow-y-auto py-3 px-1 my-1">
                {displayedPhotos.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 space-y-2">
                    <Image className="w-10 h-10 mx-auto text-slate-600" />
                    <p className="text-xs text-slate-400">No photos available in this selection.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {displayedPhotos.map((photo) => {
                      const isCurrentCoverPhoto = currentCover === photo.url;

                      return (
                        <div
                          key={photo.id}
                          onClick={() => handleSelectCoverPhoto(photo.url)}
                          className={`group relative aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer select-none shadow-md ${
                            isCurrentCoverPhoto
                              ? "border-indigo-500 ring-2 ring-indigo-500/60 scale-[0.98]"
                              : "border-slate-800 hover:border-indigo-500/70 hover:scale-[1.02]"
                          }`}
                        >
                          <img
                            src={photo.url}
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />

                          {isCurrentCoverPhoto && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1 z-10">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Current</span>
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent">
                            <p className="text-[10px] font-medium text-slate-200 truncate">
                              {photo.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-800 pt-3 shrink-0 flex justify-end">
                <button
                  onClick={() => {
                    setShowCoverPickerModal(false);
                    setCoverPickerAlbum(null);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-full bg-slate-900 border border-indigo-500/50 text-indigo-200 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-bounce-short">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
});


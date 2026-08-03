import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Album, Photo } from "../types";

interface AlbumPhotoCardProps {
  photo: Photo;
  albumPhotos: Photo[];
  isSelected: boolean;
  hasSelectionMode: boolean;
  onToggleSelectPhoto: (photoId: string) => void;
  onOpenPhoto: (photo: Photo, albumPhotosList?: Photo[]) => void;
  onRemoveFromAlbum?: (albumId: string, photoId: string) => void;
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
      onToggleSelectPhoto(photo.id);
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

      {/* Top Left: Three Dots Move/Copy Action */}
      {onOpenMoveCopyModal && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMoveCopyModal([photo.id]);
            }}
            className="p-1 rounded-full bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-900 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shadow-md"
            title="Move or Copy Photo"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      )}



      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
        <p className="text-xs font-semibold text-slate-100 truncate">
          {photo.title}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-slate-400 truncate">
            {photo.location?.name}
          </span>
          {onRemoveFromAlbum && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromAlbum(selectedAlbumId, photo.id);
              }}
              className="p-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 text-[10px] font-bold flex items-center gap-1 border border-rose-500/30"
              title="Remove from Album"
            >
              <MinusCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface AlbumsViewProps {
  albums: Album[];
  photos: Photo[];
  onCreateAlbum: (name: string, description: string) => void;
  onEditAlbum?: (albumId: string, name: string, description: string) => void;
  onAddPhotosToAlbum?: (albumId: string, photoIds: string[]) => void;
  onRemoveFromAlbum?: (albumId: string, photoId: string) => void;
  onDeleteAlbum?: (albumId: string) => void;
  onOpenPhoto: (photo: Photo, albumPhotosList?: Photo[]) => void;
  onToggleFavorite?: (photoId: string) => void;
  onDeletePhoto?: (photoId: string) => void;
  onOpenedAlbumChange?: (isOpened: boolean) => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({
  albums = [],
  photos = [],
  onCreateAlbum,
  onEditAlbum,
  onAddPhotosToAlbum,
  onRemoveFromAlbum,
  onDeleteAlbum,
  onOpenPhoto,
  onToggleFavorite,
  onDeletePhoto,
  onOpenedAlbumChange,
}) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

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
  const [moveCopyMode, setMoveCopyMode] = useState<"move" | "copy">("move");
  const [targetPhotoIdsForMoveCopy, setTargetPhotoIdsForMoveCopy] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        setSelectedAlbumId(null);
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
    const urls = selected.map((p) => p.highResUrl || p.url).join("\n");
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `${selected.length} Photos`,
        url: selected[0]?.highResUrl || selected[0]?.url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(urls);
      alert(`Copied links for ${selected.length} photos!`);
    }
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* If viewing a specific album */}
      {selectedAlbum ? (
        <div className="space-y-6 animate-fade-in">
          {/* Album Header */}
          <div className="flex flex-wrap items-center justify-between bg-slate-900/90 p-5 rounded-3xl border border-slate-800 gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedAlbumId(null)}
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
                      setSelectedAlbumId(null);
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

          {/* Batch Selection Action Bar for Album */}
          {selectedPhotoIdsInAlbum.length > 0 && (
            <div className="bg-indigo-950/90 border border-indigo-500/40 p-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-xl animate-fade-in">
              <div className="flex items-center gap-2.5">
                {/* Checkbox box next to text: 1 tick when partially selected, 2 ticks when all selected */}
                <button
                  onClick={handleToggleSelectAllInAlbum}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    isAllSelectedInAlbum
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/30"
                      : "bg-slate-900 text-indigo-400 hover:text-indigo-300 border-indigo-500/40 hover:bg-slate-800"
                  }`}
                  title={isAllSelectedInAlbum ? "Deselect All Items" : "Select All Items"}
                >
                  {isAllSelectedInAlbum ? (
                    <CheckCheck className="w-4 h-4 text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-indigo-400" />
                  )}
                </button>

                <span className="text-xs font-bold text-indigo-200">
                  {selectedPhotoIdsInAlbum.length} item{selectedPhotoIdsInAlbum.length > 1 ? "s" : ""} selected
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Three Dots Options Menu for Move / Copy */}
                <button
                  onClick={() => handleOpenMoveCopy(selectedPhotoIdsInAlbum)}
                  className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
                  title="Move or Copy selected to album"
                >
                  <MoreVertical className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold hidden sm:inline">Move / Copy</span>
                </button>

                {onRemoveFromAlbum && (
                  <button
                    onClick={handleBatchRemoveFromAlbum}
                    className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 cursor-pointer"
                    title="Remove selected from album"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleBatchShareAlbum}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-700/60 cursor-pointer"
                  title="Share Selected"
                >
                  <Share2 className="w-4 h-4 text-sky-400" />
                </button>

                {onToggleFavorite && (
                  <button
                    onClick={handleBatchFavoriteAlbum}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-700/60 cursor-pointer"
                    title="Favorite Selected"
                  >
                    <Heart className="w-4 h-4 fill-pink-400" />
                  </button>
                )}

                {onDeletePhoto && (
                  <button
                    onClick={handleBatchDeleteAlbum}
                    className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 cursor-pointer"
                    title="Delete Selected"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedPhotoIdsInAlbum([])}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-700/60 cursor-pointer"
                  title="Clear Selection"
                >
                  <X className="w-4 h-4" />
                </button>
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
              const displayCover = validAlbumPhotos[0]?.url || album.coverUrl;

              return (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbumId(album.id)}
                  className="group rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-sm"
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

      {/* Floating Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-full bg-slate-900 border border-indigo-500/50 text-indigo-200 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-bounce-short">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};


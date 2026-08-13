import React, { useState } from "react";
import {
  Folder,
  Plus,
  Heart,
  Shield,
  X,
  Check,
  FolderHeart,
  Video,
  Sparkles,
  Lock,
} from "lucide-react";
import { Album, Photo } from "../types";
import { haptics } from "../utils/haptics";

interface AddToAlbumVaultModalProps {
  isOpen: boolean;
  selectedPhotoIds: string[];
  photos: Photo[];
  albums: Album[];
  onClose: () => void;
  onAddToAlbum: (albumId: string, photoIds: string[]) => void;
  onCreateAlbum: (name: string, description: string) => void;
  onHidePhotos: (photoIds: string[]) => void;
  onShowToast: (message: string) => void;
}

export const AddToAlbumVaultModal: React.FC<AddToAlbumVaultModalProps> = ({
  isOpen,
  selectedPhotoIds,
  photos,
  albums,
  onClose,
  onAddToAlbum,
  onCreateAlbum,
  onHidePhotos,
  onShowToast,
}) => {
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDesc, setNewAlbumDesc] = useState("");

  if (!isOpen || selectedPhotoIds.length === 0) return null;

  const selectedCount = selectedPhotoIds.length;

  const handleSelectAlbum = (albumId: string, albumName: string) => {
    haptics.success();
    onAddToAlbum(albumId, selectedPhotoIds);
    onShowToast(`Added ${selectedCount} item${selectedCount > 1 ? "s" : ""} to "${albumName}"`);
    onClose();
  };

  const handleMoveToVault = () => {
    haptics.warning();
    onHidePhotos(selectedPhotoIds);
    onShowToast(`Moved ${selectedCount} item${selectedCount > 1 ? "s" : ""} to Private Vault`);
    onClose();
  };

  const handleCreateNewAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    haptics.success();
    const cleanName = newAlbumName.trim();
    const cleanDesc = newAlbumDesc.trim();

    // Create album
    onCreateAlbum(cleanName, cleanDesc);

    // Give state a moment to update or directly trigger toast
    onShowToast(`Created album "${cleanName}" and added ${selectedCount} item${selectedCount > 1 ? "s" : ""}`);
    
    setNewAlbumName("");
    setNewAlbumDesc("");
    setShowCreateInline(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Plus className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                Add Selected Items
              </h3>
              <p className="text-xs text-indigo-300 font-medium">
                {selectedCount} photo/video{selectedCount > 1 ? "s" : ""} targeted
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Section 1: Private Vault Option */}
          <div className="bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-500/60 p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Private Vault</span>
                  <Lock className="w-3 h-3 text-emerald-400" />
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  Hide items behind PIN passcode security
                </p>
              </div>
            </div>
            <button
              onClick={handleMoveToVault}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-400/40 shrink-0 transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Move to Vault</span>
            </button>
          </div>

          {/* Section 2: Create New Album */}
          {!showCreateInline ? (
            <button
              onClick={() => setShowCreateInline(true)}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-indigo-400"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>+ Create New Album & Add Items</span>
            </button>
          ) : (
            <form onSubmit={handleCreateNewAlbum} className="p-3.5 bg-indigo-950/40 border border-indigo-500/50 rounded-2xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Create New Custom Album</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateInline(false)}
                  className="text-slate-400 hover:text-white p-1 text-xs"
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Album Name (e.g., Summer Trip, Family)"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-indigo-500/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                autoFocus
                required
              />
              <input
                type="text"
                value={newAlbumDesc}
                onChange={(e) => setNewAlbumDesc(e.target.value)}
                placeholder="Optional description..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateInline(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newAlbumName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Create & Add
                </button>
              </div>
            </form>
          )}

          {/* Section 3: List of All Existing Albums */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              All Albums
            </p>

            <div className="space-y-2">
              {/* Favorites System Album */}
              <button
                onClick={() => handleSelectAlbum("album-favorites", "Favorites")}
                className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-pink-500/50 hover:bg-slate-850 flex items-center justify-between transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/30 shrink-0 group-hover:scale-105 transition-transform">
                    <Heart className="w-4 h-4 fill-pink-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                      Favorites
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      Starred photos & videos
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-pink-500/20 text-pink-300 hover:bg-pink-600 hover:text-white text-[11px] font-bold border border-pink-500/30 shrink-0 transition-all">
                  Add Here
                </span>
              </button>

              {/* Custom & System User Albums */}
              {albums.map((album) => {
                const count = album.photoIds?.length || 0;
                return (
                  <button
                    key={album.id}
                    onClick={() => handleSelectAlbum(album.id, album.name)}
                    className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-indigo-500/60 hover:bg-slate-850 flex items-center justify-between transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shrink-0 group-hover:scale-105 transition-transform">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                          {album.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {count} item{count === 1 ? "" : "s"}
                          {album.description ? ` • ${album.description}` : ""}
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
          </div>
        </div>
      </div>
    </div>
  );
};

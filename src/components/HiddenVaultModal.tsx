import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  ArrowLeft,
  X,
  Check,
  CheckCheck,
  ShieldCheck,
  Image,
  CheckSquare,
  CheckCircle,
  Share2,
  Trash2,
  Heart,
  Shield,
  AlertCircle,
  Play,
} from "lucide-react";
import { Photo } from "../types";
import { isPinConfigured, savePin, verifyPin, removePin } from "../utils/cryptoVault";
import { VaultPinModal } from "./VaultPinModal";
import { BatchShareModal } from "./BatchShareModal";
import { haptics } from "../utils/haptics";

interface VaultPhotoCardProps {
  photo: Photo;
  hiddenPhotos: Photo[];
  isSelected: boolean;
  hasSelectionMode: boolean;
  onToggleSelectPhoto: (photoId: string) => void;
  onOpenPhoto: (photo: Photo, photosList?: Photo[]) => void;
}

const VaultPhotoCard: React.FC<VaultPhotoCardProps> = ({
  photo,
  hiddenPhotos,
  isSelected,
  hasSelectionMode,
  onToggleSelectPhoto,
  onOpenPhoto,
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
      onOpenPhoto(photo, hiddenPhotos);
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

      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 border border-white/80 text-white flex items-center justify-center shadow-md z-10">
          <Check className="w-3 h-3 stroke-[3]" />
        </div>
      )}
    </div>
  );
};

interface HiddenVaultModalProps {
  hiddenPhotos: Photo[];
  allGalleryPhotos: Photo[];
  onOpenPhoto: (photo: Photo, photosList?: Photo[]) => void;
  onUnhidePhoto: (photoId: string) => void;
  onHidePhotos: (photoIds: string[]) => void;
  onDeletePhoto?: (photoId: string) => void;
  onPermanentDelete?: (photoId: string) => void;
  onToggleFavorite?: (photoId: string) => void;
  onBack: () => void;
}

export interface HiddenVaultRef {
  handleBack: () => boolean;
}

export const HiddenVaultModal = forwardRef<HiddenVaultRef, HiddenVaultModalProps>(({
  hiddenPhotos = [],
  allGalleryPhotos = [],
  onOpenPhoto,
  onUnhidePhoto,
  onHidePhotos,
  onDeletePhoto,
  onPermanentDelete,
  onToggleFavorite,
  onBack,
}, ref) => {
  const [pinInput, setPinInput] = useState("");
  const [confirmSetupPin, setConfirmSetupPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [forceNewPinMode, setForceNewPinMode] = useState(false);

  const isConfigured = isPinConfigured() && !forceNewPinMode;

  // Private Vault Multi-Selection State
  const [selectedVaultPhotoIds, setSelectedVaultPhotoIds] = useState<string[]>([]);

  // Modals inside Vault
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);
  const [showDeleteVaultModal, setShowDeleteVaultModal] = useState(false);
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [selectedPhotoIdsToAdd, setSelectedPhotoIdsToAdd] = useState<string[]>([]);

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (showBatchShareModal) {
        setShowBatchShareModal(false);
        return true;
      }
      if (showDeleteVaultModal) {
        setShowDeleteVaultModal(false);
        return true;
      }
      if (showChangePinModal) {
        setShowChangePinModal(false);
        return true;
      }
      if (showAddPhotosModal) {
        setSelectedPhotoIdsToAdd([]);
        setShowAddPhotosModal(false);
        return true;
      }
      if (selectedVaultPhotoIds.length > 0) {
        setSelectedVaultPhotoIds([]);
        return true;
      }
      if (isUnlocked) {
        setIsUnlocked(false);
        onBack();
        return true;
      }
      onBack();
      return true;
    },
  }));

  const isAllVaultSelected =
    hiddenPhotos.length > 0 &&
    hiddenPhotos.every((p) => selectedVaultPhotoIds.includes(p.id));

  const handleToggleSelectAllVault = () => {
    haptics.selection();
    if (isAllVaultSelected) {
      setSelectedVaultPhotoIds([]);
    } else {
      setSelectedVaultPhotoIds(hiddenPhotos.map((p) => p.id));
    }
  };

  const handleToggleSelectPhotoVault = (photoId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    haptics.selection();
    setSelectedVaultPhotoIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleBatchUnhideVault = () => {
    haptics.success();
    selectedVaultPhotoIds.forEach((id) => {
      onUnhidePhoto(id);
    });
    setSelectedVaultPhotoIds([]);
  };

  const handleBatchDeleteVault = () => {
    if (selectedVaultPhotoIds.length === 0) return;
    haptics.selection();
    setShowDeleteVaultModal(true);
  };

  const handleConfirmMoveToTrashVault = () => {
    haptics.warning();
    if (onDeletePhoto) {
      selectedVaultPhotoIds.forEach((id) => {
        onDeletePhoto(id);
      });
    }
    setSelectedVaultPhotoIds([]);
    setShowDeleteVaultModal(false);
  };

  const handleConfirmPermanentDeleteVault = () => {
    haptics.warning();
    selectedVaultPhotoIds.forEach((id) => {
      if (onPermanentDelete) {
        onPermanentDelete(id);
      } else if (onDeletePhoto) {
        onDeletePhoto(id);
      }
    });
    setSelectedVaultPhotoIds([]);
    setShowDeleteVaultModal(false);
  };

  const handleBatchFavoriteVault = () => {
    if (!onToggleFavorite) return;
    haptics.success();
    selectedVaultPhotoIds.forEach((id) => {
      onToggleFavorite(id);
    });
    setSelectedVaultPhotoIds([]);
  };

  const handleBatchShareVault = () => {
    const selected = hiddenPhotos.filter((p) => selectedVaultPhotoIds.includes(p.id));
    if (selected.length === 0) return;
    haptics.selection();
    setShowBatchShareModal(true);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isConfigured) {
      // Setup / Create New PIN flow
      if (!/^\d{4,8}$/.test(pinInput)) {
        haptics.error();
        setErrorMsg("Passcode must be 4 to 8 numeric digits.");
        return;
      }
      if (pinInput !== confirmSetupPin) {
        haptics.error();
        setErrorMsg("Passcodes do not match. Please try again.");
        return;
      }

      setIsVerifying(true);
      const saved = await savePin(pinInput);
      setIsVerifying(false);

      if (saved) {
        haptics.success();
        setIsUnlocked(true);
        setPinInput("");
        setConfirmSetupPin("");
        setFailedAttempts(0);
        setForceNewPinMode(false);
        setErrorMsg("");
      } else {
        haptics.error();
        setErrorMsg("Failed to configure passcode. Please try again.");
      }
    } else {
      // Unlock Vault flow
      if (!pinInput) return;
      setIsVerifying(true);
      const isMatch = await verifyPin(pinInput);
      setIsVerifying(false);

      if (isMatch) {
        haptics.success();
        setIsUnlocked(true);
        setErrorMsg("");
        setPinInput("");
        setFailedAttempts(0);
      } else {
        haptics.error();
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setPinInput("");

        if (nextAttempts >= 11) {
          removePin();
          setForceNewPinMode(true);
          setErrorMsg("You have attempted 11 wrong passwords. Please create a new password.");
        } else {
          setErrorMsg(`Incorrect passcode (${nextAttempts}/11 attempts). Please try again.`);
        }
      }
    }
  };

  const handleAddPhotosToVaultSubmit = () => {
    if (selectedPhotoIdsToAdd.length > 0) {
      onHidePhotos(selectedPhotoIdsToAdd);
      setSelectedPhotoIdsToAdd([]);
      setShowAddPhotosModal(false);
    }
  };

  const nonHiddenPhotos = allGalleryPhotos.filter((p) => !p.isHidden && !p.isTrash);

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl animate-fade-in relative">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-100">
              {forceNewPinMode
                ? "Create a New Passcode"
                : isConfigured
                ? "Personal Diaries Locked"
                : "Set Up Personal Diaries"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {forceNewPinMode
                ? "Attempt limit exceeded (11 wrong passwords). Please enter a new passcode below."
                : isConfigured
                ? "Enter your numeric passcode to access hidden media"
                : "Create a 4-8 digit passcode to lock your Personal Diaries"}
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4 text-left">
            {!isConfigured ? (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">New Passcode (4-8 digits)</label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={8}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 4-8 digits"
                      className="w-full font-mono bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2 text-sm text-indigo-300 focus:outline-none focus:border-indigo-500 transition-all"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Confirm Passcode</label>
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={8}
                    value={confirmSetupPin}
                    onChange={(e) => setConfirmSetupPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Re-enter passcode"
                    className="w-full font-mono bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2 text-sm text-indigo-300 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={8}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full text-center tracking-[0.5em] text-lg font-bold bg-slate-950 border border-slate-800 rounded-2xl py-2.5 px-8 text-indigo-300 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || !pinInput}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              >
                {isVerifying && <span className="animate-spin text-xs">🌀</span>}
                <span>{isConfigured ? "Unlock Vault" : "Save Passcode"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Vault Header Bar (Transforms into Action Toggle Bar when items are selected) */}
      {selectedVaultPhotoIds.length > 0 ? (
        <div className="bg-indigo-950/95 border border-indigo-500/50 p-3 sm:p-4 rounded-3xl flex items-center justify-between gap-3 shadow-xl backdrop-blur-xl animate-fade-in">
          {/* Left Side: Exit Selection & Select All & Selection Count */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setSelectedVaultPhotoIds([])}
              className="p-1.5 sm:p-2 rounded-xl text-indigo-300 hover:text-white hover:bg-indigo-900/80 transition-all cursor-pointer shrink-0"
              title="Exit Selection Mode"
            >
              <X className="w-5 h-5 text-indigo-300" />
            </button>

            <button
              onClick={handleToggleSelectAllVault}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isAllVaultSelected
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30"
                  : "bg-indigo-900/60 text-indigo-300 hover:text-white border-indigo-500/40 hover:bg-indigo-800/80"
              }`}
              title={isAllVaultSelected ? "Deselect All Items" : "Select All Items"}
            >
              {isAllVaultSelected ? (
                <CheckCheck className="w-4 h-4 text-white" />
              ) : (
                <Check className="w-4 h-4 text-indigo-300" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base lg:text-lg font-bold text-indigo-100 tracking-tight truncate flex items-center gap-1.5">
                <span>{selectedVaultPhotoIds.length}</span>
                <span className="font-medium text-indigo-200">
                  item{selectedVaultPhotoIds.length > 1 ? "s" : ""} selected
                </span>
              </h2>
            </div>
          </div>

          {/* Right Side: Batch Action Controls */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleBatchUnhideVault}
              className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 cursor-pointer shadow-md flex items-center gap-1.5 transition-all text-xs font-semibold"
              title="Unhide selected photos to gallery"
            >
              <Eye className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Unhide to Gallery</span>
            </button>

            <button
              onClick={handleBatchShareVault}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-slate-700/60 cursor-pointer transition-all shadow-sm"
              title="Share Selected"
            >
              <Share2 className="w-4 h-4 text-sky-400" />
            </button>

            {onToggleFavorite && (
              <button
                onClick={handleBatchFavoriteVault}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-pink-400 border border-slate-700/60 cursor-pointer transition-all shadow-sm"
                title="Favorite Selected"
              >
                <Heart className="w-4 h-4 fill-pink-400 text-pink-400" />
              </button>
            )}

            {onDeletePhoto && (
              <button
                onClick={handleBatchDeleteVault}
                className="p-2 rounded-xl bg-red-900/40 hover:bg-red-900/70 text-red-400 border border-red-700/60 cursor-pointer transition-all shadow-sm"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-emerald-400" />
                <span>Personal Diaries</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {hiddenPhotos.length} photos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Secured media vault protected by your personal passcode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Photos to Vault (Shown in header bar when vault contains photos) */}
            {hiddenPhotos.length > 0 && (
              <button
                onClick={() => setShowAddPhotosModal(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photos</span>
              </button>
            )}

            {/* Change Passcode */}
            <button
              onClick={() => {
                setShowChangePinModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Change Passcode</span>
            </button>

            {/* Lock Vault */}
            <button
              onClick={() => setIsUnlocked(false)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/80 cursor-pointer"
              title="Lock Vault Now"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Vault Photos Grid */}
      {hiddenPhotos.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-3xl text-slate-500 space-y-3">
          <EyeOff className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-sm font-bold text-slate-200">
            Your Private Vault is empty
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Safely store personal photos away from your main gallery. Click "Add Photos" or hide items from the gallery view.
          </p>
          <button
            onClick={() => setShowAddPhotosModal(true)}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Select Photos to Hide</span>
          </button>
        </div>
      ) : (() => {
        const favoriteVaultPhotos = hiddenPhotos.filter((p) => p.isFavorite);
        const otherVaultPhotos = hiddenPhotos.filter((p) => !p.isFavorite);
        const sortedVaultPhotos = [...favoriteVaultPhotos, ...otherVaultPhotos];

        if (favoriteVaultPhotos.length > 0) {
          return (
            <div className="space-y-6">
              {/* Favorites Section at top */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
                  <Heart className="w-4 h-4 fill-pink-400 text-pink-400" />
                  <span>Favorites ({favoriteVaultPhotos.length})</span>
                </div>
                <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
                  {favoriteVaultPhotos.map((photo) => (
                    <VaultPhotoCard
                      key={photo.id}
                      photo={photo}
                      hiddenPhotos={sortedVaultPhotos}
                      isSelected={selectedVaultPhotoIds.includes(photo.id)}
                      hasSelectionMode={selectedVaultPhotoIds.length > 0}
                      onToggleSelectPhoto={(id) => handleToggleSelectPhotoVault(id)}
                      onOpenPhoto={onOpenPhoto}
                    />
                  ))}
                </div>
              </div>

              {/* All Other Vault Media Section */}
              {otherVaultPhotos.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>All Vault Media ({otherVaultPhotos.length})</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
                    {otherVaultPhotos.map((photo) => (
                      <VaultPhotoCard
                        key={photo.id}
                        photo={photo}
                        hiddenPhotos={sortedVaultPhotos}
                        isSelected={selectedVaultPhotoIds.includes(photo.id)}
                        hasSelectionMode={selectedVaultPhotoIds.length > 0}
                        onToggleSelectPhoto={(id) => handleToggleSelectPhotoVault(id)}
                        onOpenPhoto={onOpenPhoto}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
            {hiddenPhotos.map((photo) => (
              <VaultPhotoCard
                key={photo.id}
                photo={photo}
                hiddenPhotos={hiddenPhotos}
                isSelected={selectedVaultPhotoIds.includes(photo.id)}
                hasSelectionMode={selectedVaultPhotoIds.length > 0}
                onToggleSelectPhoto={(id) => handleToggleSelectPhotoVault(id)}
                onOpenPhoto={onOpenPhoto}
              />
            ))}
          </div>
        );
      })()}

      {/* Change Passcode Modal */}
      <VaultPinModal
        isOpen={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
      />

      {/* Batch Share Modal for Selected Vault Items */}
      <BatchShareModal
        isOpen={showBatchShareModal}
        selectedPhotos={hiddenPhotos.filter((p) => selectedVaultPhotoIds.includes(p.id))}
        onClose={() => setShowBatchShareModal(false)}
        onShowToast={() => {}}
        title="Share Vault Media"
      />

      {/* Delete Confirmation Modal for Selected Vault Items */}
      {showDeleteVaultModal && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in"
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
                    Delete {selectedVaultPhotoIds.length} {selectedVaultPhotoIds.length === 1 ? "Item" : "Items"}
                  </h3>
                  <p className="text-[11px] text-slate-400">From Private Vault</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteVaultModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Choose how you want to delete these {selectedVaultPhotoIds.length} item{selectedVaultPhotoIds.length > 1 ? "s" : ""} from your Private Vault:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleConfirmMoveToTrashVault}
                className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 flex items-center justify-between transition-all group text-left cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Trash (Recently Deleted)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Items can be restored from Recently Deleted within 30 days</p>
                </div>
              </button>

              <button
                onClick={handleConfirmPermanentDeleteVault}
                className="w-full p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 hover:border-rose-500/80 hover:bg-rose-950/60 flex items-center justify-between transition-all group text-left cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </div>
                  <p className="text-[10px] text-rose-300/70">Items will be removed permanently immediately</p>
                </div>
              </button>
            </div>

            <div className="pt-1 text-right">
              <button
                onClick={() => setShowDeleteVaultModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Photos to Vault Picker Modal - Full-Screen Gallery Media Picker */}
      {showAddPhotosModal && (() => {
        const isAllNonHiddenSelected =
          nonHiddenPhotos.length > 0 &&
          nonHiddenPhotos.every((p) => selectedPhotoIdsToAdd.includes(p.id));

        const toggleSelectAllNonHidden = () => {
          if (isAllNonHiddenSelected) {
            setSelectedPhotoIdsToAdd([]);
          } else {
            setSelectedPhotoIdsToAdd(nonHiddenPhotos.map((p) => p.id));
          }
        };

        return (
          <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-[100dvh] w-full overflow-hidden select-none animate-fade-in">
            {/* Compact Fixed Top Header */}
            <div className="shrink-0 bg-slate-900/95 border-b border-slate-800/80 px-3 py-2.5 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3 backdrop-blur-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => {
                    setShowAddPhotosModal(false);
                    setSelectedPhotoIdsToAdd([]);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Cancel selection"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div className="min-w-0 flex flex-col">
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate leading-tight">
                    Add to Private Vault
                  </h3>
                  <p className="text-[11px] sm:text-xs text-indigo-400 font-medium truncate mt-0.5">
                    {selectedPhotoIdsToAdd.length} selected
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {nonHiddenPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllNonHidden}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isAllNonHiddenSelected ? "Deselect All" : "Select All"}</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={selectedPhotoIdsToAdd.length === 0}
                  onClick={handleAddPhotosToVaultSubmit}
                  className="px-3 sm:px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold cursor-pointer shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Add to Vault {selectedPhotoIdsToAdd.length > 0 ? `(${selectedPhotoIdsToAdd.length})` : ""}</span>
                </button>
              </div>
            </div>

            {/* Scrollable 4-Column Photo & Video Grid */}
            {nonHiddenPhotos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-0">
                <p className="text-sm text-slate-400 font-medium">
                  All gallery media items are already in Private Vault or trash.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto p-1 sm:p-2.5">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 sm:gap-2">
                  {nonHiddenPhotos.map((photo) => {
                    const isSelected = selectedPhotoIdsToAdd.includes(photo.id);
                    const isVideo = photo.isVideo || photo.category === "Videos";
                    return (
                      <div
                        key={photo.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPhotoIdsToAdd(
                              selectedPhotoIdsToAdd.filter((id) => id !== photo.id)
                            );
                          } else {
                            setSelectedPhotoIdsToAdd([...selectedPhotoIdsToAdd, photo.id]);
                          }
                        }}
                        className={`group relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border bg-slate-900 cursor-pointer transition-all select-none ${
                          isSelected
                            ? "border-indigo-500 ring-2 ring-indigo-500/60 scale-[0.97]"
                            : "border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.title || "Media item"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />

                        {/* Top-Right Selection Indicator Badge */}
                        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10">
                          <div
                            className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center transition-all shadow-md ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-400 text-white scale-100"
                                : "bg-black/40 border-white/70 text-transparent hover:border-white"
                            }`}
                          >
                            <Check className={`w-3 h-3 stroke-[3] ${isSelected ? "opacity-100" : "opacity-0"}`} />
                          </div>
                        </div>

                        {/* Video Indicator in Bottom-Left */}
                        {isVideo && (
                          <div className="absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 z-10 px-1 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-1 text-[9px] font-medium text-white shadow-sm">
                            <Play className="w-2.5 h-2.5 fill-white text-white shrink-0" />
                            {photo.duration && (
                              <span className="font-mono hidden xs:inline text-[8px]">{photo.duration}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Persistent Bottom Action Bar */}
            <div className="shrink-0 bg-slate-900/95 border-t border-slate-800/80 px-4 py-3 sm:px-6 flex items-center justify-between gap-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <span className="text-xs sm:text-sm text-slate-300 font-semibold truncate">
                {selectedPhotoIdsToAdd.length} {selectedPhotoIdsToAdd.length === 1 ? "item" : "items"} selected
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPhotosModal(false);
                    setSelectedPhotoIdsToAdd([]);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedPhotoIdsToAdd.length === 0}
                  onClick={handleAddPhotosToVaultSubmit}
                  className="px-4 sm:px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Hide to Vault</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});


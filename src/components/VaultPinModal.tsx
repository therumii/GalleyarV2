import React, { useState, useEffect } from "react";
import { Lock, KeyRound, Eye, EyeOff, X, Check, ShieldCheck, AlertCircle } from "lucide-react";
import { isPinConfigured, savePin, verifyPin, removePin } from "../utils/cryptoVault";
import { haptics } from "../utils/haptics";

interface VaultPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const VaultPinModal: React.FC<VaultPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [forceNewPinMode, setForceNewPinMode] = useState(false);

  const isConfigured = isPinConfigured() && !forceNewPinMode;

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form inputs & messages whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setErrorMsg("");
      setSuccessMsg("");
      setShowCurrentPin(false);
      setShowNewPin(false);
      setShowConfirmPin(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // If changing PIN, verify current PIN first
    if (isConfigured) {
      if (!currentPin.trim()) {
        setErrorMsg("Please enter your current passcode.");
        return;
      }
      setIsSubmitting(true);
      const isCurrentValid = await verifyPin(currentPin);
      if (!isCurrentValid) {
        setIsSubmitting(false);
        haptics.error();
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setCurrentPin("");
        if (nextAttempts >= 11) {
          removePin();
          setForceNewPinMode(true);
          setErrorMsg("You have attempted 11 wrong passwords. Please create a new password.");
        } else {
          setErrorMsg(`Current passcode is incorrect (${nextAttempts}/11 attempts).`);
        }
        return;
      }
    }

    // Validate new PIN
    if (!/^\d{4,8}$/.test(newPin)) {
      setIsSubmitting(false);
      haptics.error();
      setErrorMsg("Passcode must be 4 to 8 numeric digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setIsSubmitting(false);
      haptics.error();
      setErrorMsg("New passcodes do not match.");
      return;
    }

    setIsSubmitting(true);
    const saved = await savePin(newPin);
    setIsSubmitting(false);

    if (saved) {
      haptics.success();
      setSuccessMsg(
        isConfigured
          ? "Passcode changed successfully!"
          : "Passcode configured successfully!"
      );
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } else {
      setErrorMsg("Failed to save passcode. Please try again.");
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-3xl flex items-center justify-center p-4 animate-fade-in sm:p-6 min-h-screen w-screen overflow-y-auto"
    >
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-left relative my-auto ring-1 ring-slate-800/80 shadow-indigo-950/50 backdrop-blur-md">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer transition-colors"
          title="Close Passcode Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {isConfigured ? "Change Vault Passcode" : "Set Up Private Vault Passcode"}
            </h3>
            <p className="text-xs text-slate-400">
              {isConfigured
                ? "Verify your current passcode then enter a new 4-8 digit passcode."
                : "Create a 4 to 8 digit numeric passcode to protect your hidden photos."}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isConfigured && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Current Passcode
              </label>
              <div className="relative">
                <input
                  type={showCurrentPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={8}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter current passcode"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                >
                  {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {isConfigured ? "New Passcode" : "Create Passcode"} (4-8 Digits)
            </label>
            <div className="relative">
              <input
                type={showNewPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={8}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-8 digits"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                autoFocus={!isConfigured}
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Confirm Passcode
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Re-enter passcode"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newPin || !confirmPin}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer shadow-md transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span className="animate-spin text-sm">🌀</span>
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{isConfigured ? "Update Passcode" : "Save Passcode"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

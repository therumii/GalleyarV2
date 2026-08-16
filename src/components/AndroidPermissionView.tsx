import React, { useState } from "react";
import {
  ShieldCheck,
  Image as ImageIcon,
  Film,
  FolderLock,
  Smartphone,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Camera,
} from "lucide-react";
import {
  androidMediaService,
  AndroidPermissionState,
} from "../services/androidMediaService";
import { haptics } from "../utils/haptics";

interface AndroidPermissionViewProps {
  permissionState: AndroidPermissionState;
  onPermissionGranted: () => void;
  onOpenCustomPicker?: () => void;
}

export const AndroidPermissionView: React.FC<AndroidPermissionViewProps> = ({
  permissionState,
  onPermissionGranted,
  onOpenCustomPicker,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const permissionDetails = androidMediaService.getAndroidPermissionDetails();
  const isDenied = permissionState === "denied";

  const handleGrantAccess = async () => {
    setIsRequesting(true);
    haptics.medium();
    try {
      const res = await androidMediaService.requestPermissions();
      if (res.status === "granted" || res.status === "limited") {
        haptics.success();
        onPermissionGranted();
      } else if (res.status === "denied") {
        haptics.warning();
      }
    } catch (err) {
      console.error("Permission request failed:", err);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="max-w-md w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl relative overflow-hidden text-center">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/15 blur-3xl rounded-full pointer-events-none" />

        {/* Header Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 text-white">
              <Smartphone className="w-10 h-10" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-slate-950 shadow-md">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Title & Explanation */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            {isDenied ? "Media Permission Required" : "Access Device Media"}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Galleyar needs access to your photos and videos to display them in your gallery.
          </p>
        </div>

        {/* Feature/Permission badges */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Device Photos & Screenshots</p>
              <p className="text-slate-400 text-[11px]">Display full-resolution camera roll & captures</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Videos & Screen Recordings</p>
              <p className="text-slate-400 text-[11px]">Stream and play local media with hardware decoding</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">100% On-Device & Private</p>
              <p className="text-slate-400 text-[11px]">Your media stays on your phone and is never uploaded</p>
            </div>
          </div>
        </div>

        {/* Permissions list */}
        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <span>Android APIs:</span>
          {permissionDetails.permissionsRequired.map((perm) => (
            <span
              key={perm}
              className="px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 font-mono text-[10px] border border-slate-700"
            >
              {perm.replace("READ_MEDIA_", "")}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleGrantAccess}
            disabled={isRequesting}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRequesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting to Device Media...</span>
              </>
            ) : (
              <>
                <span>{isDenied ? "Grant Access" : "Allow Media Access"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {onOpenCustomPicker && (
            <button
              onClick={onOpenCustomPicker}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-colors cursor-pointer"
            >
              Select Specific Photos & Videos
            </button>
          )}

          {isDenied && (
            <p className="text-xs text-amber-400/90 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Permission was previously declined. Tap Grant Access to enable.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

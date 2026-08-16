import React from "react";
import { Camera, Film, FolderPlus, Smartphone, Upload, ShieldCheck, Sparkles } from "lucide-react";

interface EmptyGalleryStateProps {
  view: "photos" | "videos";
  onTakePhoto: () => void;
  onRecordVideo: () => void;
  onPickMedia: () => void;
  onScanFolder: () => void;
}

export const EmptyGalleryState: React.FC<EmptyGalleryStateProps> = ({
  view,
  onTakePhoto,
  onRecordVideo,
  onPickMedia,
  onScanFolder,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-12 text-center max-w-lg mx-auto animate-fade-in">
      {/* Icon Badge */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
          {view === "videos" ? (
            <Film className="w-10 h-10 text-violet-400" />
          ) : (
            <Camera className="w-10 h-10 text-indigo-400" />
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
          <Smartphone className="w-4 h-4 text-emerald-400" />
        </div>
      </div>

      {/* Heading & Subtitle */}
      <h2 className="text-xl font-bold text-slate-100 mb-2">
        {view === "videos" ? "No Videos Found" : "No Photos or Videos Yet"}
      </h2>
      <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-sm">
        {view === "videos"
          ? "Capture a video with your device camera or select video files from storage."
          : "Capture moments with your camera or select photos and videos from your Android device storage."}
      </p>

      {/* Action Buttons */}
      <div className="w-full space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onTakePhoto}
            className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Camera className="w-4 h-4" />
            <span>Take Photo</span>
          </button>

          <button
            onClick={onRecordVideo}
            className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-600/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Film className="w-4 h-4" />
            <span>Record Video</span>
          </button>
        </div>

        <button
          onClick={onPickMedia}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-sm font-semibold transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        >
          <Upload className="w-4 h-4 text-indigo-400" />
          <span>Select Photos & Videos from Device</span>
        </button>

        <button
          onClick={onScanFolder}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-950/60 hover:bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
          <span>Scan DCIM / Pictures Directory</span>
        </button>
      </div>

      {/* Android Device Privacy Note */}
      <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 bg-slate-900/40 border border-slate-800/60 px-3.5 py-2 rounded-full">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Stored securely on your device. Never uploaded to external servers.</span>
      </div>
    </div>
  );
};

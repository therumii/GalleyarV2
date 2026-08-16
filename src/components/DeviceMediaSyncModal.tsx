import React, { useState, useRef, useEffect } from "react";
import {
  Smartphone,
  Upload,
  Camera,
  FolderPlus,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  Film,
  Image as ImageIcon,
  Trash2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Photo } from "../types";
import {
  batchProcessDeviceFiles,
  ProcessProgress,
  formatBytes,
} from "../utils/deviceMediaScanner";
import {
  savePhotosToDb,
  getDeviceStorageStats,
  clearAllDeviceMedia,
} from "../utils/mediaDb";
import { detectDeviceInfo } from "../utils/deviceCapabilities";
import { haptics } from "../utils/haptics";

interface DeviceMediaSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPhotos: (newPhotos: Photo[], replaceAll?: boolean) => void;
  currentPhotoCount?: number;
}

export const DeviceMediaSyncModal: React.FC<DeviceMediaSyncModalProps> = ({
  isOpen,
  onClose,
  onImportPhotos,
  currentPhotoCount = 0,
}) => {
  const [deviceInfo] = useState(() => detectDeviceInfo());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const [storageStats, setStorageStats] = useState<{
    photoCount: number;
    videoCount: number;
    totalSizeBytes: number;
    formattedSize: string;
  }>({
    photoCount: 0,
    videoCount: 0,
    totalSizeBytes: 0,
    formattedSize: "0 KB",
  });
  const [importSummary, setImportSummary] = useState<{
    count: number;
    photos: number;
    videos: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const refreshStats = async () => {
    const stats = await getDeviceStorageStats();
    setStorageStats(stats);
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      setImportSummary(null);
      setProgress(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFilesSelected = async (files: FileList | null, replaceAll = false) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setImportSummary(null);
    haptics.medium();

    try {
      const { photos: newPhotos, blobsMap } = await batchProcessDeviceFiles(
        files,
        (prog) => setProgress(prog)
      );

      if (newPhotos.length > 0) {
        // Save to high-capacity IndexedDB
        await savePhotosToDb(newPhotos, blobsMap);
        onImportPhotos(newPhotos, replaceAll);

        const photoCount = newPhotos.filter((p) => !p.isVideo).length;
        const videoCount = newPhotos.filter((p) => p.isVideo).length;

        setImportSummary({
          count: newPhotos.length,
          photos: photoCount,
          videos: videoCount,
        });

        haptics.success();
        await refreshStats();
      }
    } catch (err) {
      console.error("Batch file import failed:", err);
      haptics.warning();
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleClearAllStorage = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all imported device media and reset the gallery storage?"
      )
    ) {
      haptics.medium();
      await clearAllDeviceMedia();
      await refreshStats();
      onImportPhotos([], true);
      setImportSummary(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Hidden Native File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraVideoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-fade-in relative max-h-[92vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Phone Media & APK Sync</span>
                {deviceInfo.isStandaloneApk && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    APK Mode
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Load real photos and videos from your mobile phone storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Processing Progress State */}
        {isProcessing && progress ? (
          <div className="py-6 px-4 bg-slate-950/80 rounded-2xl border border-indigo-500/30 space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full border-3 border-indigo-500/30 border-t-indigo-500 animate-spin flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">
                Extracting Real Media ({progress.current} of {progress.total})
              </h4>
              <p className="text-xs text-indigo-400 font-mono mt-1 truncate max-w-xs mx-auto">
                {progress.currentFileName}
              </p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-150 rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Generating fluid thumbnails & extracting video durations into IndexedDB...
            </p>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[58vh] pr-1">
            {/* Import Success Banner */}
            {importSummary && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-200">
                    Successfully loaded {importSummary.count} real media item{importSummary.count > 1 ? "s" : ""}!
                  </p>
                  <p className="text-emerald-300/80 text-[11px]">
                    {importSummary.photos} photos and {importSummary.videos} videos stored in phone database.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Pick Photos & Videos */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white flex flex-col items-start justify-between gap-3 text-left transition-all shadow-lg shadow-indigo-600/25 cursor-pointer col-span-1 sm:col-span-2"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                    Select All
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold">Select Photos & Videos from Phone</h4>
                  <p className="text-xs text-indigo-100/80 mt-0.5">
                    Multi-select from Gallery, Downloads, WhatsApp, or Google Photos
                  </p>
                </div>
              </button>

              {/* Take Photo */}
              <button
                onClick={() => cameraPhotoInputRef.current?.click()}
                className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 hover:border-slate-600 border border-slate-700/80 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Take Photo</h4>
                  <p className="text-[10px] text-slate-400">Direct camera capture</p>
                </div>
              </button>

              {/* Record Video */}
              <button
                onClick={() => cameraVideoInputRef.current?.click()}
                className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 hover:border-slate-600 border border-slate-700/80 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Record Video</h4>
                  <p className="text-[10px] text-slate-400">Direct video recording</p>
                </div>
              </button>

              {/* Scan Folder (DCIM / Camera) */}
              <button
                onClick={() => folderInputRef.current?.click()}
                className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 hover:border-slate-600 border border-slate-700/80 flex items-center gap-3 text-left transition-all cursor-pointer col-span-1 sm:col-span-2 group"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-100">Scan Entire Phone Folder (DCIM / Pictures)</h4>
                  <p className="text-[10px] text-slate-400">
                    Bulk-import an entire directory of photos and videos with automatic sorting
                  </p>
                </div>
              </button>
            </div>

            {/* Storage Usage Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-400" />
                  <span>APK Media Storage Status</span>
                </span>
                <span className="text-indigo-400 font-mono">{storageStats.formattedSize}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <p className="text-[10px] text-slate-400">Real Photos Loaded</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">
                    {storageStats.photoCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <p className="text-[10px] text-slate-400">Real Videos Loaded</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">
                    {storageStats.videoCount}
                  </p>
                </div>
              </div>

              {storageStats.totalSizeBytes > 0 && (
                <div className="pt-2 flex justify-between items-center border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400">
                    Stored permanently in offline device database
                  </span>
                  <button
                    onClick={handleClearAllStorage}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Data</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <p className="text-[11px] text-slate-500">
            Works 100% offline on Android APK & mobile browsers
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

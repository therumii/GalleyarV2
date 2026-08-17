import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  Image,
  Sparkles,
  Check,
  FileText,
  Camera,
  Film,
  Layers,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { Photo } from "../types";
import { analyzePhotoWithAI } from "../services/api";
import { batchProcessDeviceFiles, ProcessProgress } from "../utils/deviceMediaScanner";
import { savePhotosToDb, saveSinglePhotoToDb } from "../utils/mediaDb";
import { haptics } from "../utils/haptics";

interface UploadModalProps {
  onAddPhoto: (newPhoto: Photo) => void;
  onAddMultiplePhotos?: (newPhotos: Photo[]) => void;
  onClose: () => void;
  onOpenDeviceSync?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  onAddPhoto,
  onAddMultiplePhotos,
  onClose,
  onOpenDeviceSync,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [videoDurationStr, setVideoDurationStr] = useState<string | undefined>(undefined);

  // Multi-file batch state
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<ProcessProgress | null>(null);
  const [batchCount, setBatchCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement | null>(null);

  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      processSelectedFile(files[0]);
      return;
    }

    setIsBatchProcessing(true);
    haptics.medium();

    try {
      const { photos: newPhotos, blobsMap } = await batchProcessDeviceFiles(
        files,
        (prog) => setBatchProgress(prog)
      );

      if (newPhotos.length > 0) {
        await savePhotosToDb(newPhotos, blobsMap);
        if (onAddMultiplePhotos) {
          onAddMultiplePhotos(newPhotos);
        } else {
          newPhotos.forEach((p) => onAddPhoto(p));
        }
        setBatchCount(newPhotos.length);
        haptics.success();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("Batch upload failed:", err);
      haptics.warning();
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setTitleInput(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));

    if (file.type.startsWith("video/")) {
      const tempVideo = document.createElement("video");
      tempVideo.src = URL.createObjectURL(file);
      tempVideo.onloadedmetadata = () => {
        const sec = Math.round(tempVideo.duration || 0);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        setVideoDurationStr(`${m}:${s.toString().padStart(2, "0")}`);
      };
    } else {
      setVideoDurationStr(undefined);
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setPreviewUrl(url);
      setBase64Data(url);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAIAnalysis = async () => {
    if (!base64Data) return;
    setIsAnalyzing(true);

    const result = await analyzePhotoWithAI(
      base64Data,
      selectedFile?.type || "image/jpeg",
      titleInput
    );

    if (result) {
      setAiAnalysisResult(result);
      if (result.title) setTitleInput(result.title);
    }

    setIsAnalyzing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl) return;

    const isVideoFile = selectedFile?.type.startsWith("video/") || false;
    const nowIso = new Date().toISOString();
    const cleanTitle = titleInput.trim() || selectedFile?.name || (isVideoFile ? "Video" : "Photo");

    const newPhoto: Photo = {
      id: `photo-${Date.now()}`,
      title: cleanTitle,
      url: previewUrl,
      highResUrl: previewUrl,
      isVideo: isVideoFile,
      videoUrl: isVideoFile ? previewUrl : undefined,
      duration: isVideoFile ? videoDurationStr : undefined,
      date: nowIso,
      year: new Date().getFullYear(),
      month: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
      day: new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      category: isVideoFile ? "Videos" : ((aiAnalysisResult?.category as any) || "Travel"),
      isFavorite: false,
      isTrash: false,
      isHidden: false,
      cloudStatus: "local_only",
      fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "Unknown",
      resolution: isVideoFile ? "1920 × 1080" : "Original Resolution",
      camera: undefined,
      exif: undefined,
      location: undefined,
      tags: aiAnalysisResult?.tags || ["uploaded", isVideoFile ? "video" : "photo"],
      people: aiAnalysisResult?.facesDetected
        ? aiAnalysisResult.facesDetected.map((f: any, idx: number) => ({
            id: `person-up-${idx}`,
            name: f.label || `Person ${idx + 1}`,
          }))
        : [],
      ocrText: aiAnalysisResult?.ocrText || "",
      dominantColors: aiAnalysisResult?.dominantColors || ["#3b82f6", "#1e293b"],
    };

    // Save to IndexedDB
    await saveSinglePhotoToDb(newPhoto, selectedFile || undefined);

    onAddPhoto(newPhoto);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      {/* Hidden inputs */}
      <input
        ref={multiFileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleMultipleFilesChange}
        className="hidden"
      />
      <input
        ref={cameraPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSingleFileChange}
        className="hidden"
      />
      <input
        ref={cameraVideoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleSingleFileChange}
        className="hidden"
      />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            <span>Load Real Media & Upload</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Batch Progress State */}
        {isBatchProcessing && batchProgress ? (
          <div className="py-6 px-4 bg-slate-950/90 rounded-2xl border border-indigo-500/30 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 animate-spin rounded-full mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">
              Importing Real Media ({batchProgress.current}/{batchProgress.total})
            </h4>
            <p className="text-xs text-indigo-400 font-mono truncate">{batchProgress.currentFileName}</p>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-150"
                style={{ width: `${batchProgress.percent}%` }}
              />
            </div>
          </div>
        ) : batchCount ? (
          <div className="py-6 px-4 bg-emerald-950/40 rounded-2xl border border-emerald-500/40 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-200">
              Loaded {batchCount} items to gallery!
            </h4>
            <p className="text-xs text-emerald-300/80">Saved permanently in device storage</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Picker Zone */}
            {!previewUrl ? (
              <div className="space-y-3">
                <div
                  onClick={() => multiFileInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-indigo-950/20 hover:bg-indigo-950/30"
                >
                  <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                  <p className="text-xs sm:text-sm font-bold text-slate-100">
                    Select Photos & Videos from Phone
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Multi-select supported (JPG, PNG, WEBP, MP4, MOV, etc.)
                  </p>
                </div>

                {/* Direct Mobile Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraPhotoInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border border-slate-700/60"
                  >
                    <Camera className="w-4 h-4 text-purple-400" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraVideoInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border border-slate-700/60"
                  >
                    <Film className="w-4 h-4 text-pink-400" />
                    <span>Record Video</span>
                  </button>
                </div>

                {onOpenDeviceSync && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDeviceSync();
                    }}
                    className="w-full p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    <span>Open Full Phone Storage / APK Scanner</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                  {selectedFile?.type.startsWith("video/") ? (
                    <video
                      src={previewUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                      setAiAnalysisResult(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-slate-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Media Title
                  </label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* AI Auto Tagging Button */}
                {!aiAnalysisResult ? (
                  <button
                    type="button"
                    onClick={handleRunAIAnalysis}
                    disabled={isAnalyzing}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="animate-spin text-xs">🌀</span>
                        <span>Analyzing with Gemini AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Run Gemini AI Auto-Tag & OCR</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-1.5 text-xs">
                    <p className="font-bold text-indigo-300 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>AI Analysis Complete</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Category: <span className="text-slate-200">{aiAnalysisResult.category}</span>
                    </p>
                    {aiAnalysisResult.ocrText && (
                      <p className="text-[10px] text-amber-300 font-mono truncate">
                        OCR Text: {aiAnalysisResult.ocrText}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              {previewUrl && (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-md"
                >
                  Import to Gallery
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

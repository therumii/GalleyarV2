import React, { useState, useRef } from "react";
import { Upload, X, Image, Sparkles, Check, FileText } from "lucide-react";
import { Photo } from "../types";
import { analyzePhotoWithAI } from "../services/api";

interface UploadModalProps {
  onAddPhoto: (newPhoto: Photo) => void;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  onAddPhoto,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  const [videoDurationStr, setVideoDurationStr] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setTitleInput(file.name.replace(/\.[^/.]+$/, ""));

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl) return;

    const isVideoFile = selectedFile?.type.startsWith("video/") || false;
    const nowIso = new Date().toISOString();

    const newPhoto: Photo = {
      id: `photo-${Date.now()}`,
      title: titleInput.trim() || (isVideoFile ? "Uploaded Video" : "Uploaded Photo"),
      url: previewUrl,
      highResUrl: previewUrl,
      isVideo: isVideoFile,
      videoUrl: isVideoFile ? previewUrl : undefined,
      duration: isVideoFile ? (videoDurationStr || "0:15") : undefined,
      date: nowIso,
      year: new Date().getFullYear(),
      month: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
      day: new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      category: isVideoFile ? "Videos" : ((aiAnalysisResult?.category as any) || "Travel"),
      isFavorite: false,
      isTrash: false,
      isHidden: false,
      cloudStatus: "local_only",
      fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "2.4 MB",
      resolution: "3840 x 2160",
      exif: {
        camera: "User Upload Device",
        aperture: "f/1.8",
        iso: 100,
        shutterSpeed: "1/200s",
      },
      location: {
        name: "Current Location",
        city: "San Francisco",
        country: "United States",
        lat: 37.7749,
        lng: -122.4194,
      },
      tags: aiAnalysisResult?.tags || ["user upload", "new"],
      people: aiAnalysisResult?.facesDetected
        ? aiAnalysisResult.facesDetected.map((f: any, idx: number) => ({
            id: `person-up-${idx}`,
            name: f.label || `Person ${idx + 1}`,
          }))
        : [],
      ocrText: aiAnalysisResult?.ocrText || "",
      dominantColors: aiAnalysisResult?.dominantColors || ["#3b82f6", "#1e293b"],
    };

    onAddPhoto(newPhoto);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            <span>Upload Photo to Gallery</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Picker Zone */}
          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/50"
            >
              <Image className="w-10 h-10 text-indigo-400 mb-2" />
              <p className="text-xs font-semibold text-slate-200">
                Click to browse or drag and drop photo or video
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Supports JPG, PNG, WEBP, MP4, WEBM up to 100MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
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
                  Photo Title
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
            <button
              type="submit"
              disabled={!previewUrl}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-md disabled:opacity-40"
            >
              Import to Gallery
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

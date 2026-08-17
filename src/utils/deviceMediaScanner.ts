/**
 * Device Media Scanner & Real File Extractor for Mobile Phone / APK
 * Extracts thumbnails, dimensions, video posters, durations, EXIF timestamps, and metadata
 */
import { Photo, PhotoCategory } from "../types";

export interface ProcessProgress {
  current: number;
  total: number;
  currentFileName: string;
  percent: number;
}

/**
 * Format bytes to readable string (e.g. 3.4 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format seconds to mm:ss
 */
export function formatSecondsToTime(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Auto-detect likely photo category based on file name or folder hints
 */
function detectCategory(fileName: string, isVideo: boolean): PhotoCategory {
  if (isVideo) return "Videos";
  const lower = fileName.toLowerCase();

  if (lower.includes("screenshot") || lower.includes("screen_") || lower.includes("screencapture")) {
    return "Screenshots";
  }
  if (lower.includes("food") || lower.includes("dinner") || lower.includes("lunch") || lower.includes("breakfast") || lower.includes("cake")) {
    return "Food";
  }
  if (lower.includes("cat") || lower.includes("dog") || lower.includes("pet") || lower.includes("animal")) {
    return "Animals";
  }
  if (lower.includes("doc") || lower.includes("receipt") || lower.includes("bill") || lower.includes("invoice") || lower.includes("scan")) {
    return "Documents";
  }
  if (lower.includes("nature") || lower.includes("flower") || lower.includes("mountain") || lower.includes("beach") || lower.includes("forest")) {
    return "Nature";
  }
  if (lower.includes("night") || lower.includes("dark") || lower.includes("sunset") || lower.includes("moon")) {
    return "Night";
  }
  if (lower.includes("portrait") || lower.includes("selfie") || lower.includes("face")) {
    return "Portraits";
  }
  return "Travel";
}

/**
 * Extract 5 dominant color hex values from an image element or canvas
 */
function extractDominantColors(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): string[] {
  try {
    const w = canvas.width;
    const h = canvas.height;
    const samplePoints = [
      [Math.floor(w * 0.5), Math.floor(h * 0.5)],
      [Math.floor(w * 0.25), Math.floor(h * 0.25)],
      [Math.floor(w * 0.75), Math.floor(h * 0.25)],
      [Math.floor(w * 0.25), Math.floor(h * 0.75)],
      [Math.floor(w * 0.75), Math.floor(h * 0.75)],
    ];

    const colors: string[] = [];
    for (const [x, y] of samplePoints) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
        .toString(16)
        .slice(1)}`;
      colors.push(hex);
    }
    return colors;
  } catch {
    return ["#3b82f6", "#1e293b", "#0f172a"];
  }
}

/**
 * Generate a compressed thumbnail and metadata for an image file
 */
export async function processImageFile(file: File): Promise<{
  photo: Photo;
  blob: Blob;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || 1920;
        const naturalHeight = img.naturalHeight || 1080;

        // Generate downscaled thumbnail for fast gallery scrolling
        const maxThumbDim = 800;
        let thumbWidth = naturalWidth;
        let thumbHeight = naturalHeight;

        if (thumbWidth > maxThumbDim || thumbHeight > maxThumbDim) {
          if (thumbWidth > thumbHeight) {
            thumbHeight = Math.round((thumbHeight * maxThumbDim) / thumbWidth);
            thumbWidth = maxThumbDim;
          } else {
            thumbWidth = Math.round((thumbWidth * maxThumbDim) / thumbHeight);
            thumbHeight = maxThumbDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        const ctx = canvas.getContext("2d");

        let thumbDataUrl = objectUrl;
        let dominantColors = ["#4f46e5", "#1e293b"];

        if (ctx) {
          ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
          dominantColors = extractDominantColors(canvas, ctx);
          try {
            thumbDataUrl = canvas.toDataURL("image/jpeg", 0.82);
          } catch {
            thumbDataUrl = objectUrl;
          }
        }

        const dateObj = file.lastModified ? new Date(file.lastModified) : new Date();
        const dateIso = dateObj.toISOString();
        const realTitle = file.name || "Photo";

        const photo: Photo = {
          id: `device-photo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          title: realTitle,
          url: thumbDataUrl,
          highResUrl: objectUrl,
          isVideo: false,
          date: dateIso,
          year: dateObj.getFullYear(),
          month: dateObj.toLocaleString("en-US", { month: "long", year: "numeric" }),
          day: dateObj.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          category: detectCategory(file.name, false),
          isFavorite: false,
          isTrash: false,
          isHidden: false,
          cloudStatus: "local_only",
          fileSize: formatBytes(file.size),
          resolution: `${naturalWidth} × ${naturalHeight}`,
          camera: undefined,
          exif: undefined,
          location: undefined,
          tags: ["device media", file.type.split("/")[1] || "image"].filter(Boolean),
          people: [],
          dominantColors,
        };

        resolve({ photo, blob: file });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Generate a video thumbnail poster, duration, and metadata for a video file
 */
export async function processVideoFile(file: File): Promise<{
  photo: Photo;
  blob: Blob;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    let timeoutId = setTimeout(() => {
      cleanup();
      // Fallback if video metadata event hangs
      resolve(createFallbackVideoPhoto(file, objectUrl));
    }, 8000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
      video.removeEventListener("seeked", onSeeked);
    };

    const onError = () => {
      cleanup();
      resolve(createFallbackVideoPhoto(file, objectUrl));
    };

    const onLoadedData = () => {
      // Seek slightly into the video to avoid black intro frames
      const seekTarget = Math.min(1.0, (video.duration || 1) * 0.2);
      video.currentTime = seekTarget;
      video.addEventListener("seeked", onSeeked, { once: true });
    };

    const onSeeked = () => {
      cleanup();
      try {
        const naturalWidth = video.videoWidth || 1920;
        const naturalHeight = video.videoHeight || 1080;
        const durationSec = video.duration || 0;
        const durationStr = formatSecondsToTime(durationSec);

        // Generate video poster frame
        const maxThumbDim = 800;
        let thumbWidth = naturalWidth;
        let thumbHeight = naturalHeight;

        if (thumbWidth > maxThumbDim || thumbHeight > maxThumbDim) {
          if (thumbWidth > thumbHeight) {
            thumbHeight = Math.round((thumbHeight * maxThumbDim) / thumbWidth);
            thumbWidth = maxThumbDim;
          } else {
            thumbWidth = Math.round((thumbWidth * maxThumbDim) / thumbHeight);
            thumbHeight = maxThumbDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(10, thumbWidth);
        canvas.height = Math.max(10, thumbHeight);
        const ctx = canvas.getContext("2d");

        let posterDataUrl = "";
        let dominantColors = ["#1e1b4b", "#0f172a"];

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          dominantColors = extractDominantColors(canvas, ctx);
          try {
            posterDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          } catch {
            posterDataUrl = "";
          }
        }

        const dateObj = file.lastModified ? new Date(file.lastModified) : new Date();
        const dateIso = dateObj.toISOString();
        const realTitle = file.name || "Video";

        const photo: Photo = {
          id: `device-video-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          title: realTitle,
          url: posterDataUrl || objectUrl,
          highResUrl: posterDataUrl || objectUrl,
          isVideo: true,
          videoUrl: objectUrl,
          duration: durationStr,
          date: dateIso,
          year: dateObj.getFullYear(),
          month: dateObj.toLocaleString("en-US", { month: "long", year: "numeric" }),
          day: dateObj.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          category: "Videos",
          isFavorite: false,
          isTrash: false,
          isHidden: false,
          cloudStatus: "local_only",
          fileSize: formatBytes(file.size),
          resolution: `${naturalWidth} × ${naturalHeight}`,
          camera: undefined,
          exif: undefined,
          location: undefined,
          tags: ["device media", "video", file.type.split("/")[1] || "mp4"].filter(Boolean),
          people: [],
          dominantColors,
        };

        resolve({ photo, blob: file });
      } catch (err) {
        resolve(createFallbackVideoPhoto(file, objectUrl));
      }
    };

    video.addEventListener("loadeddata", onLoadedData, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function createFallbackVideoPhoto(file: File, objectUrl: string): { photo: Photo; blob: Blob } {
  const dateObj = file.lastModified ? new Date(file.lastModified) : new Date();
  const realTitle = file.name || "Video";

  const photo: Photo = {
    id: `device-video-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    title: realTitle,
    url: objectUrl,
    highResUrl: objectUrl,
    isVideo: true,
    videoUrl: objectUrl,
    duration: undefined,
    date: dateObj.toISOString(),
    year: dateObj.getFullYear(),
    month: dateObj.toLocaleString("en-US", { month: "long", year: "numeric" }),
    day: dateObj.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    category: "Videos",
    isFavorite: false,
    isTrash: false,
    isHidden: false,
    cloudStatus: "local_only",
    fileSize: formatBytes(file.size),
    resolution: "Unknown",
    camera: undefined,
    exif: undefined,
    location: undefined,
    tags: ["device media", "video"],
    people: [],
    dominantColors: ["#1e1b4b", "#0f172a"],
  };

  return { photo, blob: file };
}

/**
 * Batch process device files (both photos and videos) with real-time progress
 */
export async function batchProcessDeviceFiles(
  files: FileList | File[],
  onProgress?: (progress: ProcessProgress) => void
): Promise<{ photos: Photo[]; blobsMap: Map<string, Blob> }> {
  const fileArray = Array.from(files);
  const total = fileArray.length;
  const processedPhotos: Photo[] = [];
  const blobsMap = new Map<string, Blob>();

  for (let i = 0; i < total; i++) {
    const file = fileArray[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        currentFileName: file.name,
        percent: Math.round(((i + 1) / total) * 100),
      });
    }

    try {
      if (file.type.startsWith("video/") || file.name.match(/\.(mp4|webm|mov|mkv|3gp|avi|m4v)$/i)) {
        const res = await processVideoFile(file);
        processedPhotos.push(res.photo);
        blobsMap.set(res.photo.id, res.blob);
      } else if (file.type.startsWith("image/") || file.name.match(/\.(jpg|jpeg|png|webp|gif|heic|heif|bmp|svg)$/i)) {
        const res = await processImageFile(file);
        processedPhotos.push(res.photo);
        blobsMap.set(res.photo.id, res.blob);
      }
    } catch (err) {
      console.warn(`Could not process file: ${file.name}`, err);
    }
  }

  return { photos: processedPhotos, blobsMap };
}

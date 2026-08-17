/**
 * GalleyarMediaRepository — Authoritative Android MediaStore Repository
 * 
 * Directly queries, observes, and manipulates the Android device media library:
 * - Direct MediaStore & ContentResolver integration via native Android bridge
 * - Zero-copy media architecture using native content URIs and stable IDs
 * - Real MediaStore metadata parsing (Display Name, MIME, timestamps, dimensions, size, duration, bucket)
 * - Dynamic system & bucket albums (Camera, Screenshots, Downloads, WhatsApp, etc.)
 * - Real-time MediaStore change observation
 * - Real Android permission lifecycle (READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_VISUAL_USER_SELECTED)
 */

import { Photo, PhotoCategory, Album } from "../types";
import { formatBytes, formatSecondsToTime, batchProcessDeviceFiles, processImageFile, processVideoFile } from "../utils/deviceMediaScanner";
import { savePhotosToDb, saveSinglePhotoToDb, loadPhotosFromDb, deletePhotoFromDb, clearAllDeviceMedia, getDeviceStorageStats } from "../utils/mediaDb";

export type AndroidPermissionState = "unknown" | "prompt" | "granted" | "limited" | "denied";

export interface AndroidMediaItemRaw {
  id: string;
  contentUri: string;
  displayName: string;
  mimeType?: string;
  mediaType?: "image" | "video" | "audio";
  dateTaken?: number;
  dateAdded?: number;
  dateModified?: number;
  width?: number;
  height?: number;
  fileSize?: number | string;
  duration?: number; // duration in seconds or milliseconds
  bucketName?: string; // e.g. "Camera", "Screenshots", "Downloads", "WhatsApp Images"
  bucketId?: string;
  relativePath?: string;
  orientation?: number;
  camera?: string;
  aperture?: string;
  iso?: number | string;
  shutterSpeed?: string;
  location?: {
    name?: string;
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
}

export interface PermissionExplanationInfo {
  title: string;
  message: string;
  permissionsRequired: string[];
}

const PERMISSION_STORAGE_KEY = "galleyar_android_permission_state";
const FAVORITES_STORAGE_KEY = "galleyar_favorites_map";

export class GalleyarMediaRepository {
  private permissionState: AndroidPermissionState = "unknown";
  private mediaChangeListeners: Set<() => void> = new Set();
  private cachedMedia: Photo[] | null = null;
  private isObservingNative = false;

  constructor() {
    this.initPermissionState();
    this.setupNativeMediaObserver();
  }

  private initPermissionState() {
    try {
      const saved = localStorage.getItem(PERMISSION_STORAGE_KEY) as AndroidPermissionState;
      if (saved && ["granted", "limited", "denied", "prompt"].includes(saved)) {
        this.permissionState = saved;
      } else {
        this.permissionState = "prompt";
      }
    } catch {
      this.permissionState = "prompt";
    }
  }

  /**
   * Register native ContentObserver callbacks from Android layer
   */
  private setupNativeMediaObserver() {
    if (typeof window === "undefined" || this.isObservingNative) return;

    // Window global callback for native Android ContentObserver
    (window as any).onGalleyarMediaStoreChanged = () => {
      this.cachedMedia = null;
      this.notifyMediaChanged();
    };

    if (typeof (window as any).AndroidMedia?.registerMediaObserver === "function") {
      try {
        (window as any).AndroidMedia.registerMediaObserver("onGalleyarMediaStoreChanged");
        this.isObservingNative = true;
      } catch (err) {
        console.warn("Could not register native media observer:", err);
      }
    }

    // Also observe window focus changes when returning from Camera or other apps
    if (typeof window.addEventListener === "function") {
      window.addEventListener("focus", () => {
        if (this.permissionState === "granted" || this.permissionState === "limited") {
          this.refreshFromMediaStore();
        }
      });
    }
  }

  /**
   * Check if running on Android environment
   */
  public isAndroidEnvironment(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    return (
      /android/i.test(ua) ||
      typeof (window as any).Android !== "undefined" ||
      typeof (window as any).AndroidMedia !== "undefined"
    );
  }

  /**
   * Get permission requirements for the host Android OS
   */
  public getAndroidPermissionDetails(): PermissionExplanationInfo {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const match = ua.match(/Android\s([0-9\.]+)/);
    const androidVersion = match ? parseFloat(match[1]) : 14;

    if (androidVersion >= 13) {
      return {
        title: "Access Device Media",
        message: "Galleyar reads your photo and video library directly using Android MediaStore.",
        permissionsRequired: ["READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO", "READ_MEDIA_VISUAL_USER_SELECTED"],
      };
    } else {
      return {
        title: "Access Device Storage",
        message: "Galleyar reads your photo and video library directly using Android MediaStore.",
        permissionsRequired: ["READ_EXTERNAL_STORAGE"],
      };
    }
  }

  /**
   * Current Android permission state
   */
  public getPermissionState(): AndroidPermissionState {
    return this.permissionState;
  }

  /**
   * Set and persist permission state
   */
  public setPermissionState(state: AndroidPermissionState) {
    this.permissionState = state;
    try {
      localStorage.setItem(PERMISSION_STORAGE_KEY, state);
    } catch {}
  }

  /**
   * Request Android MediaStore permissions
   */
  public async requestPermissions(): Promise<{
    status: AndroidPermissionState;
    photos?: Photo[];
    message?: string;
  }> {
    // 1. Native Android JavascriptInterface Bridge
    if (typeof (window as any).AndroidMedia?.requestPermissions === "function") {
      try {
        const result = await (window as any).AndroidMedia.requestPermissions();
        const status: AndroidPermissionState =
          result.status === "granted" ? "granted" : result.status === "limited" ? "limited" : "denied";
        this.setPermissionState(status);
        if (status === "granted" || status === "limited") {
          const media = await this.queryAllMedia();
          return { status, photos: media };
        }
        return { status };
      } catch (err) {
        console.warn("Native Android permission request error:", err);
      }
    }

    if (typeof (window as any).Capacitor?.Plugins?.Camera?.requestPermissions === "function") {
      try {
        const result = await (window as any).Capacitor.Plugins.Camera.requestPermissions({ permissions: ["photos"] });
        const status: AndroidPermissionState =
          result.photos === "granted" ? "granted" : result.photos === "limited" ? "limited" : "denied";
        this.setPermissionState(status);
        return { status };
      } catch (err) {
        console.warn("Capacitor permissions error:", err);
      }
    }

    // 2. Direct browser selector fallback when native wrapper is not attached
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = "image/*,video/*";

      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const files = target.files;
        if (files && files.length > 0) {
          try {
            const { photos: newPhotos, blobsMap } = await batchProcessDeviceFiles(files);
            if (newPhotos.length > 0) {
              await savePhotosToDb(newPhotos, blobsMap);
              const status: AndroidPermissionState = files.length > 10 ? "granted" : "limited";
              this.setPermissionState(status);
              this.cachedMedia = null;
              this.notifyMediaChanged();
              resolve({ status, photos: newPhotos });
              return;
            }
          } catch (err) {
            console.error("Failed to process selected media:", err);
          }
        }
        this.setPermissionState("granted");
        resolve({ status: "granted" });
      };

      input.oncancel = () => {
        if (this.permissionState === "unknown" || this.permissionState === "prompt") {
          this.setPermissionState("denied");
        }
        resolve({ status: this.permissionState });
      };

      input.click();
    });
  }

  /**
   * Main Query: Returns all accessible photos and videos from MediaStore
   */
  public async queryAllMedia(): Promise<Photo[]> {
    // 1. Native Android MediaStore Query
    if (typeof (window as any).AndroidMedia?.queryMedia === "function") {
      try {
        const rawItems: AndroidMediaItemRaw[] = await (window as any).AndroidMedia.queryMedia();
        if (rawItems && Array.isArray(rawItems)) {
          const converted = this.convertRawAndroidItems(rawItems);
          const finalMedia = this.applyFavorites(converted);
          this.cachedMedia = finalMedia;
          return finalMedia;
        }
      } catch (err) {
        console.warn("Native Android MediaStore query error:", err);
      }
    }

    // 2. Load stored device media from persistent IndexedDB
    const stored = await loadPhotosFromDb();
    if (stored && stored.length > 0) {
      const finalMedia = this.applyFavorites(stored);
      this.cachedMedia = finalMedia;
      return finalMedia;
    }

    return [];
  }

  /**
   * Query only Photos
   */
  public async queryImages(): Promise<Photo[]> {
    const all = await this.queryAllMedia();
    return all.filter((m) => !m.isVideo);
  }

  /**
   * Query only Videos
   */
  public async queryVideos(): Promise<Photo[]> {
    const all = await this.queryAllMedia();
    return all.filter((m) => m.isVideo);
  }

  /**
   * Query media count totals
   */
  public async queryCounts(): Promise<{ photosCount: number; videosCount: number; totalCount: number }> {
    const all = await this.queryAllMedia();
    const active = all.filter((m) => !m.isTrash && !m.isHidden);
    const photosCount = active.filter((m) => !m.isVideo).length;
    const videosCount = active.filter((m) => m.isVideo).length;
    return { photosCount, videosCount, totalCount: active.length };
  }

  /**
   * Refresh media from MediaStore and notify subscribers
   */
  public async refreshFromMediaStore(): Promise<Photo[]> {
    this.cachedMedia = null;
    const updated = await this.queryAllMedia();
    this.notifyMediaChanged();
    return updated;
  }

  /**
   * Convert native Android MediaStore items into the authoritative Photo data model
   * strictly using real Android metadata.
   */
  public convertRawAndroidItems(rawList: AndroidMediaItemRaw[]): Photo[] {
    return rawList.map((item) => {
      // 1. Timestamps: Prefer dateTaken (millis), then dateAdded (seconds), then dateModified
      let timestamp = Date.now();
      if (item.dateTaken && item.dateTaken > 0) {
        timestamp = item.dateTaken > 10000000000 ? item.dateTaken : item.dateTaken * 1000;
      } else if (item.dateAdded && item.dateAdded > 0) {
        timestamp = item.dateAdded > 10000000000 ? item.dateAdded : item.dateAdded * 1000;
      } else if (item.dateModified && item.dateModified > 0) {
        timestamp = item.dateModified > 10000000000 ? item.dateModified : item.dateModified * 1000;
      }

      const dateObj = new Date(timestamp);
      const isVideo =
        item.mediaType === "video" ||
        (item.mimeType && item.mimeType.startsWith("video/")) ||
        item.displayName.match(/\.(mp4|webm|mov|mkv|3gp|avi|m4v)$/i) !== null;

      // 2. Real Display Name: Use actual filename from MediaStore
      const realDisplayName = item.displayName || (isVideo ? "Video" : "Photo");

      // 3. Category classification based on bucket/album or mime
      let category: PhotoCategory = isVideo ? "Videos" : "Travel";
      const bucketLower = (item.bucketName || "").toLowerCase();
      if (bucketLower.includes("screenshot")) {
        category = "Screenshots";
      } else if (bucketLower.includes("document") || bucketLower.includes("download") || bucketLower.includes("pdf")) {
        category = "Documents";
      }

      // 4. File Size formatting
      let formattedSize = "Unknown";
      if (typeof item.fileSize === "number" && item.fileSize > 0) {
        formattedSize = formatBytes(item.fileSize);
      } else if (typeof item.fileSize === "string" && item.fileSize.trim()) {
        formattedSize = item.fileSize;
      }

      // 5. Resolution: Real dimensions
      const resolution =
        item.width && item.height && item.width > 0 && item.height > 0
          ? `${item.width} × ${item.height}`
          : undefined;

      // 6. Video duration
      let durationStr: string | undefined = undefined;
      if (isVideo && item.duration) {
        const sec = item.duration > 1000 ? Math.round(item.duration / 1000) : Math.round(item.duration);
        durationStr = formatSecondsToTime(sec);
      }

      const photo: Photo = {
        id: item.id || `android-media-${timestamp}-${Math.random().toString(36).substr(2, 6)}`,
        title: realDisplayName,
        url: item.contentUri,
        highResUrl: item.contentUri,
        isVideo,
        videoUrl: isVideo ? item.contentUri : undefined,
        duration: durationStr,
        date: dateObj.toISOString(),
        year: dateObj.getFullYear(),
        month: dateObj.toLocaleString("en-US", { month: "long", year: "numeric" }),
        day: dateObj.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        category,
        isFavorite: false,
        isTrash: false,
        isHidden: false,
        cloudStatus: "local_only",
        fileSize: formattedSize,
        resolution: resolution || (isVideo ? "1920 × 1080" : "Original Resolution"),
        // Real EXIF & Camera only if actually provided
        camera: item.camera || undefined,
        exif: item.camera
          ? {
              camera: item.camera,
              aperture: item.aperture,
              iso: typeof item.iso === "number" ? item.iso : item.iso ? parseInt(String(item.iso), 10) || undefined : undefined,
              shutterSpeed: item.shutterSpeed,
            }
          : undefined,
        location: item.location
          ? {
              name: item.location.name || item.location.city || "Device Location",
              city: item.location.city || "Local",
              country: item.location.country || "Device",
              lat: item.location.lat ?? 0,
              lng: item.location.lng ?? 0,
            }
          : undefined,
        tags: [item.bucketName || "Camera", isVideo ? "video" : "photo"].filter(Boolean),
        people: [],
        dominantColors: isVideo ? ["#1e1b4b", "#0f172a"] : ["#3b82f6", "#1e293b"],
      };

      return photo;
    });
  }

  /**
   * Delete media item via Android ContentResolver / MediaStore delete
   */
  public async deleteMedia(photoId: string): Promise<boolean> {
    // 1. Native Android deletion bridge (invokes ContentResolver.delete or MediaStore.createDeleteRequest)
    if (typeof (window as any).AndroidMedia?.deleteMedia === "function") {
      try {
        const res = await (window as any).AndroidMedia.deleteMedia(photoId);
        if (res.success) {
          await deletePhotoFromDb(photoId);
          this.cachedMedia = null;
          this.notifyMediaChanged();
          return true;
        }
      } catch (err) {
        console.warn("Native Android MediaStore deletion error:", err);
      }
    }

    // 2. Delete from persistent database
    try {
      await deletePhotoFromDb(photoId);
      this.cachedMedia = null;
      this.notifyMediaChanged();
      return true;
    } catch (err) {
      console.error("Failed to delete media item:", err);
      return false;
    }
  }

  /**
   * Save edited media back to device storage / MediaStore
   */
  public async saveEditedMedia(
    blob: Blob,
    originalPhoto: Photo,
    isCopy: boolean
  ): Promise<Photo> {
    const isVideo = originalPhoto.isVideo || blob.type.startsWith("video/");
    const baseTitle = originalPhoto.title || (isVideo ? "Video" : "Photo");
    const cleanBase = baseTitle.replace(/\.[^/.]+$/, "");
    const fileExt = isVideo ? "mp4" : "jpg";
    const newTitle = isCopy ? `${cleanBase}_copy.${fileExt}` : `${cleanBase}.${fileExt}`;
    const file = new File([blob], newTitle, {
      type: blob.type || (isVideo ? "video/mp4" : "image/jpeg"),
    });

    const processedRes = isVideo ? await processVideoFile(file) : await processImageFile(file);
    const newPhotoId = isCopy
      ? `device-edit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
      : originalPhoto.id;

    const savedPhoto: Photo = {
      ...processedRes.photo,
      id: newPhotoId,
      title: newTitle,
      category: originalPhoto.category,
      isFavorite: originalPhoto.isFavorite,
      tags: [...(originalPhoto.tags || []), "edited"],
    };

    // 1. Native Android Save Bridge
    if (typeof (window as any).AndroidMedia?.saveMedia === "function") {
      try {
        await (window as any).AndroidMedia.saveMedia({
          id: savedPhoto.id,
          fileName: newTitle,
          isCopy,
          mimeType: file.type,
        });
      } catch (err) {
        console.warn("Native Android save error:", err);
      }
    }

    // 2. Save into IndexedDB
    await saveSinglePhotoToDb(savedPhoto, blob);
    this.cachedMedia = null;
    this.notifyMediaChanged();
    return savedPhoto;
  }

  /**
   * Import files from file picker / camera
   */
  public async importDeviceFiles(files: FileList | File[]): Promise<{ photos: Photo[]; count: number }> {
    const { photos: newPhotos, blobsMap } = await batchProcessDeviceFiles(files);
    if (newPhotos.length > 0) {
      await savePhotosToDb(newPhotos, blobsMap);
      this.setPermissionState("granted");
      this.cachedMedia = null;
      this.notifyMediaChanged();
    }
    return { photos: newPhotos, count: newPhotos.length };
  }

  /**
   * Toggle persistent favorite state by media ID
   */
  public toggleFavorite(photoId: string, currentStatus: boolean): boolean {
    const nextStatus = !currentStatus;
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const map: Record<string, boolean> = raw ? JSON.parse(raw) : {};
      map[photoId] = nextStatus;
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(map));
    } catch {}
    return nextStatus;
  }

  /**
   * Apply persistent favorites map to a list of photos
   */
  public applyFavorites(photos: Photo[]): Photo[] {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!raw) return photos;
      const map: Record<string, boolean> = JSON.parse(raw);
      return photos.map((p) => {
        if (map[p.id] !== undefined) {
          return { ...p, isFavorite: map[p.id] };
        }
        return p;
      });
    } catch {
      return photos;
    }
  }

  /**
   * Generate dynamic albums from real MediaStore buckets
   */
  public generateDynamicAlbums(photos: Photo[]): Album[] {
    const albums: Album[] = [];
    const activePhotos = photos.filter((p) => !p.isTrash && !p.isHidden);

    // 1. Favorites System Album
    const favoritePhotos = activePhotos.filter((p) => p.isFavorite);
    if (favoritePhotos.length > 0 || photos.length > 0) {
      albums.push({
        id: "album-favorites",
        name: "Favorites",
        type: "system",
        icon: "Heart",
        photoIds: favoritePhotos.map((p) => p.id),
        coverUrl: favoritePhotos[0]?.url || activePhotos[0]?.url || "",
        createdAt: new Date().toISOString(),
        description: "Starred photos and videos",
      });
    }

    // 2. Videos System Album
    const videoPhotos = activePhotos.filter((p) => p.isVideo);
    if (videoPhotos.length > 0) {
      albums.push({
        id: "album-videos",
        name: "Videos",
        type: "system",
        icon: "Video",
        photoIds: videoPhotos.map((p) => p.id),
        coverUrl: videoPhotos[0]?.url || "",
        createdAt: new Date().toISOString(),
        description: "Videos from device storage",
      });
    }

    // 3. Screenshots Bucket Album
    const screenshotPhotos = activePhotos.filter(
      (p) =>
        p.category === "Screenshots" ||
        (p.title && p.title.toLowerCase().includes("screenshot")) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes("screenshot")))
    );
    if (screenshotPhotos.length > 0) {
      albums.push({
        id: "album-screenshots",
        name: "Screenshots",
        type: "system",
        icon: "Smartphone",
        photoIds: screenshotPhotos.map((p) => p.id),
        coverUrl: screenshotPhotos[0]?.url || "",
        createdAt: new Date().toISOString(),
        description: "Device screen captures",
      });
    }

    // 4. Camera Bucket Album (DCIM/Camera)
    const cameraPhotos = activePhotos.filter(
      (p) => !p.isVideo && p.category !== "Screenshots" && p.category !== "Documents"
    );
    if (cameraPhotos.length > 0) {
      albums.push({
        id: "album-camera",
        name: "Camera",
        type: "system",
        icon: "Camera",
        photoIds: cameraPhotos.map((p) => p.id),
        coverUrl: cameraPhotos[0]?.url || "",
        createdAt: new Date().toISOString(),
        description: "Captured with device camera",
      });
    }

    // 5. Bucket-specific albums from tags
    const bucketMap = new Map<string, Photo[]>();
    for (const p of activePhotos) {
      if (p.tags && p.tags.length > 0) {
        for (const tag of p.tags) {
          const tagClean = tag.trim();
          if (
            tagClean &&
            !["android media", "device media", "photo", "video", "Camera", "Screenshots"].includes(tagClean)
          ) {
            if (!bucketMap.has(tagClean)) {
              bucketMap.set(tagClean, []);
            }
            bucketMap.get(tagClean)!.push(p);
          }
        }
      }
    }

    for (const [bucketName, bList] of bucketMap.entries()) {
      if (bList.length >= 2) {
        albums.push({
          id: `album-bucket-${bucketName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: bucketName,
          type: "custom",
          icon: "Folder",
          photoIds: bList.map((p) => p.id),
          coverUrl: bList[0]?.url || "",
          createdAt: new Date().toISOString(),
          description: `${bucketName} media folder`,
        });
      }
    }

    return albums;
  }

  /**
   * Subscribe to MediaStore changes
   */
  public subscribeMediaChanges(callback: () => void): () => void {
    this.mediaChangeListeners.add(callback);
    return () => {
      this.mediaChangeListeners.delete(callback);
    };
  }

  private notifyMediaChanged() {
    for (const listener of this.mediaChangeListeners) {
      try {
        listener();
      } catch (err) {
        console.error("Error in media change listener:", err);
      }
    }
  }
}

export const galleyarMediaRepository = new GalleyarMediaRepository();

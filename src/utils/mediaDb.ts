/**
 * Galleyar High-Capacity IndexedDB Media Database
 * Provides virtually unlimited storage for real device photos and videos on mobile APK / Web.
 */
import { Photo, Album, PersonCluster, MemoryStory } from "../types";

const DB_NAME = "GalleyarMediaDB";
const DB_VERSION = 2;

const STORE_PHOTOS = "photos";
const STORE_MEDIA_BLOBS = "media_blobs";
const STORE_META = "device_meta";

let dbInstance: IDBDatabase | null = null;
const memoryObjectUrlCache = new Map<string, string>();

/**
 * Initialize or get open IndexedDB database
 */
export async function openMediaDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        const photoStore = db.createObjectStore(STORE_PHOTOS, { keyPath: "id" });
        photoStore.createIndex("date", "date", { unique: false });
        photoStore.createIndex("isVideo", "isVideo", { unique: false });
        photoStore.createIndex("isTrash", "isTrash", { unique: false });
        photoStore.createIndex("isHidden", "isHidden", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_MEDIA_BLOBS)) {
        db.createObjectStore(STORE_MEDIA_BLOBS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      console.error("IndexedDB open failed:", request.error);
      reject(request.error);
    };
  });
}

/**
 * Save photos and optional binary Blobs into IndexedDB
 */
export async function savePhotosToDb(
  photos: Photo[],
  blobsMap?: Map<string, Blob>
): Promise<void> {
  try {
    const db = await openMediaDb();
    const tx = db.transaction([STORE_PHOTOS, STORE_MEDIA_BLOBS], "readwrite");
    const photoStore = tx.objectStore(STORE_PHOTOS);
    const blobStore = tx.objectStore(STORE_MEDIA_BLOBS);

    for (const photo of photos) {
      photoStore.put(photo);
    }

    if (blobsMap && blobsMap.size > 0) {
      for (const [id, blob] of blobsMap.entries()) {
        blobStore.put({ id, blob, mimeType: blob.type, size: blob.size, updatedAt: Date.now() });
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to save photos to IndexedDB:", err);
  }
}

/**
 * Save a single photo and optional high-res/video blob
 */
export async function saveSinglePhotoToDb(photo: Photo, blob?: Blob): Promise<void> {
  try {
    const db = await openMediaDb();
    const tx = db.transaction([STORE_PHOTOS, STORE_MEDIA_BLOBS], "readwrite");
    tx.objectStore(STORE_PHOTOS).put(photo);

    if (blob) {
      tx.objectStore(STORE_MEDIA_BLOBS).put({
        id: photo.id,
        blob,
        mimeType: blob.type,
        size: blob.size,
        updatedAt: Date.now(),
      });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to save single photo to IndexedDB:", err);
  }
}

/**
 * Load all photos from IndexedDB and rehydrate Blob URLs
 */
export async function loadPhotosFromDb(): Promise<Photo[] | null> {
  try {
    const db = await openMediaDb();
    const tx = db.transaction([STORE_PHOTOS, STORE_MEDIA_BLOBS], "readonly");
    const photoStore = tx.objectStore(STORE_PHOTOS);
    const blobStore = tx.objectStore(STORE_MEDIA_BLOBS);

    const photos: Photo[] = await new Promise((resolve, reject) => {
      const req = photoStore.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (!photos || photos.length === 0) {
      return null;
    }

    // Load blobs to restore Object URLs if needed
    const allBlobs: Array<{ id: string; blob: Blob }> = await new Promise((resolve, reject) => {
      const req = blobStore.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const blobMap = new Map<string, Blob>();
    for (const item of allBlobs) {
      if (item.id && item.blob) {
        blobMap.set(item.id, item.blob);
      }
    }

    // Rehydrate URLs
    const rehydrated = photos.map((photo) => {
      const blob = blobMap.get(photo.id);
      if (blob) {
        let objectUrl = memoryObjectUrlCache.get(photo.id);
        if (!objectUrl) {
          objectUrl = URL.createObjectURL(blob);
          memoryObjectUrlCache.set(photo.id, objectUrl);
        }

        return {
          ...photo,
          url: photo.url || objectUrl,
          highResUrl: objectUrl,
          videoUrl: photo.isVideo ? objectUrl : photo.videoUrl,
        };
      }
      return photo;
    });

    return rehydrated;
  } catch (err) {
    console.error("Failed to load photos from IndexedDB:", err);
    return null;
  }
}

/**
 * Alias for loadPhotosFromDb
 */
export const getAllPhotosFromDb = loadPhotosFromDb;

/**
 * Delete a photo and its stored media blob
 */
export async function deletePhotoFromDb(photoId: string): Promise<void> {
  try {
    const db = await openMediaDb();
    const tx = db.transaction([STORE_PHOTOS, STORE_MEDIA_BLOBS], "readwrite");
    tx.objectStore(STORE_PHOTOS).delete(photoId);
    tx.objectStore(STORE_MEDIA_BLOBS).delete(photoId);

    const cachedUrl = memoryObjectUrlCache.get(photoId);
    if (cachedUrl) {
      URL.revokeObjectURL(cachedUrl);
      memoryObjectUrlCache.delete(photoId);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to delete photo from IndexedDB:", err);
  }
}

/**
 * Calculate total device storage consumed by photos and videos
 */
export async function getDeviceStorageStats(): Promise<{
  photoCount: number;
  videoCount: number;
  totalSizeBytes: number;
  formattedSize: string;
}> {
  try {
    const db = await openMediaDb();
    const tx = db.transaction([STORE_PHOTOS, STORE_MEDIA_BLOBS], "readonly");
    const photoStore = tx.objectStore(STORE_PHOTOS);
    const blobStore = tx.objectStore(STORE_MEDIA_BLOBS);

    const photos: Photo[] = await new Promise((res, rej) => {
      const req = photoStore.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });

    const blobs: Array<{ size: number }> = await new Promise((res, rej) => {
      const req = blobStore.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });

    let totalBytes = 0;
    for (const b of blobs) {
      totalBytes += b.size || 0;
    }

    // Add estimate for base64 / metadata
    for (const p of photos) {
      if (p.url && p.url.startsWith("data:")) {
        totalBytes += p.url.length * 0.75;
      }
    }

    const photoCount = photos.filter((p) => !p.isVideo && !p.isTrash).length;
    const videoCount = photos.filter((p) => p.isVideo && !p.isTrash).length;

    let formattedSize = "0 KB";
    if (totalBytes > 1024 * 1024 * 1024) {
      formattedSize = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (totalBytes > 1024 * 1024) {
      formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (totalBytes > 0) {
      formattedSize = `${Math.round(totalBytes / 1024)} KB`;
    }

    return {
      photoCount,
      videoCount,
      totalSizeBytes: totalBytes,
      formattedSize,
    };
  } catch (err) {
    return { photoCount: 0, videoCount: 0, totalSizeBytes: 0, formattedSize: "0 KB" };
  }
}

/**
 * Clear all stored device media and reset
 */
export async function clearAllDeviceMedia(): Promise<void> {
  try {
    for (const url of memoryObjectUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    memoryObjectUrlCache.clear();

    const db = await openMediaDb();
    const tx = db.transaction([STORE_PHOTOS, STORE_MEDIA_BLOBS, STORE_META], "readwrite");
    tx.objectStore(STORE_PHOTOS).clear();
    tx.objectStore(STORE_MEDIA_BLOBS).clear();
    tx.objectStore(STORE_META).clear();

    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.error("Failed to clear device media:", err);
  }
}

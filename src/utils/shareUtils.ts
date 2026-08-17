import { Photo } from "../types";

/**
 * Copy plain text to system clipboard with modern Clipboard API and legacy fallback
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard.writeText failed, attempting fallback:", err);
  }

  // Fallback for non-secure contexts or older browsers
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error("Failed to copy text:", fallbackErr);
    return false;
  }
}

/**
 * Copy image binary to clipboard as image/png so it can be pasted directly into apps
 */
export async function copyImageBinaryToClipboard(imageUrl: string): Promise<boolean> {
  try {
    if (typeof window === "undefined" || typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      return false;
    }

    // Convert imageUrl into a PNG Blob using HTML Canvas for universal browser clipboard compatibility
    const pngBlob = await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), "image/png");
      };
      img.onerror = async () => {
        // Direct fetch fallback
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          resolve(blob);
        } catch {
          resolve(null);
        }
      };
      img.src = imageUrl;
    });

    if (!pngBlob) return false;

    // ClipboardItem standard expects image/png
    const clipboardItem = new ClipboardItem({
      [pngBlob.type.startsWith("image/") ? pngBlob.type : "image/png"]: pngBlob,
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (err) {
    console.warn("copyImageBinaryToClipboard failed:", err);
    return false;
  }
}

/**
 * Clean a string to be used safely as a filename
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 60);
}

/**
 * Download a single media item (Photo or Video)
 */
export async function downloadMediaItem(
  url: string,
  title?: string,
  isVideo?: boolean
): Promise<boolean> {
  try {
    const rawName = title || (isVideo ? "video" : "photo");
    const safeName = sanitizeFilename(rawName);
    const defaultExt = isVideo ? ".mp4" : ".jpg";
    const filename = `${safeName}-${Date.now()}${defaultExt}`;

    // If it's already a blob: or data: URL, trigger direct anchor download
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    // Otherwise fetch the resource and create a downloadable object URL
    try {
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      return true;
    } catch {
      // Fallback: Direct link download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }
  } catch (err) {
    console.error("downloadMediaItem error:", err);
    return false;
  }
}

/**
 * Batch download multiple media items sequentially
 */
export async function downloadBatchMedia(
  items: Photo[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const mediaUrl = item.highResUrl || item.url || item.videoUrl;
    if (mediaUrl) {
      await downloadMediaItem(mediaUrl, item.title, item.isVideo);
    }
    onProgress?.(i + 1, items.length);
    // Brief interval to prevent browser download throttling
    if (i < items.length - 1) {
      await new Promise((res) => setTimeout(res, 250));
    }
  }
}

/**
 * Trigger native Web Share API (Mobile & supported desktop browsers)
 */
export async function triggerNativeShare(
  title: string,
  text: string,
  url: string,
  photo?: Photo
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    throw new Error("Web Share API is not supported in this browser");
  }

  const shareData: ShareData = {
    title,
    text,
  };

  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    shareData.url = url;
  }

  // Attempt file sharing if available
  if (photo && navigator.canShare) {
    try {
      const mediaUrl = photo.highResUrl || photo.url;
      if (mediaUrl) {
        const response = await fetch(mediaUrl);
        const blob = await response.blob();
        const ext = photo.isVideo ? "mp4" : "jpg";
        const file = new File([blob], `${sanitizeFilename(photo.title || "media")}.${ext}`, {
          type: blob.type || (photo.isVideo ? "video/mp4" : "image/jpeg"),
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            ...shareData,
            files: [file],
          });
          return true;
        }
      }
    } catch (fileShareErr) {
      console.warn("Native file sharing failed, falling back to URL/text share:", fileShareErr);
    }
  }

  await navigator.share(shareData);
  return true;
}

/**
 * Social Sharing URL Generators
 */
export function getWhatsAppShareUrl(text: string, url: string): string {
  const content = [text, url].filter(Boolean).join("\n");
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`;
}

export function getTelegramShareUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function getTwitterShareUrl(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function getFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function getEmailShareUrl(subject: string, body: string, url: string): string {
  const fullBody = [body, url].filter(Boolean).join("\n\n");
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
}

export function getPinterestShareUrl(url: string, mediaUrl: string, description: string): string {
  return `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(mediaUrl)}&description=${encodeURIComponent(description)}`;
}

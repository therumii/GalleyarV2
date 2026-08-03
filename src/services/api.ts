import { Photo } from "../types";

export interface AnalyzePhotoResult {
  title?: string;
  category?: string;
  tags?: string[];
  ocrText?: string;
  facesDetected?: { label: string; expression: string }[];
  dominantColors?: string[];
  autoEnhance?: {
    brightness: number;
    contrast: number;
    saturation: number;
    warmth: number;
    recommendedFilter: string;
  };
  memoryTheme?: string;
}

export async function analyzePhotoWithAI(
  imageBase64: string,
  mimeType: string = "image/jpeg",
  photoTitle: string = ""
): Promise<AnalyzePhotoResult | null> {
  try {
    const response = await fetch("/api/gemini/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType, photoTitle }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.analysis) {
      return data.analysis as AnalyzePhotoResult;
    }
    return null;
  } catch (err) {
    console.error("Failed to call analyzePhotoWithAI:", err);
    return null;
  }
}

export async function searchPhotosWithAI(
  query: string,
  photos: Photo[]
): Promise<{ id: string; matchScore: number; reason: string }[]> {
  try {
    const response = await fetch("/api/gemini/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, photos }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && Array.isArray(data.matches)) {
      return data.matches;
    }
    return [];
  } catch (err) {
    console.error("Failed to execute smart search:", err);
    return [];
  }
}

export async function generateStoryWithAI(
  topic: string,
  photoTitles: string[]
): Promise<{
  title: string;
  subtitle: string;
  narrative: string;
  soundtrack: string;
  palette: string[];
} | null> {
  try {
    const response = await fetch("/api/gemini/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, photoTitles }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.story || null;
  } catch (err) {
    console.error("Failed to generate story:", err);
    return null;
  }
}

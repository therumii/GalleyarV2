import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini SDK on server-side
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Route: Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Route: Analyze photo using Gemini
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", photoTitle = "" } = req.body;
    const ai = getGenAI();

    const parts: any[] = [];

    if (imageBase64) {
      // Remove data URL prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    const promptText = `Analyze this photo for a smart gallery app (like Apple Photos or Samsung Gallery).
Extract the following information:
1. Short descriptive title
2. Detected category (Portraits, Nature, Travel, Night, Food, Animals, Documents, Architecture, Events, Street)
3. List of tags (objects, lighting, emotion, aesthetic descriptors)
4. Extracted OCR text found in the photo (if any text exists, e.g. signs, document content, receipts, handwriting, or empty string if no text)
5. Detected faces summary (count, estimated expression, position descriptors)
6. Dominant color hex codes (3-4 hex codes)
7. Suggested auto-enhancement parameters (brightness -50 to 50, contrast -50 to 50, saturation -50 to 50, warmth -50 to 50, recommendedFilter)
8. Suggested album categories or memory story theme.

Photo title provided: ${photoTitle || "Untitled"}`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            ocrText: { type: Type.STRING },
            facesDetected: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  expression: { type: Type.STRING },
                },
              },
            },
            dominantColors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            autoEnhance: {
              type: Type.OBJECT,
              properties: {
                brightness: { type: Type.NUMBER },
                contrast: { type: Type.NUMBER },
                saturation: { type: Type.NUMBER },
                warmth: { type: Type.NUMBER },
                recommendedFilter: { type: Type.STRING },
              },
            },
            memoryTheme: { type: Type.STRING },
          },
        },
      },
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    res.json({ success: true, analysis: data });
  } catch (error: any) {
    console.error("Error in /api/gemini/analyze:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze photo",
    });
  }
});

// API Route: Smart Natural Language Photo Search
app.post("/api/gemini/search", async (req, res) => {
  try {
    const { query, photos } = req.body;
    if (!query || !photos || !Array.isArray(photos)) {
      return res.status(400).json({ error: "Missing query or photos array" });
    }

    const ai = getGenAI();

    const photoSummaries = photos.map((p: any) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      location: p.location?.name,
      date: p.date,
      tags: p.tags,
      people: p.people,
      ocrText: p.ocrText,
      camera: p.exif?.camera,
    }));

    const prompt = `You are the AI Search Engine for Lumina Gallery.
User Search Query: "${query}"

Here is the list of available photos in the user's gallery:
${JSON.stringify(photoSummaries, null, 2)}

Match which photos satisfy the user's search query (semantic match, location, people, time, text in image, atmosphere, or colors).
Return an array of matched photo objects with ID, matchScore (0.0 to 1.0), and a brief 1-sentence reason why it matched.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              matchScore: { type: Type.NUMBER },
              reason: { type: Type.STRING },
            },
            required: ["id", "matchScore", "reason"],
          },
        },
      },
    });

    const matches = JSON.parse(response.text || "[]");
    res.json({ success: true, matches });
  } catch (error: any) {
    console.error("Error in /api/gemini/search:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute smart search",
    });
  }
});

// API Route: AI Memory Story / Reel Generator
app.post("/api/gemini/story", async (req, res) => {
  try {
    const { topic, photoTitles = [] } = req.body;
    const ai = getGenAI();

    const prompt = `Generate an inspiring Apple/Samsung style photo memory story reel metadata for topic: "${topic || "Recent Highlights"}".
Selected photos in story: ${photoTitles.join(", ")}.

Provide:
1. Emotional Title
2. Subtitle / Date range suggestion
3. Short 2-sentence narrative memory caption
4. Suggested ambient background soundtrack mood (e.g., "Acoustic Sunset", "Uplifting Cinema", "Lo-Fi Breeze", "Piano Reflections")
5. Auto-curated mood color palette (2-3 hex values)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            narrative: { type: Type.STRING },
            soundtrack: { type: Type.STRING },
            palette: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const story = JSON.parse(response.text || "{}");
    res.json({ success: true, story });
  } catch (error: any) {
    console.error("Error in /api/gemini/story:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lumina Gallery server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

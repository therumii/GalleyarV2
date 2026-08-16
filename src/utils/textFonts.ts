import { TextOverlay, TextBlendMode } from "../types";

export interface FontOption {
  id: string;
  name: string;
  category: "sans" | "serif" | "display" | "handwriting" | "mono";
  fontFamilyCss: string;
  canvasFontName: string;
}

export interface GradientPreset {
  id: string;
  name: string;
  colors: string[];
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "sunset", name: "Sunset", colors: ["#f97316", "#db2777"] },
  { id: "ocean", name: "Ocean", colors: ["#06b6d4", "#3b82f6"] },
  { id: "aurora", name: "Aurora", colors: ["#10b981", "#6366f1"] },
  { id: "fire", name: "Fire", colors: ["#ef4444", "#eab308"] },
  { id: "pastel", name: "Pastel", colors: ["#f472b6", "#c084fc"] },
  { id: "monochrome", name: "Mono", colors: ["#ffffff", "#64748b"] },
  { id: "neon", name: "Neon", colors: ["#a855f7", "#06b6d4"] },
  { id: "berry", name: "Berry", colors: ["#ec4899", "#8b5cf6"] },
  { id: "gold", name: "Gold", colors: ["#fde047", "#ca8a04"] },
  { id: "cyberpunk", name: "Cyber", colors: ["#38bdf8", "#f43f5e"] },
  { id: "lime", name: "Lime", colors: ["#a3e635", "#14b8a6"] },
  { id: "twilight", name: "Twilight", colors: ["#6366f1", "#a855f7"] },
];

export interface GradientDirectionOption {
  id: string;
  label: string;
  symbol: string;
  angle: number;
}

export const GRADIENT_DIRECTIONS: GradientDirectionOption[] = [
  { id: "right", label: "Left to Right", symbol: "→", angle: 90 },
  { id: "bottom-right", label: "Top-Left to Bottom-Right", symbol: "↘", angle: 135 },
  { id: "down", label: "Top to Bottom", symbol: "↓", angle: 180 },
  { id: "bottom-left", label: "Top-Right to Bottom-Left", symbol: "↙", angle: 225 },
  { id: "left", label: "Right to Left", symbol: "←", angle: 270 },
  { id: "up", label: "Bottom to Top", symbol: "↑", angle: 0 },
];

export interface BlendModeOption {
  id: TextBlendMode;
  name: string;
  description: string;
}

export const BLEND_MODES: BlendModeOption[] = [
  { id: "normal", name: "Normal", description: "Default standard text overlay" },
  { id: "multiply", name: "Multiply", description: "Darkens text by multiplying base pixels" },
  { id: "screen", name: "Screen", description: "Lightens text, creating vibrant glow" },
  { id: "overlay", name: "Overlay", description: "Enhances underlying photo contrast" },
  { id: "darken", name: "Darken", description: "Retains darker pixels" },
  { id: "lighten", name: "Lighten", description: "Retains lighter pixels" },
  { id: "color-dodge", name: "Color Dodge", description: "Intense highlights and luminance" },
  { id: "soft-light", name: "Soft Light", description: "Subtle diffused illumination" },
  { id: "difference", name: "Difference", description: "Inverted contrast tone effect" },
  { id: "luminosity", name: "Luminosity", description: "Preserves underlying hue & saturation" },
];

export const AVAILABLE_FONTS: FontOption[] = [
  {
    id: "sans",
    name: "Classic",
    category: "sans",
    fontFamilyCss: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    canvasFontName: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  {
    id: "modern",
    name: "Modern",
    category: "sans",
    fontFamilyCss: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    canvasFontName: "'Outfit', sans-serif",
  },
  {
    id: "bold",
    name: "Bold",
    category: "display",
    fontFamilyCss: "'Oswald', Impact, sans-serif",
    canvasFontName: "'Oswald', Impact, sans-serif",
  },
  {
    id: "serif",
    name: "Serif",
    category: "serif",
    fontFamilyCss: "'Playfair Display', Georgia, serif",
    canvasFontName: "'Playfair Display', Georgia, serif",
  },
  {
    id: "handwritten",
    name: "Hand",
    category: "handwriting",
    fontFamilyCss: "'Caveat', cursive",
    canvasFontName: "'Caveat', cursive",
  },
  {
    id: "elegant",
    name: "Elegant",
    category: "serif",
    fontFamilyCss: "'Cormorant Garamond', Georgia, serif",
    canvasFontName: "'Cormorant Garamond', Georgia, serif",
  },
  {
    id: "mono",
    name: "Mono",
    category: "mono",
    fontFamilyCss: "'JetBrains Mono', 'Courier New', monospace",
    canvasFontName: "'JetBrains Mono', monospace",
  },
  {
    id: "rounded",
    name: "Round",
    category: "sans",
    fontFamilyCss: "'Quicksand', 'Plus Jakarta Sans', sans-serif",
    canvasFontName: "'Quicksand', sans-serif",
  },
];

export function getFontOption(fontId: string): FontOption {
  const found = AVAILABLE_FONTS.find((f) => f.id === fontId);
  if (found) return found;

  // Legacy mappings
  if (fontId === "display") return AVAILABLE_FONTS.find((f) => f.id === "bold") || AVAILABLE_FONTS[0];
  if (fontId === "script") return AVAILABLE_FONTS.find((f) => f.id === "handwritten") || AVAILABLE_FONTS[0];

  return AVAILABLE_FONTS[0];
}

export const POPULAR_COLORS = [
  "#ffffff",
  "#000000",
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#818cf8",
  "#c084fc",
  "#f472b6",
  "#f43f5e",
  "#94a3b8",
];

export const POPULAR_BG_COLORS = [
  "rgba(0, 0, 0, 0.75)",
  "rgba(255, 255, 255, 0.9)",
  "rgba(99, 102, 241, 0.85)",
  "rgba(239, 68, 68, 0.85)",
  "rgba(245, 158, 11, 0.85)",
  "rgba(16, 185, 129, 0.85)",
  "rgba(14, 165, 233, 0.85)",
  "rgba(168, 85, 247, 0.85)",
  "rgba(236, 72, 153, 0.85)",
];

/**
 * Builds CSS style object for interactive DOM preview
 */
export function buildTextLayerStyle(overlay: TextOverlay): React.CSSProperties {
  const font = getFontOption(overlay.fontFamily);
  const isGradient = overlay.fillType === "gradient" && overlay.gradient && overlay.gradient.colors?.length > 1;

  const styleObj: React.CSSProperties = {
    fontFamily: font.fontFamilyCss,
    color: isGradient ? "transparent" : overlay.color || "#ffffff",
    opacity: overlay.opacity ?? 1,
    textAlign: overlay.alignment || "center",
    fontWeight: overlay.bold ? 800 : (font.id === "bold" ? 700 : 600),
    fontStyle: overlay.italic || font.id === "handwritten" ? "italic" : "normal",
    textDecoration: [
      overlay.underline ? "underline" : "",
      overlay.strikethrough ? "line-through" : "",
    ]
      .filter(Boolean)
      .join(" ") || "none",
    letterSpacing: overlay.letterSpacing ? `${overlay.letterSpacing}em` : "normal",
    lineHeight: overlay.lineSpacing || 1.25,
    mixBlendMode: (overlay.blendMode as any) || "normal",
  };

  // Gradient text rendering in CSS
  if (isGradient && overlay.gradient) {
    const angle = overlay.gradient.angle ?? 90;
    const gradientCss = `linear-gradient(${angle}deg, ${overlay.gradient.colors.join(", ")})`;
    styleObj.backgroundImage = gradientCss;
    styleObj.WebkitBackgroundClip = "text";
    (styleObj as any).backgroundClip = "text";
    (styleObj as any).WebkitTextFillColor = "transparent";
  }

  // Text Shadow
  const hasShadow = overlay.shadow || overlay.style === "shadow";
  if (hasShadow) {
    const blur = overlay.shadowBlur ?? 8;
    const offX = overlay.shadowOffsetX ?? 2;
    const offY = overlay.shadowOffsetY ?? 2;
    const shadowCol = overlay.shadowColor || "rgba(0, 0, 0, 0.85)";
    if (isGradient) {
      // In CSS, text-shadow behind background-clip: text requires drop-shadow filter
      styleObj.filter = `drop-shadow(${offX}px ${offY}px ${blur / 2}px ${shadowCol})`;
    } else {
      styleObj.textShadow = `${offX}px ${offY}px ${blur}px ${shadowCol}`;
    }
  }

  // Text Stroke / Outline
  const hasStroke = overlay.stroke || overlay.style === "outline";
  if (hasStroke) {
    const strokeColor = overlay.strokeColor || "#000000";
    const strokeW = overlay.strokeWidth ?? 1.5;
    (styleObj as any).WebkitTextStroke = `${strokeW}px ${strokeColor}`;
  }

  return styleObj;
}

/**
 * Maps TextBlendMode to standard HTML5 Canvas 2D GlobalCompositeOperation
 */
export function getCanvasCompositeOperation(blendMode?: TextBlendMode): GlobalCompositeOperation {
  switch (blendMode) {
    case "multiply":
      return "multiply";
    case "screen":
      return "screen";
    case "overlay":
      return "overlay";
    case "darken":
      return "darken";
    case "lighten":
      return "lighten";
    case "color-dodge":
      return "color-dodge";
    case "soft-light":
      return "soft-light";
    case "difference":
      return "difference";
    case "luminosity":
      return "luminosity";
    case "normal":
    default:
      return "source-over";
  }
}


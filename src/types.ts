export type SortByOption = "date" | "title" | "category" | "fileSize";
export type SortOrderOption = "asc" | "desc";

export type PhotoCategory =
  | "Portraits"
  | "Nature"
  | "Travel"
  | "Night"
  | "Food"
  | "Animals"
  | "Documents"
  | "Architecture"
  | "Events"
  | "Screenshots"
  | "Videos";

export type CloudStatus = "backed_up" | "pending" | "syncing" | "local_only";

export interface FaceLocation {
  x: number; // percentage 0-100
  y: number;
  width: number;
  height: number;
}

export interface TaggedPerson {
  id: string;
  name: string;
  faceBox?: FaceLocation;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface PhotoExif {
  camera: string;
  lens?: string;
  aperture?: string;
  iso?: number;
  shutterSpeed?: string;
  focalLength?: string;
}

export interface PhotoLocation {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface PhotoDrawingPath {
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export type TextFillType = "solid" | "gradient";

export interface GradientColorStop {
  color: string;
  offset: number; // 0 to 1
}

export interface TextGradientConfig {
  enabled?: boolean;
  colors: string[]; // e.g. ["#f97316", "#db2777"]
  stops?: GradientColorStop[]; // optional custom stops
  angle: number; // 0 to 360 degrees
  presetId?: string; // e.g. "sunset", "ocean", "aurora", "fire", "pastel", "monochrome", "neon", "berry", "gold"
}

export type TextBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "soft-light"
  | "difference"
  | "luminosity";

export interface TextOverlay {
  id: string;
  text: string;
  xNormalized: number; // 0..1 relative to container width
  yNormalized: number; // 0..1 relative to container height
  scale: number;
  rotation: number; // degrees
  fontFamily: string; // "sans" | "serif" | "display" | "script" | "mono" | "modern" | "bold" | "handwritten" | "elegant" | "rounded"
  fontSizeRelative?: number;
  color: string;
  fillType?: TextFillType; // "solid" | "gradient"
  gradient?: TextGradientConfig;
  blendMode?: TextBlendMode; // "normal" | "multiply" | "screen" | "overlay", etc.
  opacity: number;
  alignment: "left" | "center" | "right";
  style: "normal" | "outline" | "shadow" | "background";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  letterSpacing?: number; // em spacing
  lineSpacing?: number;   // line height multiplier
  bgColor?: string;
  bgStyle?: "none" | "solid" | "rounded" | "pill";
  bgPadding?: number;
  stroke?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  shadow?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  zIndex?: number;
  startTime?: number; // for video text timing in seconds
  endTime?: number;   // for video text timing in seconds
}

export interface StickerOverlay {
  id: string;
  sticker: string; // Identifier or raw svg/emoji
  name?: string;
  svgContent?: string; // High-res vector SVG string
  imageUrl?: string; // Image URL for gallery-uploaded sticker or transparent PNG/WebP
  xNormalized: number;
  yNormalized: number;
  scale: number;
  rotation: number;
  opacity?: number;
  blendMode?: TextBlendMode;
  flipH?: boolean;
  flipV?: boolean;
  zIndex?: number;
  startTime?: number; // for video timing
  endTime?: number;   // for video timing
}

export interface PhotoEditState {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  warmth: number; // -100 to 100
  vignette: number; // 0 to 100
  blur: number; // 0 to 100
  filter: "none" | "vivid" | "amber" | "mono" | "dramatic" | "cyberpunk" | "vintage" | "noir";
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  cropRatio: "original" | "1:1" | "4:3" | "16:9" | "free" | "3:4" | "9:16";
  drawings?: PhotoDrawingPath[];
  erasedRegions?: { x: number; y: number; radius: number }[];
  textOverlays?: TextOverlay[];
  stickerOverlays?: StickerOverlay[];
}

export interface VideoEditState {
  trimStart: number;
  trimEnd: number;
  playbackRate: number;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  filter: string;
  rotation: number;
  isMuted: boolean;
  textOverlays?: TextOverlay[];
  stickerOverlays?: StickerOverlay[];
}

export interface Photo {
  id: string;
  title: string;
  description?: string;
  url: string;
  highResUrl: string;
  date: string; // ISO string e.g. "2026-07-28T14:30:00Z"
  year: number;
  month: string; // e.g. "July 2026"
  day: string; // e.g. "July 28, 2026"
  category: PhotoCategory;
  isFavorite: boolean;
  isTrash: boolean;
  isHidden: boolean;
  isVideo?: boolean;
  videoUrl?: string;
  duration?: string;
  cloudStatus: CloudStatus;
  cloudBackupDate?: string;
  fileSize: string;
  resolution: string;
  exif: PhotoExif;
  camera?: string;
  location: PhotoLocation;
  tags: string[];
  people: TaggedPerson[];
  faces?: TaggedPerson[];
  ocrText?: string;
  dominantColors?: string[];
  editedState?: PhotoEditState;
  videoEditState?: VideoEditState;
}

export interface Album {
  id: string;
  name: string;
  type: "system" | "custom";
  icon?: string;
  photoIds: string[];
  coverUrl?: string;
  createdAt: string;
  description?: string;
}

export interface PersonCluster {
  id: string;
  name: string;
  relationship?: string;
  coverPhotoUrl: string;
  photoIds: string[];
}

export interface MemoryStory {
  id: string;
  title: string;
  subtitle: string;
  narrative: string;
  soundtrack: string;
  dateRange: string;
  coverPhotoUrl: string;
  photoIds: string[];
  palette: string[];
}

export interface CloudSyncQuota {
  totalBytes: number;
  usedBytes: number;
  autoSyncEnabled: boolean;
  lastSyncTime: string;
  syncState: "idle" | "syncing" | "error" | "paused";
}

export interface NavState {
  view: ViewMode;
  albumId?: string | null;
  personId?: string | null;
  storyId?: string | null;
  city?: string | null;
  vaultAddModal?: boolean;
  activePhotoId?: string | null;
  activeEditorId?: string | null;
  isSettingsOpen?: boolean;
}

export type ViewMode =
  | "photos"
  | "videos"
  | "albums"
  | "memories"
  | "people"
  | "places"
  | "search"
  | "trash"
  | "hidden";

export type TimelineZoom = "years" | "months" | "days" | "all";
export type GridDensity = "compact" | "comfort" | "detail";

export interface SearchFilterState {
  query: string;
  category?: string;
  personId?: string;
  color?: string;
  cloudOnly?: boolean;
  hasText?: boolean;
  startDate?: string;
  endDate?: string;
}

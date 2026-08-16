import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Sliders,
  Crop,
  Palette,
  Save,
  Wand2,
  Undo,
  Check,
  Maximize2,
  Sparkles,
  Scissors,
  CheckCircle2,
  Copy,
  Type,
  Trash2,
  Plus,
  AlertCircle,
  Pencil,
  ChevronLeft,
  Sun,
  Smile,
} from "lucide-react";
import { Photo, PhotoEditState, TextOverlay, StickerOverlay } from "../types";
import { haptics } from "../utils/haptics";
import { getEditedMediaTitle } from "../utils/mediaTitle";
import { EditingToolDock, EditorTool } from "./EditingToolDock";
import { TextCanvasLayer } from "./photoEditor/TextCanvasLayer";
import { TextEditorBottomBar } from "./photoEditor/TextEditorBottomBar";
import { InlineTextEditModal } from "./photoEditor/InlineTextEditModal";
import { StickerCanvasLayer } from "./photoEditor/StickerCanvasLayer";
import { StickerEditorBottomBar } from "./photoEditor/StickerEditorBottomBar";
import { EraserCanvasOverlay } from "./photoEditor/EraserCanvasOverlay";
import { EraserControls } from "./photoEditor/EraserControls";
import {
  performIntelligentInpainting,
  renderMaskToCanvas,
  createMaskCanvas,
  EraserStroke,
} from "../utils/inpaintingEngine";
import {
  StickerGraphic,
  getStickerSvgDataUrl,
} from "../utils/stickerLibrary";
import { getFontOption, getCanvasCompositeOperation } from "../utils/textFonts";

interface PhotoEditorModalProps {
  photo: Photo;
  onSave: (updatedPhoto: Photo, isCopy?: boolean) => void;
  onClose: () => void;
}

export interface PhotoEditorRef {
  handleBack: () => boolean;
}

export const PhotoEditorModal = forwardRef<PhotoEditorRef, PhotoEditorModalProps>(({
  photo,
  onSave,
  onClose,
}, ref) => {
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [showDiscardConfirmModal, setShowDiscardConfirmModal] = useState(false);
  
  // Single active tool state
  const [activeTool, setActiveTool] = useState<EditorTool | null>("none");

  // Selected adjustment parameter for single-slider focus
  const [selectedAdjustment, setSelectedAdjustment] = useState<
    "brightness" | "contrast" | "saturation" | "warmth" | "vignette" | "eraser"
  >("brightness");

  // Photo image source state with undo history
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(
    photo.highResUrl || photo.url
  );
  const [urlHistory, setUrlHistory] = useState<string[]>([]);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Adjustments state
  const [brightness, setBrightness] = useState(
    photo.editedState?.brightness || 0
  );
  const [contrast, setContrast] = useState(photo.editedState?.contrast || 0);
  const [saturation, setSaturation] = useState(
    photo.editedState?.saturation || 0
  );
  const [warmth, setWarmth] = useState(photo.editedState?.warmth || 0);
  const [vignette, setVignette] = useState(photo.editedState?.vignette || 0);
  const [filter, setFilter] = useState<string>(
    photo.editedState?.filter || "none"
  );
  const [rotation, setRotation] = useState(photo.editedState?.rotation || 0);
  const [flipH, setFlipH] = useState(photo.editedState?.flipH || false);

  // Text Overlays State
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>(
    photo.editedState?.textOverlays || []
  );
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [isEditingInlineText, setIsEditingInlineText] = useState(false);
  const [snapGuide, setSnapGuide] = useState<{ x?: number; y?: number } | null>(null);

  // Sticker Overlays State
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>(
    photo.editedState?.stickerOverlays || []
  );
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);

  // Eraser / Inpainting State
  const [eraserStrokes, setEraserStrokes] = useState<EraserStroke[]>([]);
  const [eraserMode, setEraserMode] = useState<"remove" | "restore">("remove");
  const [eraserBrushSize, setEraserBrushSize] = useState<number>(35);
  const [eraserBrushSoftness, setEraserBrushSoftness] = useState<number>(0.2);
  const [isErasingWithAI, setIsErasingWithAI] = useState<boolean>(false);
  const [eraseSuccessMsg, setEraseSuccessMsg] = useState<boolean>(false);

  // Sticker Action Handlers
  const handleAddStickerGraphic = (graphic: StickerGraphic) => {
    const newSticker: StickerOverlay = {
      id: `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sticker: graphic.id,
      name: graphic.name,
      svgContent: graphic.svgContent,
      xNormalized: 0.5,
      yNormalized: 0.5,
      scale: 1,
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      flipH: false,
      flipV: false,
      zIndex: 30 + stickerOverlays.length,
    };
    setStickerOverlays((prev) => [...prev, newSticker]);
    setActiveStickerId(newSticker.id);
  };

  const handleAddGallerySticker = (imageUrl: string, name: string) => {
    const newSticker: StickerOverlay = {
      id: `sticker-gal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sticker: "custom-gallery",
      name: name || "Custom Sticker",
      imageUrl,
      xNormalized: 0.5,
      yNormalized: 0.5,
      scale: 1,
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      flipH: false,
      flipV: false,
      zIndex: 30 + stickerOverlays.length,
    };
    setStickerOverlays((prev) => [...prev, newSticker]);
    setActiveStickerId(newSticker.id);
  };

  const handleUpdateStickerLayer = (id: string, partial: Partial<StickerOverlay>) => {
    setStickerOverlays((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...partial } : s))
    );
  };

  const handleDeleteStickerLayer = (id: string) => {
    setStickerOverlays((prev) => prev.filter((s) => s.id !== id));
    if (activeStickerId === id) {
      setActiveStickerId(null);
    }
  };

  const handleDuplicateStickerLayer = (id: string) => {
    const source = stickerOverlays.find((s) => s.id === id);
    if (!source) return;
    const clone: StickerOverlay = {
      ...source,
      id: `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      xNormalized: Math.min(0.9, source.xNormalized + 0.05),
      yNormalized: Math.min(0.9, source.yNormalized + 0.05),
      zIndex: 30 + stickerOverlays.length + 1,
    };
    setStickerOverlays((prev) => [...prev, clone]);
    setActiveStickerId(clone.id);
  };

  const handleBringStickerForward = (id?: string) => {
    const targetId = id || activeStickerId;
    if (!targetId) return;
    setStickerOverlays((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, zIndex: (s.zIndex || 30) + 1 } : s))
    );
  };

  const handleSendStickerBackward = (id?: string) => {
    const targetId = id || activeStickerId;
    if (!targetId) return;
    setStickerOverlays((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, zIndex: Math.max(1, (s.zIndex || 30) - 1) } : s))
    );
  };

  const handleBringStickerToFront = () => {
    if (!activeStickerId) return;
    const maxZ = Math.max(30, ...stickerOverlays.map((s) => s.zIndex || 30));
    setStickerOverlays((prev) =>
      prev.map((s) => (s.id === activeStickerId ? { ...s, zIndex: maxZ + 2 } : s))
    );
  };

  const handleSendStickerToBack = () => {
    if (!activeStickerId) return;
    const minZ = Math.min(30, ...stickerOverlays.map((s) => s.zIndex || 30));
    setStickerOverlays((prev) =>
      prev.map((s) => (s.id === activeStickerId ? { ...s, zIndex: Math.max(1, minZ - 2) } : s))
    );
  };

  // Text Action Handlers
  const handleAddText = () => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: "Tap to edit",
      xNormalized: 0.5,
      yNormalized: 0.5,
      scale: 1,
      rotation: 0,
      fontSizeRelative: 28,
      fontFamily: "sans",
      color: "#ffffff",
      opacity: 1,
      blendMode: "normal",
      alignment: "center",
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      shadow: true,
      shadowColor: "rgba(0, 0, 0, 0.75)",
      shadowBlur: 8,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      stroke: false,
      strokeColor: "#000000",
      strokeWidth: 2,
      style: "normal",
      bgStyle: "none",
      bgColor: "rgba(0, 0, 0, 0.75)",
      bgPadding: 12,
      fillType: "solid",
      zIndex: 40 + textOverlays.length,
    };
    setTextOverlays((prev) => [...prev, newText]);
    setActiveTextId(newText.id);
    setIsEditingInlineText(true);
  };

  const handleUpdateTextLayer = (id: string, partial: Partial<TextOverlay>) => {
    setTextOverlays((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...partial } : t))
    );
  };

  const handleDeleteTextLayer = (id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const handleDuplicateTextLayer = (id: string) => {
    const target = textOverlays.find((t) => t.id === id);
    if (!target) return;
    const duplicated: TextOverlay = {
      ...target,
      id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      xNormalized: Math.min(0.85, target.xNormalized + 0.05),
      yNormalized: Math.min(0.85, target.yNormalized + 0.05),
      zIndex: (target.zIndex || 40) + 1,
    };
    setTextOverlays((prev) => [...prev, duplicated]);
    setActiveTextId(duplicated.id);
  };

  const handleStartInlineEdit = (id: string) => {
    setActiveTextId(id);
    setIsEditingInlineText(true);
  };

  const handleCommitInlineText = (newText: string) => {
    if (activeTextId) {
      handleUpdateTextLayer(activeTextId, { text: newText });
    }
    setIsEditingInlineText(false);
  };

  const handleCancelInlineText = () => {
    setIsEditingInlineText(false);
  };

  // Compute unsaved changes status
  const isDirty =
    brightness !== (photo.editedState?.brightness || 0) ||
    contrast !== (photo.editedState?.contrast || 0) ||
    saturation !== (photo.editedState?.saturation || 0) ||
    warmth !== (photo.editedState?.warmth || 0) ||
    vignette !== (photo.editedState?.vignette || 0) ||
    filter !== (photo.editedState?.filter || "none") ||
    rotation !== (photo.editedState?.rotation || 0) ||
    flipH !== (photo.editedState?.flipH || false) ||
    textOverlays.length !== (photo.editedState?.textOverlays?.length || 0) ||
    stickerOverlays.length !== (photo.editedState?.stickerOverlays?.length || 0) ||
    urlHistory.length > 0;

  const handleAttemptClose = () => {
    if (showDiscardConfirmModal) {
      setShowDiscardConfirmModal(false);
      return;
    }
    if (showSaveOptions) {
      setShowSaveOptions(false);
    }
    setShowDiscardConfirmModal(true);
  };

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      // 1. If inline text editing modal is open, commit/dismiss it
      if (isEditingInlineText) {
        setIsEditingInlineText(false);
        return true;
      }
      // 2. If discard confirm modal is open, close it
      if (showDiscardConfirmModal) {
        setShowDiscardConfirmModal(false);
        return true;
      }
      // 3. If save options dialog is open, close it
      if (showSaveOptions) {
        setShowSaveOptions(false);
        return true;
      }
      // 4. If a text layer is selected, deselect it
      if (activeTool === "text" && activeTextId) {
        setActiveTextId(null);
        return true;
      }
      // 5. If a tool sub-panel is open, return to main tools dock
      if (activeTool !== null && activeTool !== "none") {
        setActiveTool("none");
        return true;
      }
      // 6. Confirm exit from editor
      setShowDiscardConfirmModal(true);
      return true;
    },
  }));

  // Interactive Crop state (% based)
  const [cropBox, setCropBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ x: 10, y: 10, width: 80, height: 80 });
  const [selectedCropRatio, setSelectedCropRatio] = useState<string>("free");
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [cropSuccessMsg, setCropSuccessMsg] = useState(false);

  // Crop Drag Ref
  const cropBoxRef = useRef(cropBox);
  cropBoxRef.current = cropBox;

  const cropDragRef = useRef<{
    isDragging: boolean;
    handle: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "move" | null;
    startX: number;
    startY: number;
    initialBox: { x: number; y: number; width: number; height: number };
  }>({
    isDragging: false,
    handle: null,
    startX: 0,
    startY: 0,
    initialBox: { x: 10, y: 10, width: 80, height: 80 },
  });

  const selectedCropRatioRef = useRef(selectedCropRatio);
  selectedCropRatioRef.current = selectedCropRatio;

  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Comprehensive Filter presets
  const filtersList = [
    { id: "none", label: "Original" },
    { id: "vivid", label: "Samsung Vivid" },
    { id: "amber", label: "Apple Warm" },
    { id: "mono", label: "B&W Mono" },
    { id: "dramatic", label: "Dramatic" },
    { id: "cyberpunk", label: "Cyberpunk" },
    { id: "vintage", label: "Vintage Film" },
    { id: "noir", label: "Film Noir" },
    { id: "emerald", label: "Emerald Cool" },
    { id: "golden", label: "Golden Hour" },
    { id: "soft", label: "Soft Portrait" },
    { id: "cinematic", label: "Cinematic Teal" },
    { id: "retro", label: "Retro 70s" },
    { id: "sepia", label: "Warm Sepia" },
    { id: "cold", label: "Cold Winter" },
    { id: "pastel", label: "Soft Pastel" },
  ];

  const applyPresetFilter = (filterId: string) => {
    setFilter(filterId);
    if (filterId === "vivid") {
      setBrightness(10);
      setContrast(22);
      setSaturation(35);
      setWarmth(5);
      setVignette(0);
    } else if (filterId === "amber") {
      setWarmth(35);
      setBrightness(8);
      setContrast(12);
      setSaturation(10);
      setVignette(10);
    } else if (filterId === "mono") {
      setSaturation(-100);
      setContrast(25);
      setBrightness(0);
      setWarmth(0);
      setVignette(15);
    } else if (filterId === "dramatic") {
      setContrast(45);
      setBrightness(-10);
      setSaturation(15);
      setWarmth(-5);
      setVignette(35);
    } else if (filterId === "cyberpunk") {
      setSaturation(45);
      setWarmth(-40);
      setContrast(30);
      setBrightness(5);
      setVignette(25);
    } else if (filterId === "vintage") {
      setWarmth(25);
      setContrast(-10);
      setSaturation(-15);
      setVignette(25);
    } else if (filterId === "noir") {
      setSaturation(-100);
      setContrast(60);
      setBrightness(-15);
      setWarmth(0);
      setVignette(45);
    } else if (filterId === "emerald") {
      setWarmth(-35);
      setSaturation(20);
      setContrast(15);
      setBrightness(5);
      setVignette(10);
    } else if (filterId === "golden") {
      setWarmth(45);
      setBrightness(15);
      setSaturation(25);
      setContrast(10);
      setVignette(15);
    } else if (filterId === "soft") {
      setContrast(-15);
      setBrightness(15);
      setSaturation(10);
      setWarmth(15);
      setVignette(5);
    } else if (filterId === "cinematic") {
      setWarmth(-25);
      setSaturation(30);
      setContrast(30);
      setBrightness(0);
      setVignette(25);
    } else if (filterId === "retro") {
      setWarmth(30);
      setSaturation(-20);
      setContrast(-5);
      setVignette(20);
    } else if (filterId === "sepia") {
      setWarmth(60);
      setSaturation(-50);
      setContrast(10);
      setBrightness(5);
      setVignette(20);
    } else if (filterId === "cold") {
      setWarmth(-50);
      setBrightness(10);
      setSaturation(10);
      setContrast(15);
      setVignette(10);
    } else if (filterId === "pastel") {
      setBrightness(20);
      setContrast(-20);
      setSaturation(-15);
      setWarmth(10);
      setVignette(0);
    } else {
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setWarmth(0);
      setVignette(0);
    }
  };

  // Compute CSS filter string for live preview
  const getCssFilter = () => {
    let css = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;
    if (warmth > 0) css += ` sepia(${warmth * 0.4}%)`;
    if (warmth < 0) css += ` hue-rotate(${warmth}deg)`;
    return css;
  };

  // Crop Ratios
  const cropRatiosList = [
    { id: "free", label: "Free Crop", ratio: null },
    { id: "original", label: "Original", ratio: null },
    { id: "1:1", label: "1:1 Square", ratio: 1 },
    { id: "4:3", label: "4:3 Standard", ratio: 4 / 3 },
    { id: "3:4", label: "3:4 Portrait", ratio: 3 / 4 },
    { id: "16:9", label: "16:9 Wide", ratio: 16 / 9 },
    { id: "9:16", label: "9:16 Story", ratio: 9 / 16 },
    { id: "3:2", label: "3:2 Classic", ratio: 3 / 2 },
    { id: "5:4", label: "5:4 Print", ratio: 5 / 4 },
    { id: "2:1", label: "2:1 Panorama", ratio: 2 / 1 },
  ];

  const applyCropRatioPreset = (ratioId: string) => {
    haptics.selection();
    setSelectedCropRatio(ratioId);
    const item = cropRatiosList.find((r) => r.id === ratioId);

    if (!item || !item.ratio) {
      // Free or original -> center 80%
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
      return;
    }

    const targetRatio = item.ratio;
    // Calculate aspect ratio relative to image container
    let imgW = 800;
    let imgH = 600;
    if (imageElementRef.current) {
      imgW = imageElementRef.current.clientWidth || 800;
      imgH = imageElementRef.current.clientHeight || 600;
    }

    const currentImgRatio = imgW / imgH;

    let newWPct = 80;
    let newHPct = 80;

    if (targetRatio > currentImgRatio) {
      // Wider aspect ratio
      newWPct = 90;
      newHPct = (90 * currentImgRatio) / targetRatio;
    } else {
      // Taller aspect ratio
      newHPct = 90;
      newWPct = (90 * targetRatio) / currentImgRatio;
    }

    newWPct = Math.min(95, Math.max(10, newWPct));
    newHPct = Math.min(95, Math.max(10, newHPct));

    const newX = (100 - newWPct) / 2;
    const newY = (100 - newHPct) / 2;

    setCropBox({ x: newX, y: newY, width: newWPct, height: newHPct });
  };

  // Mouse / Touch / Pointer handlers for Crop Box Handles
  const handleCropPointerDown = (
    e: React.PointerEvent,
    handle: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "move"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    cropDragRef.current = {
      isDragging: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...cropBoxRef.current },
    };
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!cropDragRef.current.isDragging || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const deltaXPct = ((e.clientX - cropDragRef.current.startX) / rect.width) * 100;
    const deltaYPct = ((e.clientY - cropDragRef.current.startY) / rect.height) * 100;

    const { initialBox, handle } = cropDragRef.current;

    let newX = initialBox.x;
    let newY = initialBox.y;
    let newW = initialBox.width;
    let newH = initialBox.height;

    const containerRatio = rect.width / rect.height;
    const activeRatioItem = cropRatiosList.find((r) => r.id === selectedCropRatioRef.current);
    const targetRatio = activeRatioItem?.ratio || null;

    if (handle === "move") {
      newX = Math.max(0, Math.min(100 - newW, initialBox.x + deltaXPct));
      newY = Math.max(0, Math.min(100 - newH, initialBox.y + deltaYPct));
    } else if (handle === "se") {
      newW = Math.max(10, Math.min(100 - initialBox.x, initialBox.width + deltaXPct));
      if (targetRatio) {
        newH = newW / (targetRatio / containerRatio);
        if (initialBox.y + newH > 100) {
          newH = 100 - initialBox.y;
          newW = newH * (targetRatio / containerRatio);
        }
      } else {
        newH = Math.max(10, Math.min(100 - initialBox.y, initialBox.height + deltaYPct));
      }
    } else if (handle === "sw") {
      const rightEdge = initialBox.x + initialBox.width;
      newX = Math.max(0, Math.min(rightEdge - 10, initialBox.x + deltaXPct));
      newW = rightEdge - newX;
      if (targetRatio) {
        newH = newW / (targetRatio / containerRatio);
        if (initialBox.y + newH > 100) {
          newH = 100 - initialBox.y;
          newW = newH * (targetRatio / containerRatio);
          newX = rightEdge - newW;
        }
      } else {
        newH = Math.max(10, Math.min(100 - initialBox.y, initialBox.height + deltaYPct));
      }
    } else if (handle === "ne") {
      const bottomEdge = initialBox.y + initialBox.height;
      newW = Math.max(10, Math.min(100 - initialBox.x, initialBox.width + deltaXPct));
      if (targetRatio) {
        newH = newW / (targetRatio / containerRatio);
        newY = Math.max(0, bottomEdge - newH);
        if (newY === 0) {
          newH = bottomEdge;
          newW = newH * (targetRatio / containerRatio);
        }
      } else {
        newY = Math.max(0, Math.min(bottomEdge - 10, initialBox.y + deltaYPct));
        newH = bottomEdge - newY;
      }
    } else if (handle === "nw") {
      const rightEdge = initialBox.x + initialBox.width;
      const bottomEdge = initialBox.y + initialBox.height;
      newX = Math.max(0, Math.min(rightEdge - 10, initialBox.x + deltaXPct));
      newW = rightEdge - newX;
      if (targetRatio) {
        newH = newW / (targetRatio / containerRatio);
        newY = Math.max(0, bottomEdge - newH);
        if (newY === 0) {
          newH = bottomEdge;
          newW = newH * (targetRatio / containerRatio);
          newX = rightEdge - newW;
        }
      } else {
        newY = Math.max(0, Math.min(bottomEdge - 10, initialBox.y + deltaYPct));
        newH = bottomEdge - newY;
      }
    } else if (handle === "e") {
      newW = Math.max(10, Math.min(100 - initialBox.x, initialBox.width + deltaXPct));
      if (targetRatio) {
        newH = newW / (targetRatio / containerRatio);
      }
    } else if (handle === "w") {
      const rightEdge = initialBox.x + initialBox.width;
      newX = Math.max(0, Math.min(rightEdge - 10, initialBox.x + deltaXPct));
      newW = rightEdge - newX;
      if (targetRatio) {
        newH = newW / (targetRatio / containerRatio);
      }
    } else if (handle === "s") {
      newH = Math.max(10, Math.min(100 - initialBox.y, initialBox.height + deltaYPct));
      if (targetRatio) {
        newW = newH * (targetRatio / containerRatio);
      }
    } else if (handle === "n") {
      const bottomEdge = initialBox.y + initialBox.height;
      newY = Math.max(0, Math.min(bottomEdge - 10, initialBox.y + deltaYPct));
      newH = bottomEdge - newY;
      if (targetRatio) {
        newW = newH * (targetRatio / containerRatio);
      }
    }

    setCropBox({ x: newX, y: newY, width: newW, height: newH });
  };

  const handleCropPointerUp = (e: React.PointerEvent) => {
    if (cropDragRef.current.isDragging) {
      cropDragRef.current.isDragging = false;
      cropDragRef.current.handle = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Execute actual Crop on Canvas
  const performCanvasCrop = () => {
    setIsApplyingCrop(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentPhotoUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const srcW = img.naturalWidth || 1000;
      const srcH = img.naturalHeight || 800;

      const cropXPx = (cropBox.x / 100) * srcW;
      const cropYPx = (cropBox.y / 100) * srcH;
      const cropWPx = (cropBox.width / 100) * srcW;
      const cropHPx = (cropBox.height / 100) * srcH;

      canvas.width = Math.max(1, Math.round(cropWPx));
      canvas.height = Math.max(1, Math.round(cropHPx));

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsApplyingCrop(false);
        return;
      }

      ctx.drawImage(
        img,
        cropXPx,
        cropYPx,
        cropWPx,
        cropHPx,
        0,
        0,
        canvas.width,
        canvas.height
      );

      setUrlHistory((prev) => [...prev, currentPhotoUrl]);
      const croppedUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCurrentPhotoUrl(croppedUrl);
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
      setIsApplyingCrop(false);

      setCropSuccessMsg(true);
      setTimeout(() => setCropSuccessMsg(false), 2500);
    };

    img.onerror = () => {
      setIsApplyingCrop(false);
    };
  };

  // Content-Aware Intelligent Patch Inpainting Engine
  const handleApplyIntelligentErase = async () => {
    if (eraserStrokes.length === 0 || isErasingWithAI) return;
    setIsErasingWithAI(true);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = currentPhotoUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load photo for inpainting"));
      });

      const width = img.naturalWidth || 1000;
      const height = img.naturalHeight || 800;

      // Render the strokes into an accurate binary mask canvas
      const maskCanvas = createMaskCanvas(width, height, eraserStrokes);

      // Perform intelligent patch synthesis inpainting
      const inpaintedDataUrl = await performIntelligentInpainting(img, maskCanvas);

      setUrlHistory((prev) => [...prev, currentPhotoUrl]);
      setCurrentPhotoUrl(inpaintedDataUrl);
      setEraserStrokes([]);
      setEraseSuccessMsg(true);
      setTimeout(() => setEraseSuccessMsg(false), 2500);
      haptics.notification("success");
    } catch (err) {
      console.error("Intelligent inpainting error:", err);
    } finally {
      setIsErasingWithAI(false);
    }
  };

  const handleUndo = () => {
    if (urlHistory.length === 0) return;
    const previousUrl = urlHistory[urlHistory.length - 1];
    setUrlHistory((prev) => prev.slice(0, -1));
    setCurrentPhotoUrl(previousUrl);
  };

  // Final Save: Bake all filters, adjustments, rotation, stickers, and text layers permanently into high-res Canvas
  const handleSave = async (isCopy = false) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentPhotoUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load current photo"));
      });

      const canvas = document.createElement("canvas");
      const isRotated90 = rotation % 180 !== 0;

      const rawW = img.naturalWidth || 1000;
      const rawH = img.naturalHeight || 800;

      canvas.width = isRotated90 ? rawH : rawW;
      canvas.height = isRotated90 ? rawW : rawH;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finishAndSavePhoto(currentPhotoUrl, isCopy);
        return;
      }

      ctx.save();

      // Apply CSS Filters directly to Canvas context
      ctx.filter = getCssFilter();

      // Apply Rotation and Flip
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, 1);

      ctx.drawImage(img, -rawW / 2, -rawH / 2, rawW, rawH);
      ctx.restore();

      // Vignette effect on canvas if vignette > 0
      if (vignette > 0) {
        const grad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          Math.min(canvas.width, canvas.height) * 0.3,
          canvas.width / 2,
          canvas.height / 2,
          Math.max(canvas.width, canvas.height) * 0.75
        );
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${Math.min(1, vignette / 50)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Render sticker overlays onto high-res Canvas (sorted by zIndex)
      const sortedStickers = [...stickerOverlays].sort(
        (a, b) => (a.zIndex || 30) - (b.zIndex || 30)
      );

      const loadedStickerAssets = await Promise.all(
        sortedStickers.map(async (overlay) => {
          let srcUrl = overlay.imageUrl;
          if (!srcUrl && overlay.svgContent) {
            srcUrl = getStickerSvgDataUrl(overlay.svgContent);
          }

          if (srcUrl) {
            try {
              const stickerImg = new Image();
              stickerImg.crossOrigin = "anonymous";
              stickerImg.src = srcUrl;
              await new Promise<void>((res) => {
                stickerImg.onload = () => res();
                stickerImg.onerror = () => res();
              });
              return { overlay, img: stickerImg, isEmoji: false };
            } catch {
              return { overlay, img: null, isEmoji: false };
            }
          }
          return { overlay, img: null, isEmoji: Boolean(overlay.sticker) };
        })
      );

      loadedStickerAssets.forEach(({ overlay, img: stImg, isEmoji }) => {
        ctx.save();
        const xPx = overlay.xNormalized * canvas.width;
        const yPx = overlay.yNormalized * canvas.height;
        ctx.translate(xPx, yPx);
        ctx.rotate((overlay.rotation * Math.PI) / 180);
        ctx.scale(overlay.flipH ? -1 : 1, overlay.flipV ? -1 : 1);

        // Blend Mode & Opacity
        ctx.globalCompositeOperation = getCanvasCompositeOperation(overlay.blendMode);
        ctx.globalAlpha = overlay.opacity ?? 1;

        const baseSize = canvas.width * 0.16 * (overlay.scale || 1);

        if (stImg && stImg.naturalWidth) {
          const aspect = stImg.naturalWidth / stImg.naturalHeight;
          const drawW = baseSize;
          const drawH = baseSize / aspect;
          ctx.drawImage(stImg, -drawW / 2, -drawH / 2, drawW, drawH);
        } else if (isEmoji && overlay.sticker) {
          ctx.font = `${baseSize * 0.8}px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(overlay.sticker, 0, 0);
        }
        ctx.restore();
      });

      // Render text overlays onto high-res Canvas
      textOverlays.forEach((overlay) => {
        ctx.save();
        const xPx = overlay.xNormalized * canvas.width;
        const yPx = overlay.yNormalized * canvas.height;
        ctx.translate(xPx, yPx);
        ctx.rotate((overlay.rotation * Math.PI) / 180);

        // Blend Mode & Opacity
        ctx.globalCompositeOperation = getCanvasCompositeOperation(overlay.blendMode);
        ctx.globalAlpha = overlay.opacity ?? 1;

        // Compute high-res base font size
        const baseFontSize = (canvas.width * 0.05) * (overlay.scale || 1);
        const fontOpt = getFontOption(overlay.fontFamily);
        const fontWeight = overlay.bold ? "800" : (fontOpt.id === "bold" ? "700" : "600");
        const fontStyle = overlay.italic || fontOpt.id === "handwritten" ? "italic" : "normal";

        ctx.font = `${fontStyle} ${fontWeight} ${baseFontSize}px ${fontOpt.canvasFontName}`;
        ctx.textAlign = overlay.alignment || "center";
        ctx.textBaseline = "middle";

        const metrics = ctx.measureText(overlay.text);
        const textWidth = metrics.width || baseFontSize * 3;
        const textHeight = baseFontSize * 1.35;

        const bgStyle = overlay.bgStyle || (overlay.style === "background" ? "rounded" : "none");
        const hasBg = bgStyle !== "none" || overlay.style === "background";

        if (hasBg) {
          const pad = baseFontSize * 0.45;
          const bgW = textWidth + pad * 2;
          const bgH = textHeight + pad;
          let bgX = -bgW / 2;
          if (overlay.alignment === "left") bgX = -pad;
          if (overlay.alignment === "right") bgX = -textWidth - pad;
          const bgY = -bgH / 2;

          ctx.fillStyle = overlay.bgColor || "rgba(0,0,0,0.75)";
          const radius = bgStyle === "pill" ? bgH / 2 : (bgStyle === "rounded" ? Math.min(16, bgH * 0.25) : 0);
          if (radius > 0 && typeof (ctx as any).roundRect === "function") {
            ctx.beginPath();
            (ctx as any).roundRect(bgX, bgY, bgW, bgH, radius);
            ctx.fill();
          } else {
            ctx.fillRect(bgX, bgY, bgW, bgH);
          }
        }

        // Text Shadow
        if (overlay.shadow || overlay.style === "shadow") {
          ctx.shadowColor = overlay.shadowColor || "rgba(0,0,0,0.85)";
          ctx.shadowBlur = (overlay.shadowBlur ?? 8) * (canvas.width / 800);
          ctx.shadowOffsetX = (overlay.shadowOffsetX ?? 2) * (canvas.width / 800);
          ctx.shadowOffsetY = (overlay.shadowOffsetY ?? 2) * (canvas.width / 800);
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Stroke / Outline
        if (overlay.stroke || overlay.style === "outline") {
          ctx.strokeStyle = overlay.strokeColor || "#000000";
          ctx.lineWidth = (overlay.strokeWidth ?? 2.5) * (canvas.width / 800);
          ctx.strokeText(overlay.text, 0, 0);
        }

        // Fill Style (Solid Color vs Linear Gradient)
        if (overlay.fillType === "gradient" && overlay.gradient && overlay.gradient.colors?.length > 1) {
          const angleDeg = overlay.gradient.angle ?? 90;
          const rad = ((angleDeg - 90) * Math.PI) / 180;
          const halfW = textWidth / 2;
          const halfH = textHeight / 2;
          const diag = Math.sqrt(halfW * halfW + halfH * halfH);

          const x0 = -Math.cos(rad) * diag;
          const y0 = -Math.sin(rad) * diag;
          const x1 = Math.cos(rad) * diag;
          const y1 = Math.sin(rad) * diag;

          const canvasGrad = ctx.createLinearGradient(x0, y0, x1, y1);
          const colors = overlay.gradient.colors;
          colors.forEach((col, idx) => {
            const stop = idx / (colors.length - 1);
            canvasGrad.addColorStop(stop, col);
          });

          ctx.fillStyle = canvasGrad;
        } else {
          ctx.fillStyle = overlay.color || "#ffffff";
        }

        ctx.fillText(overlay.text, 0, 0);
        ctx.restore();
      });

      const finalBakedUrl = canvas.toDataURL("image/jpeg", 0.95);
      finishAndSavePhoto(finalBakedUrl, isCopy);
    } catch (err) {
      console.error("Save error:", err);
      finishAndSavePhoto(currentPhotoUrl, isCopy);
    }
  };

  const finishAndSavePhoto = (finalUrl: string, isCopy = false) => {
    const updatedEditState: PhotoEditState = {
      brightness,
      contrast,
      saturation,
      warmth,
      vignette,
      blur: 0,
      filter: filter as any,
      rotation,
      flipH,
      cropRatio: selectedCropRatio as any,
      textOverlays,
    };

    const updatedTitle = getEditedMediaTitle(photo.title);

    const updatedPhoto: Photo = {
      ...photo,
      id: isCopy ? `photo-e-${Date.now()}` : photo.id,
      title: updatedTitle,
      url: finalUrl,
      highResUrl: finalUrl,
      editedState: updatedEditState,
      date: photo.date, // Preserve original date so it stays in place in timeline
    };

    // Push pre-save image into history so user can Undo if desired!
    setUrlHistory((prev) => [...prev, currentPhotoUrl]);
    setCurrentPhotoUrl(finalUrl);

    // Reset temporary sliders since changes are baked into finalUrl
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
    setVignette(0);
    setFilter("none");
    setRotation(0);
    setFlipH(false);
    setEraserStrokes([]);
    setTextOverlays([]);
    setStickerOverlays([]);

    haptics.success();
    setSaveNotice(isCopy ? "Saved as new copy!" : "Saved photo changes!");
    setTimeout(() => setSaveNotice(null), 3000);

    onSave(updatedPhoto, isCopy);
  };

  return (
    <div className="fixed inset-0 z-[105] bg-slate-950 flex flex-col justify-between overflow-hidden animate-fade-in select-none">
      {/* Top Header */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleAttemptClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
            title="Close Editor"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-400" />
              <span>Photo Editor</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {urlHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all border border-slate-700/60"
              title="Undo Previous Action"
              aria-label="Undo Previous Action"
            >
              <Undo className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              haptics.light();
              setActiveTool((curr) => (curr === null ? "none" : curr === "none" ? null : "none"));
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
              activeTool !== null
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm"
                : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700/60"
            }`}
            title="Toggle Editing Tools"
            aria-label="Toggle Editing Tools"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setBrightness(0);
              setContrast(0);
              setSaturation(0);
              setWarmth(0);
              setVignette(0);
              setFilter("none");
              setRotation(0);
              setFlipH(false);
              setEraserStrokes([]);
              setCurrentPhotoUrl(photo.highResUrl || photo.url);
              setUrlHistory([]);
              setCropBox({ x: 10, y: 10, width: 80, height: 80 });
              setTextOverlays([]);
              setActiveTextId(null);
              setStickerOverlays([]);
              setActiveStickerId(null);
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all border border-slate-700/60"
            title="Revert All Edits"
            aria-label="Revert All Edits"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSaveOptions(!showSaveOptions)}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md shadow-indigo-600/30 border border-indigo-400/40 transition-all"
              title="Save Photo Options"
              aria-label="Save Photo Options"
            >
              <Save className="w-4 h-4" />
            </button>

            {showSaveOptions && (
              <div className="absolute right-0 top-11 w-48 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 space-y-1 animate-fade-in">
                <button
                  onClick={() => {
                    setShowSaveOptions(false);
                    handleSave(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save Overwrite</span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowSaveOptions(false);
                    handleSave(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-semibold text-indigo-300 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Save as Copy</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Preview Stage */}
      <div className="flex-1 relative bg-black flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Instruction Badge when AI Eraser active */}
        {(activeTool === "eraser" || (activeTool === "adjust" && selectedAdjustment === "eraser")) && (
          <div className="absolute top-4 z-20 px-4 py-2 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md animate-fade-in">
            <Wand2 className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span>
              {eraserStrokes.length > 0
                ? `${eraserStrokes.length} stroke(s) painted. Tap "Erase Selection" to remove.`
                : "Paint over any object or blemish to remove it."}
            </span>
          </div>
        )}

        {/* Instruction Badge when Crop active */}
        {activeTool === "crop" && (
          <div className="absolute top-4 z-20 px-4 py-2 rounded-2xl bg-slate-900/90 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md animate-fade-in">
            <Crop className="w-4 h-4 text-indigo-400" />
            <span>Drag crop handles or box, choose aspect ratio, then click "Apply Crop".</span>
          </div>
        )}

        {/* Toast Banners */}
        {saveNotice && (
          <div className="absolute top-4 sm:top-6 z-40 px-4 py-2.5 rounded-full bg-slate-900/95 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveNotice}</span>
          </div>
        )}

        {eraseSuccessMsg && (
          <div className="absolute top-16 z-30 px-4 py-2 rounded-2xl bg-emerald-500/90 text-white text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>Object removed with AI Inpainting!</span>
          </div>
        )}

        {cropSuccessMsg && (
          <div className="absolute top-16 z-30 px-4 py-2 rounded-2xl bg-indigo-600/90 text-white text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-bounce">
            <Scissors className="w-4 h-4" />
            <span>Image Cropped successfully!</span>
          </div>
        )}

        <div
          ref={imageContainerRef}
          onClick={() => {
            if (activeTextId) setActiveTextId(null);
            if (activeStickerId) setActiveStickerId(null);
          }}
          className={`relative max-h-full max-w-full transition-transform duration-300 flex items-center justify-center ${
            activeTool === "adjust" && selectedAdjustment === "eraser" ? "cursor-crosshair" : ""
          }`}
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
          }}
        >
          <img
            ref={imageElementRef}
            src={currentPhotoUrl}
            alt="Editing"
            className="max-h-[62vh] max-w-full object-contain rounded-none shadow-2xl pointer-events-none"
            style={{
              filter: getCssFilter(),
            }}
          />

          {/* Live Vignette Effect Overlay */}
          {vignette > 0 && (
            <div
              className="absolute inset-0 rounded-none pointer-events-none transition-opacity duration-150 z-10 overflow-hidden"
              style={{
                background: `radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, ${Math.min(1, vignette / 50)}))`,
              }}
            />
          )}

          {/* Interactive Crop Box Overlay */}
          {activeTool === "crop" && (
            <div className="absolute inset-0 pointer-events-auto">
              {/* Darkened Outer Mask Area */}
              <div
                className="absolute inset-0 bg-black/60 pointer-events-none"
                style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                    ${cropBox.x}% ${cropBox.y}%,
                    ${cropBox.x}% ${cropBox.y + cropBox.height}%,
                    ${cropBox.x + cropBox.width}% ${cropBox.y + cropBox.height}%,
                    ${cropBox.x + cropBox.width}% ${cropBox.y}%,
                    ${cropBox.x}% ${cropBox.y}%
                  )`,
                }}
              />

              {/* Crop Box Rectangle */}
              <div
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`,
                }}
                onPointerDown={(e) => handleCropPointerDown(e, "move")}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
                className="absolute border-2 border-indigo-400 bg-indigo-500/10 cursor-move shadow-2xl touch-none"
              >
                {/* Rule of Thirds Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-indigo-300/30" />
                  <div className="border-r border-b border-indigo-300/30" />
                  <div className="border-b border-indigo-300/30" />
                  <div className="border-r border-b border-indigo-300/30" />
                  <div className="border-r border-b border-indigo-300/30" />
                  <div className="border-b border-indigo-300/30" />
                  <div className="border-r border-indigo-300/30" />
                  <div className="border-r border-indigo-300/30" />
                  <div className="" />
                </div>

                {/* L-Shaped Corner Brackets & Edge Handles with 44px Touch Targets */}
                <div
                  onPointerDown={(e) => handleCropPointerDown(e, "nw")}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                  className="absolute -top-5 -left-5 w-11 h-11 flex items-center justify-center z-30 cursor-nwse-resize group touch-none"
                >
                  <div className="w-5 h-5 border-t-[3.5px] border-l-[3.5px] border-white shadow-md group-hover:scale-125 transition-transform" />
                </div>
                <div
                  onPointerDown={(e) => handleCropPointerDown(e, "ne")}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                  className="absolute -top-5 -right-5 w-11 h-11 flex items-center justify-center z-30 cursor-nesw-resize group touch-none"
                >
                  <div className="w-5 h-5 border-t-[3.5px] border-r-[3.5px] border-white shadow-md group-hover:scale-125 transition-transform" />
                </div>
                <div
                  onPointerDown={(e) => handleCropPointerDown(e, "sw")}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                  className="absolute -bottom-5 -left-5 w-11 h-11 flex items-center justify-center z-30 cursor-nesw-resize group touch-none"
                >
                  <div className="w-5 h-5 border-b-[3.5px] border-l-[3.5px] border-white shadow-md group-hover:scale-125 transition-transform" />
                </div>
                <div
                  onPointerDown={(e) => handleCropPointerDown(e, "se")}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                  className="absolute -bottom-5 -right-5 w-11 h-11 flex items-center justify-center z-30 cursor-nwse-resize group touch-none"
                >
                  <div className="w-5 h-5 border-b-[3.5px] border-r-[3.5px] border-white shadow-md group-hover:scale-125 transition-transform" />
                </div>

                {/* Edge Midpoint Bar Handles with 44px Touch Targets */}
                <div
                  onPointerDown={(e) => handleCropPointerDown(e, "n")}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                  className="absolute -top-5 left-1/2 -translate-x-1/2 w-16 h-10 flex items-center justify-center z-30 cursor-ns-resize group touch-none"
                >
                  <div className="w-8 h-1.5 bg-white rounded-full shadow-md group-hover:scale-125 transition-transform" />
                </div>
                <div
                  onPointerDown={(e) => handleCropPointerDown(e, "s")}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-16 h-10 flex items-center justify-center z-30 cursor-ns-resize group touch-none"
                >
                  <div className="w-8 h-1.5 bg-white rounded-full shadow-md group-hover:scale-125 transition-transform" />
                </div>
                <div
                  onPointerDown={(e) => handleCropPointerDown(e, "w")}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                  className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-16 flex items-center justify-center z-30 cursor-ew-resize group touch-none"
                >
                  <div className="w-1.5 h-8 bg-white rounded-full shadow-md group-hover:scale-125 transition-transform" />
                </div>
                <div
                  onPointerDown={(e) => handleCropPointerDown(e, "e")}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                  className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-16 flex items-center justify-center z-30 cursor-ew-resize group touch-none"
                >
                  <div className="w-1.5 h-8 bg-white rounded-full shadow-md group-hover:scale-125 transition-transform" />
                </div>
              </div>
            </div>
          )}

          {/* Snap Alignment Guides */}
          {snapGuide && activeTool === "text" && (
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {snapGuide.x !== undefined && (
                <div
                  className="absolute top-0 bottom-0 border-l border-dashed border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                  style={{ left: `${snapGuide.x}%` }}
                />
              )}
              {snapGuide.y !== undefined && (
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                  style={{ top: `${snapGuide.y}%` }}
                />
              )}
            </div>
          )}

          {/* Interactive Text Overlays on Stage */}
          {textOverlays.map((overlay) => (
            <TextCanvasLayer
              key={overlay.id}
              overlay={overlay}
              isSelected={activeTextId === overlay.id}
              isEditingInline={isEditingInlineText && activeTextId === overlay.id}
              containerRef={imageContainerRef}
              onSelect={(id) => {
                setActiveTextId(id);
                if (activeTool !== "text") setActiveTool("text");
              }}
              onUpdate={handleUpdateTextLayer}
              onDelete={handleDeleteTextLayer}
              onDuplicate={handleDuplicateTextLayer}
              onStartInlineEdit={handleStartInlineEdit}
              onSnapChange={setSnapGuide}
            />
          ))}

          {/* Interactive Sticker Layers on Stage */}
          {stickerOverlays.map((stickerItem) => (
            <StickerCanvasLayer
              key={stickerItem.id}
              overlay={stickerItem}
              isSelected={activeStickerId === stickerItem.id}
              containerRef={imageContainerRef}
              onSelect={(id) => {
                setActiveStickerId(id);
                if (activeTool !== "stickers") setActiveTool("stickers");
              }}
              onUpdate={handleUpdateStickerLayer}
              onDelete={handleDeleteStickerLayer}
              onDuplicate={handleDuplicateStickerLayer}
              onBringForward={handleBringStickerForward}
              onSendBackward={handleSendStickerBackward}
            />
          ))}

          {/* Eraser Inpainting Interactive Mask Canvas Layer */}
          {(activeTool === "eraser" || (activeTool === "adjust" && selectedAdjustment === "eraser")) && (
            <EraserCanvasOverlay
              containerRef={imageContainerRef}
              strokes={eraserStrokes}
              onStrokesChange={setEraserStrokes}
              mode={eraserMode}
              brushSize={eraserBrushSize}
              brushSoftness={eraserBrushSoftness}
              isActive={activeTool === "eraser" || (activeTool === "adjust" && selectedAdjustment === "eraser")}
              rotation={rotation}
              flipH={flipH}
            />
          )}
        </div>
      </div>

      {/* Bottom Floating Area for Editing Dock & Contextual Tool Interfaces */}
      <div className="bg-slate-900/95 border-t border-slate-800/90 p-3 sm:p-4 shadow-2xl z-20 min-h-[130px] flex flex-col justify-center backdrop-blur-md">
        <AnimatePresence mode="wait">
          {activeTool === "none" && (
            <div key="dock-panel" className="w-full flex justify-center py-1">
              <EditingToolDock activeTool={activeTool} onSelectTool={setActiveTool} />
            </div>
          )}

          {activeTool !== "none" && activeTool !== null && (
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-w-3xl mx-auto w-full space-y-3"
            >
              {/* Tool Navigation Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <button
                  onClick={() => {
                    haptics.light();
                    setActiveTool("none");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700/60 transition-all active:scale-95"
                  title="Return to Editing Tools"
                  aria-label="Back to Editing Tools"
                >
                  <ChevronLeft className="w-4 h-4 text-indigo-400" />
                  <span>Tools</span>
                </button>

                <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                  {activeTool === "adjust" && "Adjustments"}
                  {activeTool === "crop" && "Crop & Aspect"}
                  {activeTool === "filter" && "Filters"}
                  {activeTool === "text" && "Text Overlay"}
                  {activeTool === "stickers" && "Stickers & Graphics"}
                  {activeTool === "eraser" && "Object Eraser"}
                </span>

                <div className="w-16" /> {/* Spacer to balance layout */}
              </div>

              {/* OBJECT ERASER DEDICATED TOOL */}
              {activeTool === "eraser" && (
                <EraserControls
                  mode={eraserMode}
                  onModeChange={setEraserMode}
                  brushSize={eraserBrushSize}
                  onBrushSizeChange={setEraserBrushSize}
                  brushSoftness={eraserBrushSoftness}
                  onBrushSoftnessChange={setEraserBrushSoftness}
                  strokes={eraserStrokes}
                  onUndoStroke={() => setEraserStrokes((prev) => prev.slice(0, -1))}
                  onClearStrokes={() => setEraserStrokes([])}
                  onApplyErase={handleApplyIntelligentErase}
                  isProcessing={isErasingWithAI}
                  canUndoImage={urlHistory.length > 0}
                  onUndoImage={handleUndo}
                />
              )}

              {/* ADJUSTMENTS INTERFACE */}
              {activeTool === "adjust" && (
                <div className="space-y-3 pt-1">
                  {/* Parameter Pills Row */}
                  <div className="w-full max-w-xl mx-auto overflow-x-auto touch-pan-x scrollbar-none py-1 px-2">
                    <div className="flex items-center gap-2 min-w-max justify-start sm:justify-center mx-auto">
                      {[
                        { id: "brightness", label: "Brightness", val: brightness },
                        { id: "contrast", label: "Contrast", val: contrast },
                        { id: "saturation", label: "Saturation", val: saturation },
                        { id: "warmth", label: "Temperature", val: warmth },
                        { id: "vignette", label: "Vignette", val: vignette },
                        { id: "eraser", label: "Object Eraser", val: eraserStrokes.length },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            haptics.selection();
                            setSelectedAdjustment(p.id as any);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
                            selectedAdjustment === p.id
                              ? "bg-indigo-600 text-white border-indigo-400 shadow-md scale-105"
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <span>{p.label}</span>
                          {p.val !== 0 && (
                            <span className="ml-1 text-[10px] font-mono opacity-80">
                              ({p.val > 0 ? `+${p.val}` : p.val})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Single Selected Parameter Focus Slider / Eraser Controls */}
                  {selectedAdjustment !== "eraser" ? (
                    <div className="max-w-md mx-auto bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span className="capitalize">{selectedAdjustment}</span>
                        <span className="font-mono text-indigo-400">
                          {selectedAdjustment === "brightness" && (brightness > 0 ? `+${brightness}` : brightness)}
                          {selectedAdjustment === "contrast" && (contrast > 0 ? `+${contrast}` : contrast)}
                          {selectedAdjustment === "saturation" && (saturation > 0 ? `+${saturation}` : saturation)}
                          {selectedAdjustment === "warmth" && (warmth > 0 ? `+${warmth}` : warmth)}
                          {selectedAdjustment === "vignette" && vignette}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={selectedAdjustment === "vignette" ? 0 : -50}
                        max={50}
                        value={
                          selectedAdjustment === "brightness"
                            ? brightness
                            : selectedAdjustment === "contrast"
                            ? contrast
                            : selectedAdjustment === "saturation"
                            ? saturation
                            : selectedAdjustment === "warmth"
                            ? warmth
                            : vignette
                        }
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (selectedAdjustment === "brightness") setBrightness(val);
                          else if (selectedAdjustment === "contrast") setContrast(val);
                          else if (selectedAdjustment === "saturation") setSaturation(val);
                          else if (selectedAdjustment === "warmth") setWarmth(val);
                          else if (selectedAdjustment === "vignette") setVignette(val);
                        }}
                        className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                      />
                    </div>
                  ) : (
                    <EraserControls
                      mode={eraserMode}
                      onModeChange={setEraserMode}
                      brushSize={eraserBrushSize}
                      onBrushSizeChange={setEraserBrushSize}
                      brushSoftness={eraserBrushSoftness}
                      onBrushSoftnessChange={setEraserBrushSoftness}
                      strokes={eraserStrokes}
                      onUndoStroke={() => setEraserStrokes((prev) => prev.slice(0, -1))}
                      onClearStrokes={() => setEraserStrokes([])}
                      onApplyErase={handleApplyIntelligentErase}
                      isProcessing={isErasingWithAI}
                      canUndoImage={urlHistory.length > 0}
                      onUndoImage={handleUndo}
                    />
                  )}
                </div>
              )}

              {/* CROP INTERFACE */}
              {activeTool === "crop" && (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none w-full justify-start sm:justify-center">
                    {cropRatiosList.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => applyCropRatioPreset(r.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          selectedCropRatio === r.id
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      onClick={performCanvasCrop}
                      disabled={isApplyingCrop}
                      className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95"
                    >
                      <Scissors className="w-4 h-4" />
                      <span>{isApplyingCrop ? "Cropping Image..." : "Apply Crop"}</span>
                    </button>

                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Rotate 90°</span>
                    </button>

                    <button
                      onClick={() => setFlipH(!flipH)}
                      className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      <span>Flip Horizontal</span>
                    </button>
                  </div>
                </div>
              )}

              {/* FILTER INTERFACE */}
              {activeTool === "filter" && (
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none w-full">
                  {filtersList.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        haptics.selection();
                        applyPresetFilter(f.id);
                      }}
                      className={`flex-shrink-0 px-4 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        filter === f.id
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <span>{f.label}</span>
                      {filter === f.id && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              )}

              {/* TEXT INTERFACE */}
              {activeTool === "text" && (
                <TextEditorBottomBar
                  selectedOverlay={textOverlays.find((t) => t.id === activeTextId) || null}
                  allOverlays={textOverlays}
                  onAddText={handleAddText}
                  onUpdateSelected={(partial) => {
                    if (activeTextId) handleUpdateTextLayer(activeTextId, partial);
                  }}
                  onDeleteSelected={() => {
                    if (activeTextId) handleDeleteTextLayer(activeTextId);
                  }}
                  onDuplicateSelected={() => {
                    if (activeTextId) handleDuplicateTextLayer(activeTextId);
                  }}
                  onStartInlineEdit={() => {
                    if (activeTextId) handleStartInlineEdit(activeTextId);
                  }}
                  onSelectOverlay={(id) => setActiveTextId(id)}
                />
              )}

              {/* STICKERS INTERFACE */}
              {activeTool === "stickers" && (
                <StickerEditorBottomBar
                  selectedSticker={stickerOverlays.find((s) => s.id === activeStickerId) || null}
                  allStickers={stickerOverlays}
                  onAddSticker={handleAddStickerGraphic}
                  onAddGallerySticker={handleAddGallerySticker}
                  onUpdateSelected={(partial) => {
                    if (activeStickerId) handleUpdateStickerLayer(activeStickerId, partial);
                  }}
                  onDeleteSelected={() => {
                    if (activeStickerId) handleDeleteStickerLayer(activeStickerId);
                  }}
                  onDuplicateSelected={() => {
                    if (activeStickerId) handleDuplicateStickerLayer(activeStickerId);
                  }}
                  onBringForward={() => handleBringStickerForward(activeStickerId || undefined)}
                  onSendBackward={() => handleSendStickerBackward(activeStickerId || undefined)}
                  onBringToFront={handleBringStickerToFront}
                  onSendToBack={handleSendStickerToBack}
                  onSelectSticker={(id) => setActiveStickerId(id)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Inline Text Edit Overlay Modal */}
      <InlineTextEditModal
        isOpen={isEditingInlineText}
        initialText={textOverlays.find((t) => t.id === activeTextId)?.text || ""}
        onCommit={handleCommitInlineText}
        onCancel={handleCancelInlineText}
      />

      {/* Discard Changes Confirmation Modal */}
      {showDiscardConfirmModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Quit Editing?</h3>
                <p className="text-[11px] text-slate-400">Do you want to discard edits and exit, or keep editing?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDiscardConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all border border-slate-700/60"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowDiscardConfirmModal(false);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

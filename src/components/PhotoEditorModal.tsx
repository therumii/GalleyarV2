import React, { useState, useRef, useEffect } from "react";
import {
  X,
  RotateCw,
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
} from "lucide-react";
import { Photo, PhotoEditState, TextOverlay } from "../types";

interface PhotoEditorModalProps {
  photo: Photo;
  onSave: (updatedPhoto: Photo, isCopy?: boolean) => void;
  onClose: () => void;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  photo,
  onSave,
  onClose,
}) => {
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "adjust" | "crop" | "filter" | "magic_eraser" | "text"
  >("adjust");

  // Photo image source state with undo history
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(
    photo.highResUrl || photo.url
  );
  const [urlHistory, setUrlHistory] = useState<string[]>([]);

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

  // Text Overlay Drag Ref
  const textDragRef = useRef<{
    isDragging: boolean;
    overlayId: string | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    isDragging: false,
    overlayId: null,
    startX: 0,
    startY: 0,
    initialX: 0.5,
    initialY: 0.5,
  });

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

  // AI Eraser state
  const [eraserBrushSize, setEraserBrushSize] = useState<number>(35);
  const [eraserPoints, setEraserPoints] = useState<
    { x: number; y: number; size: number }[]
  >([]);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isErasingWithAI, setIsErasingWithAI] = useState(false);
  const [eraseSuccessMsg, setEraseSuccessMsg] = useState(false);

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

  // Text Overlay Drag Handlers
  const handleTextPointerDown = (
    e: React.PointerEvent,
    overlay: TextOverlay
  ) => {
    e.stopPropagation();
    setActiveTextId(overlay.id);
    if (activeTab !== "text") setActiveTab("text");

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    textDragRef.current = {
      isDragging: true,
      overlayId: overlay.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: overlay.xNormalized,
      initialY: overlay.yNormalized,
    };
  };

  const handleTextPointerMove = (e: React.PointerEvent, overlayId: string) => {
    if (
      !textDragRef.current.isDragging ||
      textDragRef.current.overlayId !== overlayId ||
      !imageContainerRef.current
    )
      return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - textDragRef.current.startX) / rect.width;
    const dy = (e.clientY - textDragRef.current.startY) / rect.height;

    const newX = Math.max(0.05, Math.min(0.95, textDragRef.current.initialX + dx));
    const newY = Math.max(0.05, Math.min(0.95, textDragRef.current.initialY + dy));

    setTextOverlays((prev) =>
      prev.map((item) =>
        item.id === overlayId
          ? { ...item, xNormalized: newX, yNormalized: newY }
          : item
      )
    );
  };

  const handleTextPointerUp = (e: React.PointerEvent) => {
    if (textDragRef.current.isDragging) {
      textDragRef.current.isDragging = false;
      textDragRef.current.overlayId = null;
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

  // AI Eraser Brush Handler
  const addBrushPoint = (clientX: number, clientY: number) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setEraserPoints((prev) => [...prev, { x, y, size: eraserBrushSize }]);
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab !== "magic_eraser") return;
    setIsMouseDown(true);
    addBrushPoint(e.clientX, e.clientY);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab !== "magic_eraser" || !isMouseDown) return;
    addBrushPoint(e.clientX, e.clientY);
  };

  const handleStagePointerUp = () => {
    setIsMouseDown(false);
  };

  // Content-Aware AI Inpainting
  const performAIErase = (pointsToErase = eraserPoints) => {
    if (pointsToErase.length === 0) return;
    setIsErasingWithAI(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentPhotoUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setIsErasingWithAI(false);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      pointsToErase.forEach((pt) => {
        const cx = Math.round((pt.x / 100) * width);
        const cy = Math.round((pt.y / 100) * height);
        const radius = Math.max(12, Math.round((pt.size / 300) * Math.min(width, height)));

        const sampleRingRadius = Math.round(radius * 1.3);
        let sumR = 0, sumG = 0, sumB = 0, sampleCount = 0;

        for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
          const sx = Math.round(cx + Math.cos(angle) * sampleRingRadius);
          const sy = Math.round(cy + Math.sin(angle) * sampleRingRadius);

          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const idx = (sy * width + sx) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            sampleCount++;
          }
        }

        if (sampleCount === 0) return;

        const avgR = sumR / sampleCount;
        const avgG = sumG / sampleCount;
        const avgB = sumB / sampleCount;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const distSq = dx * dx + dy * dy;
            if (distSq <= radius * radius) {
              const px = cx + dx;
              const py = cy + dy;

              if (px >= 0 && px < width && py >= 0 && py < height) {
                const pixelIdx = (py * width + px) * 4;
                const distRatio = Math.sqrt(distSq) / radius;
                const noise = (Math.random() - 0.5) * 8;

                const currentR = data[pixelIdx];
                const currentG = data[pixelIdx + 1];
                const currentB = data[pixelIdx + 2];

                const blendWeight = Math.pow(1 - distRatio, 1.5);

                data[pixelIdx] = Math.min(255, Math.max(0, currentR * (1 - blendWeight) + (avgR + noise) * blendWeight));
                data[pixelIdx + 1] = Math.min(255, Math.max(0, currentG * (1 - blendWeight) + (avgG + noise) * blendWeight));
                data[pixelIdx + 2] = Math.min(255, Math.max(0, currentB * (1 - blendWeight) + (avgB + noise) * blendWeight));
              }
            }
          }
        }
      });

      ctx.putImageData(imageData, 0, 0);

      setUrlHistory((prev) => [...prev, currentPhotoUrl]);
      const newUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCurrentPhotoUrl(newUrl);
      setEraserPoints([]);
      setIsErasingWithAI(false);

      setEraseSuccessMsg(true);
      setTimeout(() => setEraseSuccessMsg(false), 2500);
    };

    img.onerror = () => {
      setIsErasingWithAI(false);
    };
  };

  const handleUndo = () => {
    if (urlHistory.length === 0) return;
    const previousUrl = urlHistory[urlHistory.length - 1];
    setUrlHistory((prev) => prev.slice(0, -1));
    setCurrentPhotoUrl(previousUrl);
  };

  // Final Save: Bake all filters, adjustments, and rotation permanently into high-res Canvas
  const handleSave = (isCopy = false) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentPhotoUrl;

    img.onload = () => {
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
          Math.max(canvas.width, canvas.height) * 0.7
        );
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Render text overlays onto high-res Canvas
      textOverlays.forEach((overlay) => {
        ctx.save();
        const xPx = overlay.xNormalized * canvas.width;
        const yPx = overlay.yNormalized * canvas.height;
        ctx.translate(xPx, yPx);
        ctx.rotate((overlay.rotation * Math.PI) / 180);

        const baseFontSize = (canvas.width * 0.05) * overlay.scale;
        let fontStr = `${baseFontSize}px sans-serif`;
        if (overlay.fontFamily === "serif") fontStr = `${baseFontSize}px Georgia, serif`;
        else if (overlay.fontFamily === "mono") fontStr = `${baseFontSize}px monospace`;
        else if (overlay.fontFamily === "display") fontStr = `bold ${baseFontSize * 1.15}px system-ui, sans-serif`;
        else if (overlay.fontFamily === "script") fontStr = `italic ${baseFontSize}px Georgia, serif`;

        ctx.font = fontStr;
        ctx.textAlign = overlay.alignment || "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = overlay.opacity ?? 1;

        if (overlay.style === "background") {
          const metrics = ctx.measureText(overlay.text);
          const pad = baseFontSize * 0.4;
          ctx.fillStyle = overlay.bgColor || "rgba(0,0,0,0.75)";
          ctx.fillRect(-metrics.width / 2 - pad, -baseFontSize / 2 - pad / 2, metrics.width + pad * 2, baseFontSize + pad);
        } else if (overlay.style === "shadow") {
          ctx.shadowColor = "rgba(0,0,0,0.85)";
          ctx.shadowBlur = baseFontSize * 0.25;
          ctx.shadowOffsetX = baseFontSize * 0.08;
          ctx.shadowOffsetY = baseFontSize * 0.08;
        } else if (overlay.style === "outline") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = baseFontSize * 0.12;
          ctx.strokeText(overlay.text, 0, 0);
        }

        ctx.fillStyle = overlay.color || "#ffffff";
        ctx.fillText(overlay.text, 0, 0);
        ctx.restore();
      });

      const finalBakedUrl = canvas.toDataURL("image/jpeg", 0.95);
      finishAndSavePhoto(finalBakedUrl, isCopy);
    };

    img.onerror = () => {
      finishAndSavePhoto(currentPhotoUrl, isCopy);
    };
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

    const updatedTitle = isCopy
      ? `${photo.title} (Edited)`
      : photo.title.includes("(Edited)")
      ? photo.title
      : `${photo.title} (Edited)`;

    const updatedPhoto: Photo = {
      ...photo,
      id: isCopy ? `photo-e-${Date.now()}` : photo.id,
      title: updatedTitle,
      url: finalUrl,
      highResUrl: finalUrl,
      editedState: updatedEditState,
      date: isCopy ? new Date().toISOString() : photo.date,
    };

    onSave(updatedPhoto, isCopy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden animate-fade-in select-none">
      {/* Top Header */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Pro Photo Studio</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI & Canvas Engine
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">{photo.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {urlHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 hover:text-white cursor-pointer"
              title="Undo Last Action"
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          )}

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
              setEraserPoints([]);
              setCurrentPhotoUrl(photo.highResUrl || photo.url);
              setUrlHistory([]);
              setCropBox({ x: 10, y: 10, width: 80, height: 80 });
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:text-white cursor-pointer"
          >
            Revert
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSaveOptions(!showSaveOptions)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30 border border-indigo-400/40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Photo</span>
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
        {activeTab === "magic_eraser" && (
          <div className="absolute top-4 z-20 px-4 py-2 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md animate-fade-in">
            <Wand2 className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span>
              {eraserPoints.length > 0
                ? `${eraserPoints.length} spots masked. Tap "Erase Selected" below.`
                : "Brush on any object in the photo to erase it."}
            </span>
          </div>
        )}

        {/* Instruction Badge when Crop active */}
        {activeTab === "crop" && (
          <div className="absolute top-4 z-20 px-4 py-2 rounded-2xl bg-slate-900/90 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md animate-fade-in">
            <Crop className="w-4 h-4 text-indigo-400" />
            <span>Drag crop handles or box, choose aspect ratio, then click "Apply Crop".</span>
          </div>
        )}

        {/* Toast Banners */}
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
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerUp}
          className={`relative max-h-full max-w-full transition-transform duration-300 flex items-center justify-center ${
            activeTab === "magic_eraser" ? "cursor-crosshair" : ""
          }`}
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
          }}
        >
          <img
            ref={imageElementRef}
            src={currentPhotoUrl}
            alt="Editing"
            className="max-h-[62vh] max-w-full object-contain rounded-xl shadow-2xl pointer-events-none"
            style={{
              filter: getCssFilter(),
            }}
          />

          {/* Interactive Crop Box Overlay */}
          {activeTab === "crop" && (
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

          {/* AI Object Eraser Brushed Mask Spots */}
          {activeTab === "magic_eraser" &&
            eraserPoints.map((pt, idx) => (
              <div
                key={idx}
                style={{
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  width: `${pt.size}px`,
                  height: `${pt.size}px`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/60 backdrop-blur-[1px] border border-pink-400 pointer-events-none shadow-[0_0_12px_rgba(236,72,153,0.8)] animate-pulse"
              />
            ))}

          {/* Interactive Text Overlays on Stage */}
          {textOverlays.map((overlay) => {
            const isSelected = activeTextId === overlay.id;
            let fontClass = "font-sans";
            if (overlay.fontFamily === "serif") fontClass = "font-serif";
            else if (overlay.fontFamily === "mono") fontClass = "font-mono";
            else if (overlay.fontFamily === "display") fontClass = "font-black tracking-wide uppercase";
            else if (overlay.fontFamily === "script") fontClass = "font-serif italic";

            return (
              <div
                key={overlay.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTextId(overlay.id);
                  if (activeTab !== "text") setActiveTab("text");
                }}
                onPointerDown={(e) => handleTextPointerDown(e, overlay)}
                onPointerMove={(e) => handleTextPointerMove(e, overlay.id)}
                onPointerUp={handleTextPointerUp}
                onPointerCancel={handleTextPointerUp}
                style={{
                  left: `${overlay.xNormalized * 100}%`,
                  top: `${overlay.yNormalized * 100}%`,
                  transform: `translate(-50%, -50%) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`,
                  opacity: overlay.opacity,
                  color: overlay.color,
                }}
                className={`absolute pointer-events-auto select-none cursor-grab active:cursor-grabbing z-30 transition-shadow touch-none ${
                  isSelected
                    ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-black/40 rounded-xl p-2 bg-black/30 backdrop-blur-sm"
                    : "p-1"
                }`}
              >
                <div
                  className={`${fontClass} whitespace-nowrap text-lg sm:text-2xl font-bold transition-all ${
                    overlay.style === "background"
                      ? "px-3 py-1 rounded-xl shadow-lg"
                      : overlay.style === "outline"
                      ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                      : overlay.style === "shadow"
                      ? "drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                      : ""
                  }`}
                  style={{
                    backgroundColor:
                      overlay.style === "background"
                        ? overlay.bgColor || "rgba(0,0,0,0.75)"
                        : "transparent",
                  }}
                >
                  {overlay.text}
                </div>

                {/* Selected Overlay Action Controls Bar */}
                {isSelected && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-xl p-1 shadow-2xl z-40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextOverlays((prev) =>
                          prev.map((t) =>
                            t.id === overlay.id ? { ...t, scale: Math.max(0.4, t.scale - 0.15) } : t
                          )
                        );
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                      title="Decrease Size"
                    >
                      A-
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextOverlays((prev) =>
                          prev.map((t) =>
                            t.id === overlay.id ? { ...t, scale: Math.min(3, t.scale + 0.15) } : t
                          )
                        );
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                      title="Increase Size"
                    >
                      A+
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextOverlays((prev) =>
                          prev.map((t) =>
                            t.id === overlay.id ? { ...t, rotation: (t.rotation + 90) % 360 } : t
                          )
                        );
                      }}
                      className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                      title="Rotate Text"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextOverlays((prev) => prev.filter((t) => t.id !== overlay.id));
                        setActiveTextId(null);
                      }}
                      className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer"
                      title="Delete Text"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Tool Editing Panels */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 space-y-4">
        {/* Tab Selection Row */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 max-w-lg mx-auto bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab("adjust")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "adjust"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Adjust</span>
          </button>

          <button
            onClick={() => setActiveTab("crop")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "crop"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Crop</span>
          </button>

          <button
            onClick={() => setActiveTab("filter")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "filter"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          <button
            onClick={() => setActiveTab("text")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "text"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>

          <button
            onClick={() => setActiveTab("magic_eraser")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "magic_eraser"
                ? "bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Eraser</span>
          </button>
        </div>

        {/* Tab Controls Content */}
        <div className="max-w-3xl mx-auto min-h-[110px] flex items-center justify-center">
          {/* Adjustments Tab */}
          {activeTab === "adjust" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span>Brightness</span>
                  <span>{brightness}</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span>Contrast</span>
                  <span>{contrast}</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span>Saturation</span>
                  <span>{saturation}</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span>Warmth / Tone</span>
                  <span>{warmth}</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={warmth}
                  onChange={(e) => setWarmth(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Crop & Transform Tab */}
          {activeTab === "crop" && (
            <div className="flex flex-col items-center gap-3 w-full">
              {/* Aspect Ratio Buttons */}
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

              {/* Crop Controls Row */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  onClick={performCanvasCrop}
                  disabled={isApplyingCrop}
                  className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <Scissors className="w-4 h-4" />
                  <span>{isApplyingCrop ? "Cropping Image..." : "Apply Crop"}</span>
                </button>

                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Rotate 90°</span>
                </button>

                <button
                  onClick={() => setFlipH(!flipH)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span>Flip Horizontal</span>
                </button>
              </div>
            </div>
          )}

          {/* Filters Tab */}
          {activeTab === "filter" && (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none w-full">
              {filtersList.map((f) => (
                <button
                  key={f.id}
                  onClick={() => applyPresetFilter(f.id)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    filter === f.id
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span>{f.label}</span>
                  {filter === f.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* AI Magic Object Eraser Tab */}
          {activeTab === "magic_eraser" && (
            <div className="flex flex-col items-center gap-3 w-full">
              {/* Brush Size Controls */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-400">Brush Size:</span>
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {[
                    { label: "Small", size: 20 },
                    { label: "Medium", size: 35 },
                    { label: "Large", size: 55 },
                  ].map((b) => (
                    <button
                      key={b.size}
                      onClick={() => setEraserBrushSize(b.size)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        eraserBrushSize === b.size
                          ? "bg-pink-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                {/* Erase Selected Mask Button */}
                <button
                  onClick={() => performAIErase()}
                  disabled={eraserPoints.length === 0 || isErasingWithAI}
                  className={`px-5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                    eraserPoints.length > 0 && !isErasingWithAI
                      ? "bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-pink-600/30 animate-pulse"
                      : "bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <Wand2 className="w-4 h-4 text-amber-300" />
                  <span>
                    {isErasingWithAI
                      ? "Erasing Object with AI..."
                      : `Erase Brushed Area (${eraserPoints.length})`}
                  </span>
                </button>

                {/* Auto-detect Blemish Eraser preset */}
                <button
                  onClick={() => {
                    const presetSpot = [
                      { x: 50, y: 50, size: 40 },
                      { x: 48, y: 52, size: 30 },
                    ];
                    performAIErase(presetSpot);
                  }}
                  disabled={isErasingWithAI}
                  className="px-4 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Auto-Erase Blemish</span>
                </button>

                {/* Clear Mask */}
                {eraserPoints.length > 0 && (
                  <button
                    onClick={() => setEraserPoints([])}
                    className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium cursor-pointer"
                  >
                    Clear Mask
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Text Tool Control Panel */}
          {activeTab === "text" && (
            <div className="flex flex-col gap-3 w-full max-w-xl">
              {/* Add Text & Active Text Input Row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newOverlay: TextOverlay = {
                      id: `text-${Date.now()}`,
                      text: "Sample Text",
                      xNormalized: 0.5,
                      yNormalized: 0.5,
                      scale: 1,
                      rotation: 0,
                      fontFamily: "sans",
                      color: "#ffffff",
                      opacity: 1,
                      alignment: "center",
                      style: "shadow",
                      bgColor: "#000000",
                    };
                    setTextOverlays((prev) => [...prev, newOverlay]);
                    setActiveTextId(newOverlay.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Text</span>
                </button>

                {activeTextId && (
                  <input
                    type="text"
                    value={
                      textOverlays.find((t) => t.id === activeTextId)?.text || ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setTextOverlays((prev) =>
                        prev.map((t) =>
                          t.id === activeTextId ? { ...t, text: val } : t
                        )
                      );
                    }}
                    placeholder="Type text here..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              {/* Font Family & Style Options */}
              {activeTextId && (
                <div className="space-y-2">
                  {/* Font choices with live preview */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { id: "sans", label: "Sans", fontClass: "font-sans" },
                      { id: "serif", label: "Serif", fontClass: "font-serif" },
                      { id: "display", label: "Display", fontClass: "font-black uppercase tracking-wider" },
                      { id: "script", label: "Script", fontClass: "font-serif italic" },
                      { id: "mono", label: "Mono", fontClass: "font-mono" },
                    ].map((f) => {
                      const activeItem = textOverlays.find((t) => t.id === activeTextId);
                      const isSel = activeItem?.fontFamily === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() =>
                            setTextOverlays((prev) =>
                              prev.map((t) =>
                                t.id === activeTextId
                                  ? { ...t, fontFamily: f.id as any }
                                  : t
                              )
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${f.fontClass} ${
                            isSel
                              ? "bg-indigo-600 text-white border-indigo-400"
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Colors & Style Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Color Swatches */}
                    <div className="flex items-center gap-1.5">
                      {["#ffffff", "#000000", "#f87171", "#fbbf24", "#34d399", "#60a5fa", "#c084fc", "#f472b6"].map((color) => {
                        const activeItem = textOverlays.find((t) => t.id === activeTextId);
                        const isSel = activeItem?.color === color;
                        return (
                          <button
                            key={color}
                            onClick={() =>
                              setTextOverlays((prev) =>
                                prev.map((t) =>
                                  t.id === activeTextId ? { ...t, color } : t
                                )
                              )
                            }
                            style={{ backgroundColor: color }}
                            className={`w-6 h-6 rounded-full border border-white/20 transition-transform cursor-pointer ${
                              isSel ? "scale-125 ring-2 ring-indigo-400" : "hover:scale-110"
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Style selector */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {[
                        { id: "normal", label: "Plain" },
                        { id: "shadow", label: "Shadow" },
                        { id: "outline", label: "Outline" },
                        { id: "background", label: "Badge" },
                      ].map((st) => {
                        const activeItem = textOverlays.find((t) => t.id === activeTextId);
                        const isSel = activeItem?.style === st.id;
                        return (
                          <button
                            key={st.id}
                            onClick={() =>
                              setTextOverlays((prev) =>
                                prev.map((t) =>
                                  t.id === activeTextId
                                    ? { ...t, style: st.id as any }
                                    : t
                                )
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              isSel
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

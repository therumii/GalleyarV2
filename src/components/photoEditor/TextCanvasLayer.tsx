import React, { useRef, useEffect, useState } from "react";
import { Copy, RotateCw, Undo2 } from "lucide-react";
import { TextOverlay } from "../../types";
import { buildTextLayerStyle } from "../../utils/textFonts";
import { haptics } from "../../utils/haptics";

interface TextCanvasLayerProps {
  overlay: TextOverlay;
  isSelected: boolean;
  isEditingInline: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (id: string) => void;
  onUpdate: (id: string, partial: Partial<TextOverlay>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onStartInlineEdit: (id: string) => void;
  onSnapChange?: (guide: { x?: number; y?: number } | null) => void;
}

export const TextCanvasLayer: React.FC<TextCanvasLayerProps> = ({
  overlay,
  isSelected,
  isEditingInline,
  containerRef,
  onSelect,
  onUpdate,
  onDelete: _onDelete,
  onDuplicate,
  onStartInlineEdit,
  onSnapChange,
}) => {
  const layerRef = useRef<HTMLDivElement | null>(null);

  // Snapshot before transformation starts (for Cancel / Revert)
  const initialTransformSnapshot = useRef<{
    xNormalized: number;
    yNormalized: number;
    scale: number;
    rotation: number;
  }>({
    xNormalized: overlay.xNormalized,
    yNormalized: overlay.yNormalized,
    scale: overlay.scale || 1,
    rotation: overlay.rotation || 0,
  });

  const [hasActiveChanges, setHasActiveChanges] = useState<boolean>(false);

  // Update initial snapshot whenever selection is gained
  useEffect(() => {
    if (isSelected) {
      initialTransformSnapshot.current = {
        xNormalized: overlay.xNormalized,
        yNormalized: overlay.yNormalized,
        scale: overlay.scale || 1,
        rotation: overlay.rotation || 0,
      };
      setHasActiveChanges(false);
    }
  }, [isSelected, overlay.id]);

  // Single-Pointer Drag Ref
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasSnappedX: boolean;
    hasSnappedY: boolean;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialX: overlay.xNormalized,
    initialY: overlay.yNormalized,
    hasSnappedX: false,
    hasSnappedY: false,
  });

  // Corner Resize Gesture Ref
  const resizeRef = useRef<{
    isResizing: boolean;
    startX: number;
    startY: number;
    initialScale: number;
    centerX: number;
    centerY: number;
    initialDist: number;
  }>({
    isResizing: false,
    startX: 0,
    startY: 0,
    initialScale: overlay.scale || 1,
    centerX: 0,
    centerY: 0,
    initialDist: 1,
  });

  // Rotate Stem Gesture Ref
  const rotateRef = useRef<{
    isRotating: boolean;
    initialAngle: number;
    initialRotation: number;
    centerX: number;
    centerY: number;
  }>({
    isRotating: false,
    initialAngle: 0,
    initialRotation: overlay.rotation || 0,
    centerX: 0,
    centerY: 0,
  });

  // Multi-touch gestures (Pinch-to-resize + 2-finger rotation)
  const isMultiTouching = useRef<boolean>(false);
  const initialPinchDist = useRef<number | null>(null);
  const initialPinchScale = useRef<number>(overlay.scale || 1);
  const initialPinchAngle = useRef<number | null>(null);
  const initialPinchRotation = useRef<number>(overlay.rotation || 0);

  // Double-tap detector
  const lastTapTimeRef = useRef<number>(0);

  // Cleanup snaps on unmount
  useEffect(() => {
    return () => {
      onSnapChange?.(null);
    };
  }, [onSnapChange]);

  /* =======================================================================
   * 1. SINGLE-POINTER DRAG HANDLERS (Move Text)
   * ======================================================================= */
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditingInline || isMultiTouching.current) return;

    e.stopPropagation();

    // Double-tap detection for inline edit
    const now = Date.now();
    if (now - lastTapTimeRef.current < 280) {
      lastTapTimeRef.current = 0;
      haptics.selection();
      onStartInlineEdit(overlay.id);
      return;
    }
    lastTapTimeRef.current = now;

    if (!isSelected) {
      haptics.selection();
      onSelect(overlay.id);
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: overlay.xNormalized,
      initialY: overlay.yNormalized,
      hasSnappedX: false,
      hasSnappedY: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || isMultiTouching.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const dy = (e.clientY - dragRef.current.startY) / rect.height;

    let targetX = dragRef.current.initialX + dx;
    let targetY = dragRef.current.initialY + dy;

    // Bounds clamp to keep text within canvas view
    targetX = Math.max(0.02, Math.min(0.98, targetX));
    targetY = Math.max(0.02, Math.min(0.98, targetY));

    // Center Snapping (0.5)
    let snapGuideX: number | undefined;
    let snapGuideY: number | undefined;
    const snapTolerance = 0.022;

    if (Math.abs(targetX - 0.5) < snapTolerance) {
      targetX = 0.5;
      snapGuideX = 50;
      if (!dragRef.current.hasSnappedX) {
        haptics.light();
        dragRef.current.hasSnappedX = true;
      }
    } else {
      dragRef.current.hasSnappedX = false;
    }

    if (Math.abs(targetY - 0.5) < snapTolerance) {
      targetY = 0.5;
      snapGuideY = 50;
      if (!dragRef.current.hasSnappedY) {
        haptics.light();
        dragRef.current.hasSnappedY = true;
      }
    } else {
      dragRef.current.hasSnappedY = false;
    }

    if (snapGuideX || snapGuideY) {
      onSnapChange?.({ x: snapGuideX, y: snapGuideY });
    } else {
      onSnapChange?.(null);
    }

    setHasActiveChanges(true);
    onUpdate(overlay.id, {
      xNormalized: targetX,
      yNormalized: targetY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      onSnapChange?.(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  /* =======================================================================
   * 2. CORNER RESIZE HANDLERS (Natural Proportional Scaling)
   * ======================================================================= */
  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    if (!layerRef.current) return;
    const rect = layerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      initialScale: overlay.scale || 1,
      centerX,
      centerY,
      initialDist: Math.max(10, dist),
    };
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current.isResizing) return;

    const { centerX, centerY, initialDist, initialScale } = resizeRef.current;
    const currentDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
    const ratio = currentDist / initialDist;

    const newScale = Math.max(0.3, Math.min(4.0, initialScale * ratio));
    setHasActiveChanges(true);
    onUpdate(overlay.id, { scale: Number(newScale.toFixed(2)) });
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (resizeRef.current.isResizing) {
      resizeRef.current.isResizing = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  /* =======================================================================
   * 3. DEDICATED ROTATION HANDLE (Below Text Box on Stem)
   * ======================================================================= */
  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    if (!layerRef.current) return;
    const rect = layerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const initialAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

    rotateRef.current = {
      isRotating: true,
      initialAngle,
      initialRotation: overlay.rotation || 0,
      centerX,
      centerY,
    };
  };

  const handleRotateMove = (e: React.PointerEvent) => {
    if (!rotateRef.current.isRotating) return;

    const { centerX, centerY, initialAngle, initialRotation } = rotateRef.current;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const deltaDeg = ((currentAngle - initialAngle) * 180) / Math.PI;

    let targetRot = (initialRotation + deltaDeg) % 360;
    if (targetRot < 0) targetRot += 360;

    // Gentle magnetic snapping to cardinal angles (0, 45, 90, 180, 270, 360)
    const snapThreshold = 4.0;
    [0, 45, 90, 180, 270, 360].forEach((angle) => {
      if (Math.abs(targetRot - angle) <= snapThreshold) {
        targetRot = angle % 360;
      }
    });

    setHasActiveChanges(true);
    onUpdate(overlay.id, { rotation: Math.round(targetRot) });
  };

  const handleRotateEnd = (e: React.PointerEvent) => {
    if (rotateRef.current.isRotating) {
      rotateRef.current.isRotating = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  /* =======================================================================
   * 4. TWO-FINGER PINCH RESIZE & TWO-FINGER ROTATION
   * ======================================================================= */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditingInline) return;

    if (e.touches.length === 2) {
      dragRef.current.isDragging = false;
      isMultiTouching.current = true;

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialPinchDist.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialPinchScale.current = overlay.scale || 1;
      initialPinchAngle.current = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      initialPinchRotation.current = overlay.rotation || 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (
      isEditingInline ||
      e.touches.length !== 2 ||
      !initialPinchDist.current ||
      initialPinchAngle.current === null
    ) {
      return;
    }

    const t1 = e.touches[0];
    const t2 = e.touches[1];

    // 1. Pinch to Scale
    const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const scaleRatio = currentDist / initialPinchDist.current;
    const newScale = Math.max(0.3, Math.min(4.0, initialPinchScale.current * scaleRatio));

    // 2. Two-Finger Rotation
    const currentAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
    const deltaDeg = ((currentAngle - initialPinchAngle.current) * 180) / Math.PI;
    let newRotation = (initialPinchRotation.current + deltaDeg) % 360;
    if (newRotation < 0) newRotation += 360;

    setHasActiveChanges(true);
    onUpdate(overlay.id, {
      scale: Number(newScale.toFixed(2)),
      rotation: Math.round(newRotation),
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDist.current = null;
      initialPinchAngle.current = null;
      isMultiTouching.current = false;
    }
  };

  // Revert / Cancel Transform back to initial snapshot
  const handleCancelTransform = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.selection();
    onUpdate(overlay.id, {
      xNormalized: initialTransformSnapshot.current.xNormalized,
      yNormalized: initialTransformSnapshot.current.yNormalized,
      scale: initialTransformSnapshot.current.scale,
      rotation: initialTransformSnapshot.current.rotation,
    });
    setHasActiveChanges(false);
  };

  // Background styling
  const bgStyleMode = overlay.bgStyle || (overlay.style === "background" ? "rounded" : "none");
  const hasBg = bgStyleMode !== "none" || overlay.style === "background";
  const bgPad = overlay.bgPadding ?? 12;

  let bgShapeClass = "";
  if (bgStyleMode === "rounded" || overlay.style === "background") {
    bgShapeClass = "rounded-xl shadow-md";
  } else if (bgStyleMode === "pill") {
    bgShapeClass = "rounded-full shadow-md";
  } else if (bgStyleMode === "solid") {
    bgShapeClass = "rounded-none shadow-sm";
  }

  const textStyle = buildTextLayerStyle(overlay);

  return (
    <div
      ref={layerRef}
      id={`text-layer-${overlay.id}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        left: `${overlay.xNormalized * 100}%`,
        top: `${overlay.yNormalized * 100}%`,
        transform: `translate(-50%, -50%) scale(${overlay.scale || 1}) rotate(${overlay.rotation || 0}deg)`,
        transformOrigin: "center center",
      }}
      className={`absolute select-none cursor-grab active:cursor-grabbing z-30 touch-none ${
        isSelected ? "z-40" : ""
      }`}
    >
      {/* CLEAN MINIMAL TRANSFORM BOX & CONTROLS */}
      {isSelected && !isEditingInline && (
        <div
          className="absolute -inset-1.5 border border-indigo-400/90 rounded-lg pointer-events-none"
        >
          {/* SIMPLIFIED FLOATING TOOLBAR: Duplicate only (+ Cancel/Revert when transformed) */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/95 border border-slate-700/80 backdrop-blur-md rounded-full px-2 py-1 shadow-xl pointer-events-auto z-50">
            {/* Duplicate Button (Kept) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.selection();
                onDuplicate(overlay.id);
              }}
              className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-full transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
              title="Duplicate layer"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline pr-1">Duplicate</span>
            </button>

            {/* Cancel / Revert Control if transformed */}
            {hasActiveChanges && (
              <button
                onClick={handleCancelTransform}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                title="Cancel changes & revert"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="pr-1">Reset</span>
              </button>
            )}
          </div>

          {/* DEDICATED ROTATION STEM + HANDLE BELOW TEXT BOX */}
          {/* Stem Line extending below: │ */}
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-[1.5px] h-7 bg-indigo-400/80 pointer-events-none" />

          {/* Rotation Handle: ↻ below text box */}
          <div
            onPointerDown={handleRotateStart}
            onPointerMove={handleRotateMove}
            onPointerUp={handleRotateEnd}
            onPointerCancel={handleRotateEnd}
            className="absolute -bottom-11 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-950 border border-indigo-400 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto shadow-lg hover:scale-110 active:scale-95 transition-transform"
            title="Rotate text (Drag around center)"
          >
            <RotateCw className="w-3.5 h-3.5 text-indigo-300 pointer-events-none" />
          </div>

          {/* CLEAN CORNER RESIZE & EXPAND HANDLES */}
          {/* Top Left Handle */}
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -top-4 -left-4 w-8 h-8 flex items-center justify-center cursor-nwse-resize pointer-events-auto"
            title="Resize scale"
          >
            <div className="w-2.5 h-2.5 rounded-[2px] bg-white border border-slate-900 shadow-sm" />
          </div>

          {/* Top Right Handle */}
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -top-4 -right-4 w-8 h-8 flex items-center justify-center cursor-nesw-resize pointer-events-auto"
            title="Resize scale"
          >
            <div className="w-2.5 h-2.5 rounded-[2px] bg-white border border-slate-900 shadow-sm" />
          </div>

          {/* Bottom Left Handle */}
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -bottom-4 -left-4 w-8 h-8 flex items-center justify-center cursor-nesw-resize pointer-events-auto"
            title="Resize scale"
          >
            <div className="w-2.5 h-2.5 rounded-[2px] bg-white border border-slate-900 shadow-sm" />
          </div>

          {/* Bottom Right Expand/Resize Handle */}
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -bottom-4 -right-4 w-8 h-8 flex items-center justify-center cursor-nwse-resize pointer-events-auto"
            title="Expand / Resize text"
          >
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-400 border border-white shadow-sm" />
          </div>
        </div>
      )}

      {/* Rendered Text Content with blendMode & formatting */}
      <div
        className={`inline-block whitespace-pre-wrap ${bgShapeClass}`}
        style={{
          ...textStyle,
          backgroundColor: hasBg ? (overlay.bgColor || "rgba(0, 0, 0, 0.75)") : "transparent",
          padding: hasBg ? `${bgPad * 0.4}px ${bgPad}px` : "2px 6px",
          fontSize: `${overlay.fontSizeRelative || 24}px`,
        }}
      >
        {overlay.text || "Tap to type"}
      </div>
    </div>
  );
};

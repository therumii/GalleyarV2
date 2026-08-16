import React, { useRef, useEffect, useState } from "react";
import { Copy, RotateCw, Trash2, FlipHorizontal2, ArrowUp, ArrowDown } from "lucide-react";
import { StickerOverlay, TextBlendMode } from "../../types";
import { haptics } from "../../utils/haptics";

interface StickerCanvasLayerProps {
  overlay: StickerOverlay;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (id: string) => void;
  onUpdate: (id: string, partial: Partial<StickerOverlay>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onBringForward?: (id: string) => void;
  onSendBackward?: (id: string) => void;
  onSnapChange?: (guide: { x?: number; y?: number } | null) => void;
}

export const StickerCanvasLayer: React.FC<StickerCanvasLayerProps> = ({
  overlay,
  isSelected,
  containerRef,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onSnapChange,
}) => {
  const layerRef = useRef<HTMLDivElement | null>(null);

  // Single-Pointer Drag Ref
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialX: overlay.xNormalized,
    initialY: overlay.yNormalized,
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

  /* -------------------------------------------------------------
   * 1. SINGLE-POINTER DRAG HANDLERS (Move Sticker)
   * ------------------------------------------------------------- */
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMultiTouching.current) return;
    e.stopPropagation();

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
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || isMultiTouching.current) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const deltaXPx = e.clientX - dragRef.current.startX;
    const deltaYPx = e.clientY - dragRef.current.startY;

    let nextX = dragRef.current.initialX + deltaXPx / rect.width;
    let nextY = dragRef.current.initialY + deltaYPx / rect.height;

    // Boundaries & Center snapping
    let snapX: number | undefined = undefined;
    let snapY: number | undefined = undefined;

    const snapThreshold = 0.02;
    if (Math.abs(nextX - 0.5) < snapThreshold) {
      nextX = 0.5;
      snapX = 0.5;
    }
    if (Math.abs(nextY - 0.5) < snapThreshold) {
      nextY = 0.5;
      snapY = 0.5;
    }

    onSnapChange?.(snapX !== undefined || snapY !== undefined ? { x: snapX, y: snapY } : null);

    // Keep clamped inside visible area
    nextX = Math.max(0.05, Math.min(0.95, nextX));
    nextY = Math.max(0.05, Math.min(0.95, nextY));

    onUpdate(overlay.id, { xNormalized: nextX, yNormalized: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      onSnapChange?.(null);
    }
  };

  /* -------------------------------------------------------------
   * 2. CORNER RESIZE HANDLERS
   * ------------------------------------------------------------- */
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
      initialDist: Math.max(dist, 10),
    };
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current.isResizing) return;
    e.stopPropagation();

    const currentDist = Math.hypot(
      e.clientX - resizeRef.current.centerX,
      e.clientY - resizeRef.current.centerY
    );

    const scaleFactor = currentDist / resizeRef.current.initialDist;
    const newScale = Math.max(0.3, Math.min(4.0, resizeRef.current.initialScale * scaleFactor));
    onUpdate(overlay.id, { scale: Number(newScale.toFixed(3)) });
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (resizeRef.current.isResizing) {
      resizeRef.current.isResizing = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  /* -------------------------------------------------------------
   * 3. ROTATION HANDLE & STEM
   * ------------------------------------------------------------- */
  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    if (!layerRef.current) return;
    const rect = layerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const initialAngle = (rad * 180) / Math.PI;

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
    e.stopPropagation();

    const rad = Math.atan2(
      e.clientY - rotateRef.current.centerY,
      e.clientX - rotateRef.current.centerX
    );
    const currentAngle = (rad * 180) / Math.PI;
    const delta = currentAngle - rotateRef.current.initialAngle;
    let nextRotation = (rotateRef.current.initialRotation + delta) % 360;
    if (nextRotation < 0) nextRotation += 360;

    // Angle snapping to 0, 90, 180, 270 degrees
    const snapAngles = [0, 90, 180, 270, 360];
    for (const sa of snapAngles) {
      if (Math.abs(nextRotation - sa) < 4) {
        nextRotation = sa % 360;
        break;
      }
    }

    onUpdate(overlay.id, { rotation: Math.round(nextRotation) });
  };

  const handleRotateEnd = (e: React.PointerEvent) => {
    if (rotateRef.current.isRotating) {
      rotateRef.current.isRotating = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  /* -------------------------------------------------------------
   * 4. TWO-FINGER PINCH-TO-RESIZE & ROTATION (Mobile Gestures)
   * ------------------------------------------------------------- */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isMultiTouching.current = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = (Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180) / Math.PI;

      initialPinchDist.current = dist;
      initialPinchScale.current = overlay.scale || 1;
      initialPinchAngle.current = angle;
      initialPinchRotation.current = overlay.rotation || 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isMultiTouching.current && initialPinchDist.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scaleFactor = dist / initialPinchDist.current;
      const newScale = Math.max(0.3, Math.min(4.0, initialPinchScale.current * scaleFactor));

      let newRotation = overlay.rotation || 0;
      if (initialPinchAngle.current !== null) {
        const angle = (Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180) / Math.PI;
        const deltaAngle = angle - initialPinchAngle.current;
        newRotation = (initialPinchRotation.current + deltaAngle + 360) % 360;
      }

      onUpdate(overlay.id, {
        scale: Number(newScale.toFixed(3)),
        rotation: Math.round(newRotation),
      });
    }
  };

  const handleTouchEnd = () => {
    if (isMultiTouching.current) {
      isMultiTouching.current = false;
      initialPinchDist.current = null;
      initialPinchAngle.current = null;
    }
  };

  // Flip horizontal / vertical
  const flipH = overlay.flipH || false;
  const flipV = overlay.flipV || false;
  const scaleX = flipH ? -1 : 1;
  const scaleY = flipV ? -1 : 1;

  return (
    <div
      ref={layerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        left: `${overlay.xNormalized * 100}%`,
        top: `${overlay.yNormalized * 100}%`,
        transform: `translate(-50%, -50%) rotate(${overlay.rotation || 0}deg) scale(${overlay.scale || 1})`,
        zIndex: overlay.zIndex || 30,
      }}
      className="absolute pointer-events-auto select-none touch-none cursor-grab active:cursor-grabbing origin-center"
    >
      {/* SELECTION BOUNDING BOX & CONTROLS */}
      {isSelected && (
        <div className="absolute -inset-2 border-2 border-indigo-400/90 rounded-xl pointer-events-none shadow-[0_0_12px_rgba(99,102,241,0.4)]">
          {/* FLOATING MINI TOOLBAR */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/95 border border-slate-700/80 backdrop-blur-md rounded-full px-2 py-1 shadow-2xl pointer-events-auto z-50">
            {/* Duplicate */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.selection();
                onDuplicate(overlay.id);
              }}
              className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-full transition-colors cursor-pointer"
              title="Duplicate Sticker"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-300" />
            </button>

            {/* Flip Horizontal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.selection();
                onUpdate(overlay.id, { flipH: !overlay.flipH });
              }}
              className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-full transition-colors cursor-pointer"
              title="Flip Horizontal"
            >
              <FlipHorizontal2 className="w-3.5 h-3.5 text-indigo-300" />
            </button>

            {/* Bring Forward */}
            {onBringForward && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.selection();
                  onBringForward(overlay.id);
                }}
                className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Bring Forward"
              >
                <ArrowUp className="w-3.5 h-3.5 text-slate-300" />
              </button>
            )}

            {/* Send Backward */}
            {onSendBackward && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.selection();
                  onSendBackward(overlay.id);
                }}
                className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Send Backward"
              >
                <ArrowDown className="w-3.5 h-3.5 text-slate-300" />
              </button>
            )}

            {/* Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.impact();
                onDelete(overlay.id);
              }}
              className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-full transition-colors cursor-pointer"
              title="Delete Sticker"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ROTATION STEM & HANDLE */}
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-[1.5px] h-7 bg-indigo-400/80 pointer-events-none" />
          <div
            onPointerDown={handleRotateStart}
            onPointerMove={handleRotateMove}
            onPointerUp={handleRotateEnd}
            onPointerCancel={handleRotateEnd}
            className="absolute -bottom-11 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-950 border border-indigo-400 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto shadow-lg hover:scale-110 active:scale-95 transition-transform"
            title="Rotate Sticker"
          >
            <RotateCw className="w-3.5 h-3.5 text-indigo-300 pointer-events-none" />
          </div>

          {/* CORNER RESIZE HANDLES */}
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -top-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize pointer-events-auto"
          >
            <div className="w-3 h-3 rounded-[2px] bg-white border border-slate-900 shadow-md" />
          </div>
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -top-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize pointer-events-auto"
          >
            <div className="w-3 h-3 rounded-[2px] bg-white border border-slate-900 shadow-md" />
          </div>
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -bottom-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize pointer-events-auto"
          >
            <div className="w-3 h-3 rounded-[2px] bg-white border border-slate-900 shadow-md" />
          </div>
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -bottom-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize pointer-events-auto"
          >
            <div className="w-3 h-3 rounded-[2px] bg-indigo-400 border border-white shadow-md" />
          </div>
        </div>
      )}

      {/* RENDERED STICKER GRAPHIC */}
      <div
        style={{
          transform: `scaleX(${scaleX}) scaleY(${scaleY})`,
          opacity: overlay.opacity ?? 1,
          mixBlendMode: (overlay.blendMode as any) || "normal",
        }}
        className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center pointer-events-none drop-shadow-md"
      >
        {overlay.imageUrl ? (
          <img
            src={overlay.imageUrl}
            alt={overlay.name || "Sticker"}
            className="w-full h-full object-contain pointer-events-none"
            crossOrigin="anonymous"
          />
        ) : overlay.svgContent ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:drop-shadow-sm"
            dangerouslySetInnerHTML={{ __html: overlay.svgContent }}
          />
        ) : (
          <div className="text-5xl select-none leading-none">
            {overlay.sticker}
          </div>
        )}
      </div>
    </div>
  );
};

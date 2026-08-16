import React, { useRef, useEffect, useState, useCallback } from "react";
import { EraserStroke, renderMaskToCanvas } from "../../utils/inpaintingEngine";
import { haptics } from "../../utils/haptics";

interface EraserCanvasOverlayProps {
  isActive: boolean;
  mode: "remove" | "restore";
  brushSize: number; // 5 to 100
  brushSoftness: number; // 0 to 1
  strokes: EraserStroke[];
  onStrokesChange: (strokes: EraserStroke[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  rotation: number;
  flipH: boolean;
}

export const EraserCanvasOverlay: React.FC<EraserCanvasOverlayProps> = ({
  isActive,
  mode,
  brushSize,
  brushSoftness,
  strokes,
  onStrokesChange,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // Render all strokes onto the visible mask canvas
  const redrawMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render mask
    renderMaskToCanvas(ctx, canvas.width, canvas.height, strokes);
  }, [strokes]);

  // Adjust canvas resolution when container changes size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width * 2); // 2x for retina crispness
        canvas.height = Math.round(rect.height * 2);
        redrawMask();
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef, redrawMask]);

  // Redraw whenever strokes change
  useEffect(() => {
    redrawMask();
  }, [redrawMask]);

  /* -------------------------------------------------------------
   * POINTER INTERACTIONS WITH BEZIER SMOOTHING
   * ------------------------------------------------------------- */
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isActive) return;
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    isPaintingRef.current = true;
    currentStrokeRef.current = [{ x: xPercent, y: yPercent }];

    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    });

    // Create new stroke
    const newStroke: EraserStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      points: [{ x: xPercent, y: yPercent }],
      size: brushSize,
      softness: brushSoftness,
      mode,
    };

    onStrokesChange([...strokes, newStroke]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setCursorPos({
      x: currentX,
      y: currentY,
      visible: true,
    });

    if (!isPaintingRef.current || !isActive) return;
    e.stopPropagation();

    const xPercent = (currentX / rect.width) * 100;
    const yPercent = (currentY / rect.height) * 100;

    // Add point to stroke
    currentStrokeRef.current.push({ x: xPercent, y: yPercent });

    // Update last stroke in strokes state
    onStrokesChange(
      strokes.map((s, idx) => {
        if (idx === strokes.length - 1) {
          return {
            ...s,
            points: [...currentStrokeRef.current],
          };
        }
        return s;
      })
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      haptics.selection();
    }
  };

  const handlePointerLeave = () => {
    setCursorPos((prev) => ({ ...prev, visible: false }));
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
    }
  };

  if (!isActive) return null;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="absolute inset-0 z-25 pointer-events-auto touch-none cursor-crosshair overflow-hidden"
    >
      {/* Semi-transparent Mask Rendering Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain pointer-events-none opacity-60 mix-blend-screen drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]"
        style={{
          filter: mode === "restore" ? "hue-rotate(180deg)" : "none",
        }}
      />

      {/* Interactive Brush Cursor & Outline */}
      {cursorPos.visible && (
        <div
          className={`absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform duration-75 ease-out shadow-sm flex items-center justify-center ${
            mode === "restore"
              ? "border-cyan-400 bg-cyan-400/20 shadow-cyan-400/50"
              : "border-rose-400 bg-rose-500/25 shadow-rose-500/50"
          }`}
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: `${Math.max(14, brushSize * 1.2)}px`,
            height: `${Math.max(14, brushSize * 1.2)}px`,
          }}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              mode === "restore" ? "bg-cyan-300" : "bg-rose-300"
            }`}
          />
        </div>
      )}
    </div>
  );
};

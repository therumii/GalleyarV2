import React, { useState, useEffect, useRef } from "react";
import { Check, X, Type } from "lucide-react";
import { haptics } from "../../utils/haptics";

interface InlineTextEditModalProps {
  initialText: string;
  isOpen: boolean;
  onCommit: (newText: string) => void;
  onCancel: () => void;
}

export const InlineTextEditModal: React.FC<InlineTextEditModalProps> = ({
  initialText,
  isOpen,
  onCommit,
  onCancel,
}) => {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea height as content grows
  const adjustHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.max(48, Math.min(260, inputRef.current.scrollHeight))}px`;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
          adjustHeight();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialText]);

  useEffect(() => {
    adjustHeight();
  }, [text]);

  if (!isOpen) return null;

  const handleDone = () => {
    haptics.selection();
    onCommit(text.trim() || "Sample Text");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleDone();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in"
      onClick={handleDone}
    >
      {/* Top Bar with Cancel & Done Actions */}
      <div
        className="w-full max-w-lg mx-auto flex items-center justify-between py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Cancel editing"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Type className="w-4 h-4 text-indigo-400" />
          <span>Edit Text</span>
        </div>

        <button
          onClick={handleDone}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
          title="Apply text"
        >
          <Check className="w-4 h-4" />
          <span>Done</span>
        </button>
      </div>

      {/* Center Dynamic Input Box - compact when short, expands with text */}
      <div
        className="w-full flex-1 flex flex-col items-center justify-center my-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex flex-col items-center max-w-[92vw] sm:max-w-md w-auto transition-all">
          <div className="relative w-full min-w-[220px] max-w-full bg-slate-900/95 border-2 border-indigo-500 rounded-3xl p-3.5 shadow-2xl flex items-center justify-center">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your text..."
              rows={1}
              className="w-full min-h-[44px] bg-transparent text-center text-xl sm:text-2xl font-bold text-white placeholder-slate-500 focus:outline-none resize-none overflow-y-auto leading-relaxed"
            />
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-3 font-medium">
            Press <span className="text-slate-200 font-semibold">Done</span> or tap outside to finish
          </p>
        </div>
      </div>

      {/* Bottom spacer for soft keyboard */}
      <div className="h-6" />
    </div>
  );
};

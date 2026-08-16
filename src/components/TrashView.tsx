import React from "react";
import { Trash2, RotateCcw, XCircle, AlertTriangle } from "lucide-react";
import { Photo } from "../types";

interface TrashViewProps {
  trashPhotos: Photo[];
  onRestorePhoto: (photoId: string) => void;
  onPermanentDelete: (photoId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({
  trashPhotos,
  onRestorePhoto,
  onPermanentDelete,
  onEmptyTrash,
}) => {
  return (
    <div className="p-4 sm:p-6 space-y-6 pb-28 sm:pb-32">
      {/* Trash Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            <span>Recently Deleted</span>
            <span className="text-xs font-normal text-slate-400">
              ({trashPhotos.length} items)
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Items in trash will be permanently deleted after 30 days
          </p>
        </div>

        {trashPhotos.length > 0 && (
          <button
            onClick={onEmptyTrash}
            className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/30 flex items-center gap-1.5 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {trashPhotos.length === 0 ? (
        <div className="text-center py-16 text-slate-500 space-y-2">
          <Trash2 className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-xs font-semibold text-slate-300">
            Trash is Empty
          </p>
          <p className="text-[11px] text-slate-500">
            Deleted photos will appear here before being permanently removed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {trashPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col justify-between"
            >
              <img
                src={photo.url}
                alt={photo.title}
                className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent p-3 flex flex-col justify-end gap-2">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {photo.title}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRestorePhoto(photo.id)}
                    className="flex-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => onPermanentDelete(photo.id)}
                    className="py-1 px-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-bold border border-red-500/30 cursor-pointer"
                    title="Delete permanently"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

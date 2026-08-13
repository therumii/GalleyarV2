import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Users, User, Heart, ChevronRight, Edit3, X, Sparkles, ArrowLeft } from "lucide-react";
import { PersonCluster, Photo } from "../types";

interface PeopleViewProps {
  people: PersonCluster[];
  photos: Photo[];
  onOpenPhoto: (photo: Photo, photosList?: Photo[]) => void;
  onUpdatePersonName: (personId: string, newName: string) => void;
  selectedPersonIdProp?: string | null;
  onSelectPerson?: (personId: string | null) => void;
}

export interface PeopleViewRef {
  handleBack: () => boolean;
}

export const PeopleView = forwardRef<PeopleViewRef, PeopleViewProps>(({
  people = [],
  photos = [],
  onOpenPhoto,
  onUpdatePersonName,
  selectedPersonIdProp,
  onSelectPerson,
}, ref) => {
  const [internalSelectedPersonId, setInternalSelectedPersonId] = useState<string | null>(null);
  const selectedPersonId = selectedPersonIdProp !== undefined ? selectedPersonIdProp : internalSelectedPersonId;

  const handleSetSelectedPersonId = (id: string | null) => {
    setInternalSelectedPersonId(id);
    if (onSelectPerson) {
      onSelectPerson(id);
    }
  };

  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState("");

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (editingPersonId) {
        setEditingPersonId(null);
        return true;
      }
      if (selectedPersonId) {
        handleSetSelectedPersonId(null);
        return true;
      }
      return false;
    },
  }));

  const selectedPerson = people.find((p) => p.id === selectedPersonId);

  // Photos tagged with this person
  const personPhotos = selectedPerson
    ? photos.filter((p) =>
        p.people?.some((tagged) => tagged.id === selectedPerson.id || tagged.name?.toLowerCase() === selectedPerson.name.toLowerCase())
      )
    : [];

  const handleSaveName = (personId: string) => {
    if (editNameInput.trim()) {
      onUpdatePersonName(personId, editNameInput.trim());
      setEditingPersonId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {selectedPerson ? (
        <div className="space-y-6 animate-fade-in">
          {/* Person Header */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleSetSelectedPersonId(null)}
                className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                ← Back
              </button>

              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-500 shadow-lg">
                <img
                  src={selectedPerson.coverPhotoUrl}
                  alt={selectedPerson.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  {selectedPerson.name}
                  {selectedPerson.relationship && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedPerson.relationship}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tagged in {personPhotos.length} photo{personPhotos.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Person Photos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {personPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => onOpenPhoto(photo, personPhotos)}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-indigo-500 transition-all cursor-pointer"
              >
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                  <p className="text-xs font-semibold text-slate-100 truncate">
                    {photo.title}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {photo.location.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>People & Pets</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Face Tagged
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                AI auto-clustered faces with custom name labels and relationship memories
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {people.map((person) => {
              const count = photos.filter((p) =>
                p.people.some((tagged) => tagged.id === person.id || tagged.name.toLowerCase() === person.name.toLowerCase())
              ).length;

              const isEditing = editingPersonId === person.id;

              return (
                <div
                  key={person.id}
                  onClick={() => {
                    if (!isEditing) handleSetSelectedPersonId(person.id);
                  }}
                  className="group rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/60 p-5 flex flex-col items-center text-center space-y-3 transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1"
                >
                  {/* Face Circle Thumbnail */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-indigo-400 transition-colors shadow-inner relative">
                    <img
                      src={person.coverPhotoUrl}
                      alt={person.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  <div className="w-full space-y-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editNameInput}
                          onChange={(e) => setEditNameInput(e.target.value)}
                          className="bg-slate-950 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-white text-center w-full"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveName(person.id)}
                          className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {person.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPersonId(person.id);
                            setEditNameInput(person.name);
                          }}
                          className="text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {person.relationship && (
                      <p className="text-[11px] font-medium text-indigo-400">
                        {person.relationship}
                      </p>
                    )}

                    <p className="text-[10px] text-slate-400">
                      {count} photo{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

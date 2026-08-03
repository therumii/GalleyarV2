import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Play,
  X,
  Music,
  Plus,
  Compass,
} from "lucide-react";
import { MemoryStory, Photo } from "../types";
import { generateStoryWithAI } from "../services/api";

interface MemoriesViewProps {
  stories: MemoryStory[];
  photos: Photo[];
  onAddStory: (newStory: MemoryStory) => void;
  onOpenPhoto: (photo: Photo) => void;
}

export const MemoriesView: React.FC<MemoriesViewProps> = ({
  stories = [],
  photos = [],
  onAddStory,
  onOpenPhoto,
}) => {
  const [activeStory, setActiveStory] = useState<MemoryStory | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [storyAnimClass, setStoryAnimClass] = useState<string>("");
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Active story photos
  const activePhotos = activeStory
    ? photos.filter((p) => activeStory.photoIds?.includes(p.id))
    : [];

  const handleNextStory = () => {
    if (!activeStory || stories.length === 0) return;
    const currentIdx = stories.findIndex((s) => s.id === activeStory.id);
    if (currentIdx < stories.length - 1) {
      setStoryAnimClass("animate-story-next");
      setActiveStory(stories[currentIdx + 1]);
      setCurrentSlideIndex(0);
      setProgress(0);
    } else {
      // Last story boundary: Bounce feedback
      setStoryAnimClass("animate-story-bounce-next");
      setTimeout(() => setStoryAnimClass(""), 400);
    }
  };

  const handlePrevStory = () => {
    if (!activeStory || stories.length === 0) return;
    const currentIdx = stories.findIndex((s) => s.id === activeStory.id);
    if (currentIdx > 0) {
      setStoryAnimClass("animate-story-prev");
      setActiveStory(stories[currentIdx - 1]);
      setCurrentSlideIndex(0);
      setProgress(0);
    } else {
      // First story boundary: Bounce feedback
      setStoryAnimClass("animate-story-bounce-prev");
      setTimeout(() => setStoryAnimClass(""), 400);
    }
  };

  const handleTapRight = () => {
    if (currentSlideIndex < activePhotos.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      handleNextStory();
    }
  };

  const handleTapLeft = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      // At first photo, tapping left can attempt prev story or remain at start
      handlePrevStory();
    }
  };

  // 8-second slideshow timer per photo with smooth progress
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const SLIDE_DURATION = 8000; // 8 seconds per photo
    const TICK_INTERVAL = 50; // update state every 50ms for smooth bar fill

    if (isPlaying && activePhotos.length > 0 && activeStory) {
      timer = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (TICK_INTERVAL / SLIDE_DURATION) * 100;
          if (next >= 100) {
            handleTapRight();
            return 0;
          }
          return next;
        });
      }, TICK_INTERVAL);
    }

    return () => clearInterval(timer);
  }, [isPlaying, activePhotos.length, currentSlideIndex, activeStory, stories]);

  // Lock body scroll when story player is open
  useEffect(() => {
    if (activeStory) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [activeStory]);

  // Touch & Mouse Swipe Handlers for story swiping
  const handleStart = (clientX: number, clientY: number) => {
    setDragStart({ x: clientX, y: clientY });
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!dragStart) return;
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      setDragOffset({ x: deltaX, y: 0 });
    } else {
      setDragOffset({ x: deltaX, y: deltaY > 0 ? deltaY : 0 });
    }
  };

  const handleEnd = (clientX: number, clientY: number) => {
    if (!dragStart) return;
    const deltaX = dragStart.x - clientX;
    const deltaY = dragStart.y - clientY;

    // Swipe down to close story (dragOffset.y > 50)
    if (dragOffset.y > 50 && Math.abs(dragOffset.y) > Math.abs(dragOffset.x)) {
      setActiveStory(null);
      setIsPlaying(false);
      setDragStart(null);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    // Minimum swipe threshold of 30px for horizontal story switching
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      if (deltaX > 0) {
        // Swiped Right-to-Left (Swipe Left) -> Next Story
        handleNextStory();
      } else {
        // Swiped Left-to-Right (Swipe Right) -> Previous Story
        handlePrevStory();
      }
    }
    setDragStart(null);
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleOpenStory = (story: MemoryStory) => {
    setActiveStory(story);
    setCurrentSlideIndex(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const handleCreateAIStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;

    setIsGenerating(true);

    const randomPhotoSet = photos.slice(0, 5);
    const photoTitles = randomPhotoSet.map((p) => p.title);

    const result = await generateStoryWithAI(customTopic, photoTitles);

    if (result) {
      const newStory: MemoryStory = {
        id: `story-${Date.now()}`,
        title: result.title || customTopic,
        subtitle: result.subtitle || "AI Curated Story",
        narrative: result.narrative || "A beautiful memory reel curated by AI.",
        soundtrack: result.soundtrack || "Acoustic Melody",
        dateRange: "2026 Collection",
        coverPhotoUrl: randomPhotoSet[0]?.url || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        photoIds: randomPhotoSet.map((p) => p.id),
        palette: result.palette || ["#e3a857", "#2e5d88", "#f4d0a5"],
      };

      onAddStory(newStory);
      setShowPromptModal(false);
      setCustomTopic("");
      handleOpenStory(newStory);
    } else {
      alert("Could not generate story right now. Please try again!");
    }

    setIsGenerating(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Top Banner & AI Generator Button */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Apple & Samsung Memory Reels
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            Memories
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Auto-curated emotional story reels with cinematic transitions, music mood ambience, and narrative captions.
          </p>
        </div>

        <button
          onClick={() => setShowPromptModal(true)}
          className="z-10 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Generate AI Story Reel</span>
        </button>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story) => (
          <div
            key={story.id}
            onClick={() => handleOpenStory(story)}
            className="group relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/80 hover:border-indigo-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1"
          >
            {/* Story Cover Image */}
            <div className="aspect-[4/5] w-full relative overflow-hidden">
              <img
                src={story.coverPhotoUrl}
                alt={story.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

              {/* Top Soundtrack Badge */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[10px] font-bold text-indigo-300 flex items-center gap-1.5">
                <Music className="w-3 h-3 text-indigo-400" />
                <span>{story.soundtrack}</span>
              </div>

              {/* Play Button Icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-xl backdrop-blur-md transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-6 h-6 fill-white ml-1" />
                </div>
              </div>

              {/* Bottom Content overlay */}
              <div className="absolute bottom-0 inset-x-0 p-5 space-y-2">
                <p className="text-[10px] font-bold tracking-wider uppercase text-amber-400">
                  {story.subtitle}
                </p>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {story.title}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {story.narrative}
                </p>

                {/* Palette Dots */}
                <div className="flex items-center gap-1.5 pt-1">
                  {story.palette?.map((color, cIdx) => (
                    <span
                      key={cIdx}
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: color }}
                    ></span>
                  ))}
                  <span className="text-[10px] text-slate-400 ml-auto font-medium">
                    {story.photoIds.length} photos
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Story Reel Player */}
      {activeStory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in transition-colors duration-150"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{
            backgroundColor:
              dragOffset.y > 0
                ? `rgba(2, 6, 23, ${Math.max(0.15, 0.95 - dragOffset.y / 400)})`
                : "rgba(2, 6, 23, 0.95)",
            backdropFilter:
              dragOffset.y > 0
                ? `blur(${Math.max(2, 24 - dragOffset.y / 15)}px)`
                : "blur(24px)",
            WebkitBackdropFilter:
              dragOffset.y > 0
                ? `blur(${Math.max(2, 24 - dragOffset.y / 15)}px)`
                : "blur(24px)",
          }}
        >
          {/* Vertical Story Frame Container with Swipe & Tap Support */}
          <div
            key={activeStory.id}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleEnd(
                e.changedTouches[0].clientX,
                e.changedTouches[0].clientY
              );
            }}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={(e) => handleEnd(e.clientX, e.clientY)}
            style={{
              transform:
                dragOffset.y > 0 && dragOffset.y > Math.abs(dragOffset.x)
                  ? `translate3d(${dragOffset.x * 0.4}px, ${dragOffset.y}px, 0) scale(${Math.max(
                      0.35,
                      1 - dragOffset.y / 500
                    )}) rotate(${dragOffset.x * 0.03}deg)`
                  : dragOffset.x !== 0
                  ? `translate3d(${dragOffset.x}px, 0, 0)`
                  : undefined,
              opacity: dragOffset.y > 0 && dragOffset.y > Math.abs(dragOffset.x) ? Math.max(0.25, 1 - dragOffset.y / 350) : 1,
              transition: isDragging
                ? "none"
                : "all 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
            className={`relative w-full max-w-[400px] aspect-[9/16] max-h-[88vh] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col justify-between select-none cursor-grab active:cursor-grabbing ${storyAnimClass}`}
          >
            {/* Story Image */}
            {activePhotos.length > 0 && (
              <img
                key={activePhotos[currentSlideIndex]?.id || currentSlideIndex}
                src={
                  activePhotos[currentSlideIndex]?.highResUrl ||
                  activePhotos[currentSlideIndex]?.url
                }
                alt="Story slide"
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              />
            )}

            {/* Top Story Header & Photo Indicator Bars */}
            <div className="absolute top-0 inset-x-0 z-20 p-3 pt-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex flex-col gap-2">
              {/* Photo Indicator Bar (Grey background highlighting to RED with 8s timer) */}
              <div className="flex items-center gap-1.5 w-full">
                {activePhotos.map((_, idx) => (
                  <div
                    key={idx}
                    className="h-1 flex-1 rounded-full bg-slate-700/80 overflow-hidden"
                  >
                    <div
                      className="h-full bg-red-500 transition-all duration-75 linear"
                      style={{
                        width:
                          idx < currentSlideIndex
                            ? "100%"
                            : idx === currentSlideIndex
                            ? `${progress}%`
                            : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Story Title & Close Button */}
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-600/90 text-amber-300 text-xs font-bold flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    <span>{activeStory.title}</span>
                  </span>
                  <span className="text-[11px] text-slate-200 font-medium truncate max-w-[130px]">
                    {activeStory.subtitle}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStory(null);
                    setIsPlaying(false);
                  }}
                  className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-slate-200 hover:text-white transition-all cursor-pointer z-30"
                  title="Close Story"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Left Tap Zone - Previous Image in Story */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleTapLeft();
              }}
              className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
              title="Tap left for previous image"
            />

            {/* Right Tap Zone - Next Image in Story */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleTapRight();
              }}
              className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
              title="Tap right for next image"
            />

            {/* Story Bottom Narrative Overlay */}
            {activePhotos.length > 0 && (
              <div className="absolute bottom-4 inset-x-4 z-20 p-3.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 text-center space-y-1 shadow-2xl pointer-events-none">
                <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                  {activeStory.soundtrack}
                </p>
                <p className="text-xs font-semibold text-slate-100 line-clamp-2">
                  "{activeStory.narrative}"
                </p>
                <p className="text-[10px] text-slate-400">
                  {activePhotos[currentSlideIndex]?.title} • {activePhotos[currentSlideIndex]?.location?.name}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate Custom AI Story Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Create AI Memory Story</span>
              </h3>
              <button
                onClick={() => setShowPromptModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAIStory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Story Theme / Topic
                </label>
                <input
                  type="text"
                  required
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Weekend Coffee & Bakery Crawl, Summer Beach Trips, Pets Being Silly"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Gemini will generate a story title, emotional summary, soundtrack recommendation, and color theme.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin">🌀</span>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Generate Reel</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

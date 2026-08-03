import React, { useState } from "react";
import { MapPin, Globe, Compass, Navigation, Camera, ChevronRight } from "lucide-react";
import { Photo } from "../types";

interface PlacesMapViewProps {
  photos: Photo[];
  onOpenPhoto: (photo: Photo) => void;
}

export const PlacesMapView: React.FC<PlacesMapViewProps> = ({
  photos = [],
  onOpenPhoto,
}) => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Group photos by City/Country
  const locationGroupsMap: {
    [city: string]: {
      country: string;
      lat: number;
      lng: number;
      photos: Photo[];
    };
  } = {};

  photos.forEach((p) => {
    const cityKey = p.location?.city || "Unknown Location";
    if (!locationGroupsMap[cityKey]) {
      locationGroupsMap[cityKey] = {
        country: p.location?.country || "Unknown Country",
        lat: p.location?.lat || 0,
        lng: p.location?.lng || 0,
        photos: [],
      };
    }
    locationGroupsMap[cityKey].photos.push(p);
  });

  const cityList = Object.keys(locationGroupsMap).map((city) => ({
    city,
    ...locationGroupsMap[city],
  }));

  const activePhotos = selectedCity
    ? locationGroupsMap[selectedCity]?.photos || []
    : photos;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Geotag Map Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" />
              GPS Geotagged Locations
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            Places & World Trip Map
          </h2>
          <p className="text-xs text-slate-400">
            Explore your memories mapped across global destinations
          </p>
        </div>

        {selectedCity && (
          <button
            onClick={() => setSelectedCity(null)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium cursor-pointer"
          >
            Show All Destinations
          </button>
        )}
      </div>

      {/* Visual Destinations Cluster Bar */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {cityList.map((item) => {
          const isSelected = selectedCity === item.city;
          const coverPhoto = item.photos[0];

          return (
            <div
              key={item.city}
              onClick={() => setSelectedCity(isSelected ? null : item.city)}
              className={`flex-shrink-0 w-52 p-3 rounded-2xl bg-slate-900 border transition-all duration-300 cursor-pointer flex items-center gap-3 ${
                isSelected
                  ? "border-emerald-500 bg-emerald-950/20 shadow-lg ring-1 ring-emerald-500"
                  : "border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0">
                <img
                  src={coverPhoto?.url}
                  alt={item.city}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-slate-100 truncate">
                  {item.city}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">
                  {item.country}
                </p>
                <span className="text-[10px] font-semibold text-emerald-400">
                  {item.photos.length} photos
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Simulation Graphic Canvas */}
      <div className="relative w-full h-64 sm:h-80 rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
        {/* World Map Grid SVG Background */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-500 animate-spin-slow" />
            Interactive Geotag Pin Grid
          </p>
        </div>

        {/* Map Pins overlay */}
        <div className="absolute inset-0 p-8 grid grid-cols-3 sm:grid-cols-4 gap-4 pointer-events-none">
          {cityList.slice(0, 6).map((item, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCity(item.city);
              }}
              className="pointer-events-auto justify-self-center self-center flex flex-col items-center group cursor-pointer"
            >
              <div className="relative p-1 rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-xl group-hover:scale-110 transition-transform">
                <div className="w-10 h-10 rounded-xl overflow-hidden">
                  <img
                    src={item.photos[0]?.url}
                    alt={item.city}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 flex items-center justify-center">
                  {item.photos.length}
                </div>
              </div>

              <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/90 text-[10px] font-semibold text-slate-200 border border-slate-800 shadow-sm flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                <span>{item.city}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Geotagged Photos Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>
            {selectedCity ? `Photos in ${selectedCity}` : "All Geotagged Photos"}
          </span>
          <span className="text-xs font-normal text-slate-400">
            ({activePhotos.length} items)
          </span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {activePhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => onOpenPhoto(photo)}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-emerald-500 transition-all cursor-pointer"
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
                <p className="text-[10px] text-emerald-300 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {photo.location.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

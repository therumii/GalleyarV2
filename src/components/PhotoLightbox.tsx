import React, { forwardRef } from "react";
import { MediaViewer, MediaViewerRef } from "./MediaViewer";
import { Photo } from "../types";

export interface PhotoLightboxProps {
  photo: Photo | null;
  photosList: Photo[];
  onClose: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onToggleFavorite: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onPermanentDelete?: (photoId: string) => void;
  onUnhidePhoto?: (photoId: string) => void;
  onOpenEditor?: (photo: Photo) => void;
  onAutoEnhance?: (photo: Photo) => void;
}

export const PhotoLightbox = forwardRef<MediaViewerRef, PhotoLightboxProps>((props, ref) => {
  if (!props.photo) return null;

  return (
    <MediaViewer
      ref={ref}
      photo={props.photo}
      photosList={props.photosList}
      onClose={props.onClose}
      onSelectPhoto={props.onSelectPhoto}
      onToggleFavorite={props.onToggleFavorite}
      onDeletePhoto={props.onDeletePhoto}
      onPermanentDelete={props.onPermanentDelete}
      onUnhidePhoto={props.onUnhidePhoto}
      onOpenEditor={props.onOpenEditor}
      onAutoEnhance={props.onAutoEnhance}
    />
  );
});

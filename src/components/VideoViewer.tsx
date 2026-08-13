import React from "react";
import { MediaViewer } from "./MediaViewer";
import { Photo } from "../types";

export interface VideoViewerProps {
  photo: Photo;
  photosList: Photo[];
  onClose: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onToggleFavorite: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onUnhidePhoto?: (photoId: string) => void;
  onOpenEditor?: (photo: Photo) => void;
  onShare?: () => void;
  showInfoPanel?: boolean;
  setShowInfoPanel?: React.Dispatch<React.SetStateAction<boolean>>;
  showOtherOptions?: boolean;
  setShowOtherOptions?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const VideoViewer: React.FC<VideoViewerProps> = (props) => {
  return (
    <MediaViewer
      photo={props.photo}
      photosList={props.photosList}
      onClose={props.onClose}
      onSelectPhoto={props.onSelectPhoto}
      onToggleFavorite={props.onToggleFavorite}
      onDeletePhoto={props.onDeletePhoto}
      onUnhidePhoto={props.onUnhidePhoto}
      onOpenEditor={props.onOpenEditor}
    />
  );
};

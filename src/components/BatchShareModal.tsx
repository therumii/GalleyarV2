import React from "react";
import { Photo } from "../types";
import { UnifiedShareModal } from "./UnifiedShareModal";

export interface BatchShareModalProps {
  isOpen: boolean;
  selectedPhotos: Photo[];
  onClose: () => void;
  onShowToast: (message: string) => void;
  title?: string;
}

export const BatchShareModal: React.FC<BatchShareModalProps> = ({
  isOpen,
  selectedPhotos,
  onClose,
  onShowToast,
  title,
}) => {
  if (!isOpen || selectedPhotos.length === 0) return null;

  return (
    <UnifiedShareModal
      isOpen={isOpen}
      onClose={onClose}
      photos={selectedPhotos}
      title={title}
      onShowToast={onShowToast}
    />
  );
};

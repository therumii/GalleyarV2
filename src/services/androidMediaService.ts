/**
 * Galleyar — Android Device Media Integration Service
 * Delegates to GalleyarMediaRepository
 */

import { galleyarMediaRepository, GalleyarMediaRepository, AndroidPermissionState, AndroidMediaItemRaw, PermissionExplanationInfo } from "./galleyarMediaRepository";
import { Photo, Album } from "../types";

export type { AndroidPermissionState, AndroidMediaItemRaw, PermissionExplanationInfo };
export { GalleyarMediaRepository };

export class AndroidMediaService {
  public getPermissionState(): AndroidPermissionState {
    return galleyarMediaRepository.getPermissionState();
  }

  public isAndroidEnvironment(): boolean {
    return galleyarMediaRepository.isAndroidEnvironment();
  }

  public getAndroidPermissionDetails(): PermissionExplanationInfo {
    return galleyarMediaRepository.getAndroidPermissionDetails();
  }

  public requestPermissions() {
    return galleyarMediaRepository.requestPermissions();
  }

  public setPermissionState(state: AndroidPermissionState) {
    galleyarMediaRepository.setPermissionState(state);
  }

  public queryDeviceMedia(): Promise<Photo[]> {
    return galleyarMediaRepository.queryAllMedia();
  }

  public deleteMediaItem(photoId: string): Promise<boolean> {
    return galleyarMediaRepository.deleteMedia(photoId);
  }

  public saveEditedMedia(blob: Blob, originalPhoto: Photo, isCopy: boolean): Promise<Photo> {
    return galleyarMediaRepository.saveEditedMedia(blob, originalPhoto, isCopy);
  }

  public toggleFavorite(photoId: string, currentStatus: boolean): boolean {
    return galleyarMediaRepository.toggleFavorite(photoId, currentStatus);
  }

  public applyFavorites(photos: Photo[]): Photo[] {
    return galleyarMediaRepository.applyFavorites(photos);
  }

  public generateDynamicAlbums(photos: Photo[]): Album[] {
    return galleyarMediaRepository.generateDynamicAlbums(photos);
  }

  public importDeviceFiles(files: FileList | File[]) {
    return galleyarMediaRepository.importDeviceFiles(files);
  }

  public subscribeMediaChanges(callback: () => void): () => void {
    return galleyarMediaRepository.subscribeMediaChanges(callback);
  }
}

export const androidMediaService = new AndroidMediaService();

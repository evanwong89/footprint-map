import type { FootprintIssue, FootprintVisit } from "../core/domain";
import { warning } from "../core/errors";
import { clusterPhotoVisits, DEFAULT_PHOTO_CLUSTER_METERS } from "../core/cluster-photo-visits";
import { stableId } from "../core/stable-id";
import type { PhotoMetadataReader } from "../metadata/photo-metadata-reader";

export interface PhotoInput {
  path: string;
  bytes: ArrayBuffer | Uint8Array;
}

export interface PhotoGenerationResult {
  visits: readonly FootprintVisit[];
  issues: readonly FootprintIssue[];
}

export const generateFromPhotos = async (
  photos: readonly PhotoInput[],
  reader: PhotoMetadataReader,
  clusterMeters = DEFAULT_PHOTO_CLUSTER_METERS,
): Promise<PhotoGenerationResult> => {
  const visits: FootprintVisit[] = [];
  const issues: FootprintIssue[] = [];
  for (const photo of photos) {
    try {
      const metadata = await reader.read(photo.bytes);
      visits.push({
        id: stableId(`${photo.path}\0${metadata.capturedAt}`),
        observedAt: metadata.capturedAt,
        timeConfidence: "exact-offset",
        coordinates: { longitude: metadata.longitude, latitude: metadata.latitude },
        photos: [{ path: photo.path, capturedAt: metadata.capturedAt, isPrimary: true }],
        source: "photo-exif",
      });
    } catch (error) {
      issues.push(
        warning(
          "FM_PHOTO_IMPORT_FAILED",
          `${photo.path}: ${error instanceof Error ? error.message : String(error)}`,
          { path: photo.path },
        ),
      );
    }
  }
  return { visits: clusterPhotoVisits(visits, clusterMeters), issues };
};

export const mergeGeneratedVisits = (
  existing: readonly FootprintVisit[],
  generated: readonly FootprintVisit[],
): FootprintVisit[] => {
  return [...existing.filter(({ source }) => source !== "photo-exif"), ...generated];
};

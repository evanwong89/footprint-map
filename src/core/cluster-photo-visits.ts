import type { FootprintVisit } from "./domain";
import { distanceMeters } from "./distance-meters";
import { sortVisits } from "./sort-visits";

export const DEFAULT_PHOTO_CLUSTER_METERS = 200;

export const clusterPhotoVisits = (
  visits: readonly FootprintVisit[],
  thresholdMeters = DEFAULT_PHOTO_CLUSTER_METERS,
): FootprintVisit[] => {
  const ordered = sortVisits(visits);
  const clustered: FootprintVisit[] = [];
  for (const visit of ordered) {
    const anchor = clustered.at(-1);
    if (
      anchor?.source === "photo-exif" &&
      visit.source === "photo-exif" &&
      distanceMeters(anchor.coordinates, visit.coordinates) <= thresholdMeters
    ) {
      clustered[clustered.length - 1] = {
        ...anchor,
        photos: [...anchor.photos, ...visit.photos],
      };
    } else {
      clustered.push(visit);
    }
  }
  return clustered;
};

import type { FootprintDocument } from "./domain";
import { sortVisits } from "./sort-visits";

export const serializeFootprintGeoJson = (document: FootprintDocument): Record<string, unknown> => ({
  type: "FeatureCollection",
  footprintMap: {
    schemaVersion: document.schemaVersion,
    ...(document.title ? { title: document.title } : {}),
    timezone: document.timezone,
    createdAt: document.createdAt,
  },
  features: sortVisits(document.visits).map((visit) => ({
    type: "Feature",
    id: visit.id,
    geometry: {
      type: "Point",
      coordinates: [visit.coordinates.longitude, visit.coordinates.latitude],
    },
    properties: {
      kind: "visit",
      observedAt: visit.observedAt,
      timeConfidence: visit.timeConfidence,
      ...(visit.label ? { label: visit.label } : {}),
      ...(visit.note ? { note: visit.note } : {}),
      ...(visit.period ? { period: visit.period } : {}),
      source: visit.source,
      photos: visit.photos,
    },
  })),
});

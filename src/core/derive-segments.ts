import type { FootprintVisit, SequenceSegment } from "./domain";

const sameCoordinates = (left: FootprintVisit, right: FootprintVisit): boolean =>
  left.coordinates.longitude === right.coordinates.longitude &&
  left.coordinates.latitude === right.coordinates.latitude;

export const deriveSegments = (visits: readonly FootprintVisit[]): SequenceSegment[] => {
  const segments: SequenceSegment[] = [];
  for (let index = 1; index < visits.length; index += 1) {
    const from = visits[index - 1];
    const to = visits[index];
    if (!from || !to || sameCoordinates(from, to)) continue;
    segments.push({
      fromId: from.id,
      toId: to.id,
      from: from.coordinates,
      to: to.coordinates,
    });
  }
  return segments;
};

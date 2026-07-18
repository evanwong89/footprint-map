import type { FootprintDocument, FootprintIssue, FootprintViewModel } from "./domain";
import { derivePeriod } from "./derive-period";
import { deriveSegments } from "./derive-segments";
import { sortVisits } from "./sort-visits";

const formatDisplayTime = (observedAt: string): string => {
  const match = observedAt.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/);
  return match?.[1] ?? observedAt;
};

export const buildViewModel = (
  document: FootprintDocument,
  issues: readonly FootprintIssue[] = [],
): FootprintViewModel => {
  const ordered = sortVisits(document.visits);
  const visits = ordered.map((visit, index) => ({
    ...visit,
    sequence: index + 1,
    displayTime: formatDisplayTime(visit.observedAt),
    displayPeriod: visit.period ?? derivePeriod(visit.observedAt),
  }));
  return {
    title: document.title ?? "Daily footprint",
    visits,
    segments: deriveSegments(visits),
    issues,
  };
};

import type { FootprintVisit } from "./domain";

export const sortVisits = (visits: readonly FootprintVisit[]): FootprintVisit[] =>
  [...visits].sort((left, right) => {
    const timeDifference = Date.parse(left.observedAt) - Date.parse(right.observedAt);
    return timeDifference || left.id.localeCompare(right.id);
  });

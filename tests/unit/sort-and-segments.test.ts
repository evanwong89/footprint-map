import { describe, expect, it } from "vitest";
import type { FootprintVisit } from "../../src/core/domain";
import { deriveSegments } from "../../src/core/derive-segments";
import { sortVisits } from "../../src/core/sort-visits";

const makeVisit = (id: string, observedAt: string, longitude: number, latitude: number): FootprintVisit => ({
  id,
  observedAt,
  timeConfidence: "manual",
  coordinates: { longitude, latitude },
  photos: [],
  source: "manual",
});

describe("visit chronology", () => {
  it("sorts by instant, then stable id", () => {
    const time = "2026-07-17T09:00:00+08:00";
    const result = sortVisits([
      makeVisit("b", time, 2, 2),
      makeVisit("later", "2026-07-17T10:00:00+08:00", 3, 3),
      makeVisit("a", time, 1, 1),
    ]);
    expect(result.map(({ id }) => id)).toEqual(["a", "b", "later"]);
  });

  it("does not create zero-length arrows", () => {
    const visits = [
      makeVisit("a", "2026-07-17T09:00:00+08:00", 1, 1),
      makeVisit("b", "2026-07-17T10:00:00+08:00", 1, 1),
      makeVisit("c", "2026-07-17T11:00:00+08:00", 2, 2),
    ];
    expect(deriveSegments(visits)).toHaveLength(1);
    expect(deriveSegments(visits)[0]).toMatchObject({ fromId: "b", toId: "c" });
  });
});

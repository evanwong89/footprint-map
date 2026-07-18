import { describe, expect, it } from "vitest";
import { validateFootprintGeoJson } from "../../src/core/validate-footprint";

const metadata = {
  schemaVersion: "1.0",
  timezone: "Asia/Shanghai",
  createdAt: "2026-07-17T20:00:00+08:00",
};

const visit = (id: string, coordinates: unknown = [121.47, 31.23], observedAt = "2026-07-17T09:00:00+08:00") => ({
  type: "Feature",
  id,
  geometry: { type: "Point", coordinates },
  properties: {
    kind: "visit",
    observedAt,
    timeConfidence: "manual",
    source: "manual",
    photos: [],
  },
});

describe("validateFootprintGeoJson", () => {
  it("maps valid GeoJSON coordinates into the domain model", () => {
    const result = validateFootprintGeoJson({ type: "FeatureCollection", footprintMap: metadata, features: [visit("one")] });
    expect(result.document?.visits[0]?.coordinates).toEqual({ longitude: 121.47, latitude: 31.23 });
    expect(result.issues).toEqual([]);
  });

  it("keeps valid visits when another feature is invalid", () => {
    const result = validateFootprintGeoJson({
      type: "FeatureCollection",
      footprintMap: metadata,
      features: [visit("bad", [181, 0]), visit("good")],
    });
    expect(result.document?.visits.map(({ id }) => id)).toEqual(["good"]);
    expect(result.issues.some(({ code }) => code === "FM_VISIT_INVALID_COORDINATES")).toBe(true);
  });

  it("rejects timestamps without an explicit timezone", () => {
    const result = validateFootprintGeoJson({
      type: "FeatureCollection",
      footprintMap: metadata,
      features: [visit("bad-time", [121, 31], "2026-07-17T09:00:00")],
    });
    expect(result.document).toBeUndefined();
    expect(result.issues.map(({ code }) => code)).toContain("FM_VISIT_INVALID_TIME");
  });
});

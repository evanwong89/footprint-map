import { describe, expect, it } from "vitest";
import type { FootprintViewModel } from "../../src/core/domain";
import { convertCoordinates, wgs84ToGcj02 } from "../../src/renderer/amap-coordinate-conversion";

describe("AMap coordinate conversion", () => {
  it("converts mainland WGS84 coordinates to GCJ-02 locally", () => {
    const [longitude, latitude] = wgs84ToGcj02(116.397128, 39.916527);
    expect(longitude).toBeCloseTo(116.403372, 5);
    expect(latitude).toBeCloseTo(39.917931, 5);
  });

  it("does not offset coordinates outside mainland China", () => {
    expect(wgs84ToGcj02(-0.1276, 51.5072)).toEqual([-0.1276, 51.5072]);
  });

  it("maps every visit by id without calling an online conversion service", () => {
    const visits = Array.from({ length: 41 }, (_, index) => ({
      id: `visit-${index}`,
      sequence: index + 1,
      observedAt: "2026-07-17T09:00:00+08:00",
      timeConfidence: "manual" as const,
      coordinates: { longitude: 100 + index / 100, latitude: 20 },
      photos: [],
      source: "manual" as const,
      displayTime: "09:00",
      displayPeriod: "morning" as const,
    }));
    const model: FootprintViewModel = { title: "test", visits, segments: [], issues: [] };
    const converted = convertCoordinates(model);
    expect(converted.size).toBe(41);
    expect(converted.get("visit-40")?.[0]).toBeGreaterThan(100.4);
  });
});

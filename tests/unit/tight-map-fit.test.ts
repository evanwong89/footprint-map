import { describe, expect, it } from "vitest";
import { calculateTightMapFit } from "../../src/renderer/tight-map-fit";

const markerInsets = {
  left: 34,
  right: 43,
  top: 96,
  bottom: 4,
};

describe("tight map fit", () => {
  it("chooses the closest supported zoom that keeps complete photo cards visible", () => {
    const result = calculateTightMapFit({
      points: [{ x: 0, y: 0 }, { x: 80, y: 40 }],
      viewport: { width: 250, height: 250 },
      minimumZoom: 2,
      maximumZoom: 4,
      zoomStep: 0.25,
      markerInsets,
      project: (point, zoom) => ({
        x: point.x * (2 ** (zoom - 2)),
        y: point.y * (2 ** (zoom - 2)),
      }),
    });

    expect(result?.zoom).toBe(3);
    expect(result?.center).toEqual({ x: 84.5, y: -6 });
  });

  it("uses a fractional zoom instead of dropping a full AMap level", () => {
    const result = calculateTightMapFit({
      points: [{ x: 0, y: 0 }, { x: 50, y: 20 }],
      viewport: { width: 250, height: 250 },
      minimumZoom: 2,
      maximumZoom: 4,
      zoomStep: 0.25,
      markerInsets,
      project: (point, zoom) => ({
        x: point.x * (2 ** (zoom - 2)),
        y: point.y * (2 ** (zoom - 2)),
      }),
    });

    expect(result?.zoom).toBe(3.75);
  });

  it("returns no fit for empty input or an unusable viewport", () => {
    const base = {
      points: [] as Array<{ x: number; y: number }>,
      viewport: { width: 250, height: 250 },
      minimumZoom: 2,
      maximumZoom: 4,
      zoomStep: 0.25,
      markerInsets,
      project: (point: { x: number; y: number }) => point,
    };

    expect(calculateTightMapFit(base)).toBeUndefined();
    expect(calculateTightMapFit({
      ...base,
      points: [{ x: 1, y: 1 }],
      viewport: { width: 0, height: 250 },
    })).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import {
  IDENTITY_PHOTO_ZOOM,
  clampPhotoZoom,
  panPhotoBy,
  zoomPhotoAt,
} from "../../src/renderer/photo-zoom";

const viewport = { width: 100, height: 80 };

describe("photo preview zoom", () => {
  it("zooms around the pointer position", () => {
    expect(zoomPhotoAt(
      IDENTITY_PHOTO_ZOOM,
      2,
      { x: 50, y: 40 },
      viewport,
    )).toEqual({ scale: 2, x: -50, y: -40 });
  });

  it("keeps panning inside the enlarged image bounds", () => {
    const zoomed = { scale: 3, x: -100, y: -80 };

    expect(panPhotoBy(zoomed, { x: 500, y: 500 }, viewport))
      .toEqual({ scale: 3, x: 0, y: 0 });
    expect(panPhotoBy(zoomed, { x: -500, y: -500 }, viewport))
      .toEqual({ scale: 3, x: -200, y: -160 });
  });

  it("limits zoom from one to six times", () => {
    expect(clampPhotoZoom({ scale: 0.2, x: -20, y: -20 }, viewport))
      .toEqual(IDENTITY_PHOTO_ZOOM);
    expect(clampPhotoZoom({ scale: 10, x: -900, y: -900 }, viewport))
      .toEqual({ scale: 6, x: -500, y: -400 });
  });
});

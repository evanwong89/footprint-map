import { describe, expect, it } from "vitest";
import { createLeafletMapOptions } from "../../src/renderer/map-options";

describe("Leaflet map options", () => {
  it("keeps Leaflet wheel and touch handlers available behind the intent gate", () => {
    const options = createLeafletMapOptions(false);

    expect(options.scrollWheelZoom).toBe(true);
    expect(options.touchZoom).toBe(true);
  });

  it("keeps static AMap zoom levels on whole-number steps", () => {
    const options = createLeafletMapOptions(true);

    expect(options.zoomSnap).toBe(1);
    expect(options.minZoom).toBe(2);
    expect(options.maxZoom).toBe(18);
  });
});

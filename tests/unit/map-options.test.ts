import { describe, expect, it } from "vitest";
import { createLeafletMapOptions } from "../../src/renderer/map-options";

describe("Leaflet map options", () => {
  it("keeps Leaflet wheel and touch handlers available behind the intent gate", () => {
    const options = createLeafletMapOptions(false);

    expect(options.scrollWheelZoom).toBe(true);
    expect(options.touchZoom).toBe(true);
  });

  it("allows quarter-step AMap views while keeping the static service in range", () => {
    const options = createLeafletMapOptions(true);

    expect(options.zoomSnap).toBe(0.25);
    expect(options.minZoom).toBe(2);
    expect(options.maxZoom).toBe(18);
  });
});

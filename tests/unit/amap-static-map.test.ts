import { describe, expect, it } from "vitest";
import {
  AMAP_STATIC_MAP_ENDPOINT,
  createAMapStaticMapImage,
} from "../../src/renderer/amap-static-map";

describe("AMap static map requests", () => {
  it("uses the literal Web Service endpoint and scale-adjusted viewport", () => {
    const image = createAMapStaticMapImage({
      key: "example-web-service-key",
      longitude: 102.55123456,
      latitude: 24.35678912,
      leafletZoom: 14,
      viewportWidth: 1400,
      viewportHeight: 840,
    });
    const url = new URL(image.url);

    expect(url.origin + url.pathname).toBe(AMAP_STATIC_MAP_ENDPOINT);
    expect(url.searchParams.get("key")).toBe("example-web-service-key");
    expect(url.searchParams.get("location")).toBe("102.551235,24.356789");
    expect(url.searchParams.get("zoom")).toBe("13");
    expect(url.searchParams.get("size")).toBe("700*420");
    expect(url.searchParams.get("scale")).toBe("2");
  });

  it("clamps the API dimensions and zoom to supported values", () => {
    const image = createAMapStaticMapImage({
      key: "test",
      longitude: 120,
      latitude: 30,
      leafletZoom: 30,
      viewportWidth: 5000,
      viewportHeight: 50,
    });
    const url = new URL(image.url);

    expect(url.searchParams.get("zoom")).toBe("17");
    expect(url.searchParams.get("size")).toBe("1024*64");
  });
});

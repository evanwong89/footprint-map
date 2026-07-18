import { describe, expect, it } from "vitest";
import { resolveCustomTileProvider } from "../../src/platform/tile-provider";

describe("custom tile provider", () => {
  it("builds a provider from a complete configuration", () => {
    expect(resolveCustomTileProvider({
      urlTemplate: "https://tiles.example.com/{z}/{x}/{y}.png",
      attribution: "© Example <Tiles>",
      maxZoom: 18,
    })).toEqual({
      provider: {
        urlTemplate: "https://tiles.example.com/{z}/{x}/{y}.png",
        attribution: "© Example &lt;Tiles&gt;",
        maxZoom: 18,
      },
    });
  });

  it("falls back when required URL placeholders are missing", () => {
    const resolution = resolveCustomTileProvider({
      urlTemplate: "https://tiles.example.com/map.png",
      attribution: "© Example",
      maxZoom: 19,
    });
    expect(resolution.provider).toBeNull();
    expect(resolution.warning).toBe("customTileUrlTokens");
  });

  it("falls back when attribution or max zoom is invalid", () => {
    expect(resolveCustomTileProvider({
      urlTemplate: "https://tiles.example.com/{z}/{x}/{y}.png",
      attribution: "",
      maxZoom: 19,
    }).provider).toBeNull();
    expect(resolveCustomTileProvider({
      urlTemplate: "https://tiles.example.com/{z}/{x}/{y}.png",
      attribution: "© Example",
      maxZoom: 25,
    }).provider).toBeNull();
  });
});

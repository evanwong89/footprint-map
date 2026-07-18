import { describe, expect, it } from "vitest";
import { buildViewModel } from "../../src/core/build-view-model";
import type { FootprintDocument } from "../../src/core/domain";
import { renderStaticSvg } from "../../src/renderer/static-svg-renderer";

describe("static SVG fallback", () => {
  it("renders sequence arrows and escapes untrusted labels", () => {
    const document: FootprintDocument = {
      schemaVersion: "1.0",
      timezone: "Asia/Shanghai",
      createdAt: "2026-07-17T20:00:00+08:00",
      visits: [
        {
          id: "one",
          observedAt: "2026-07-17T09:00:00+08:00",
          timeConfidence: "manual",
          coordinates: { longitude: 121, latitude: 31 },
          label: "<script>alert(1)</script>",
          photos: [],
          source: "manual",
        },
        {
          id: "two",
          observedAt: "2026-07-17T10:00:00+08:00",
          timeConfidence: "manual",
          coordinates: { longitude: 122, latitude: 32 },
          photos: [],
          source: "manual",
        },
      ],
    };
    const svg = renderStaticSvg(buildViewModel(document));
    expect(svg).toContain("marker-end=\"url(#arrow)\"");
    expect(svg).toContain("stroke-width:2");
    expect(svg).toContain('markerWidth="3.5"');
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });
});

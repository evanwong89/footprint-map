import { describe, expect, it } from "vitest";
import { parseCodeBlockConfig } from "../../src/adapters/obsidian/code-block-config";
import { resolveVaultPath } from "../../src/adapters/obsidian/vault-path";

describe("Markdown block config", () => {
  it("clamps height and reports unknown fields", () => {
    const config = parseCodeBlockConfig("source: ../data/day.geojson\nheight: 1200\nfuture: true");
    expect(config.height).toBe(960);
    expect(config.warnings).toHaveLength(1);
  });

  it("accepts the official AMap provider", () => {
    expect(parseCodeBlockConfig("source: day.geojson\ntileProvider: amap").tileProvider).toBe("amap");
    expect(parseCodeBlockConfig("source: day.geojson\ntileProvider: custom").tileProvider).toBe("custom");
    expect(() => parseCodeBlockConfig("source: day.geojson\ntileProvider: unknown")).toThrow("FM_TILE_PROVIDER_INVALID");
  });

  it("resolves unicode and encoded paths relative to the note", () => {
    expect(resolveVaultPath("../照片/午餐%20照片.jpg", "日记/2026/07-17.md")).toBe("日记/照片/午餐 照片.jpg");
  });

  it("rejects traversal beyond the vault root", () => {
    expect(() => resolveVaultPath("../../../secret.jpg", "日记/day.md")).toThrow("FM_PATH_OUTSIDE_VAULT");
  });
});

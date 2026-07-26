import { describe, expect, it } from "vitest";
import {
  createFootprintBlockInsertion,
  positionAfterInsertion,
  positionsEqual,
} from "../../src/adapters/obsidian/markdown-insertion";

describe("Obsidian footprint block insertion", () => {
  it("builds the generated block without assuming the end of the note", () => {
    const insertion = createFootprintBlockInsertion({
      source: "day.footprint.geojson",
      title: "Day footprint",
    });

    expect(insertion).toContain("```footprint-map\n");
    expect(insertion).toContain("source: day.footprint.geojson\n");
    expect(insertion).toContain("height: 420\n");
    expect(insertion).toContain("title: Day footprint\n");
  });

  it("calculates the cursor position after a multiline insertion", () => {
    const insertion = createFootprintBlockInsertion({
      source: "day.footprint.geojson",
      title: "Day footprint",
    });

    expect(positionAfterInsertion({ line: 5, ch: 8 }, insertion)).toEqual({
      line: 12,
      ch: 0,
    });
    expect(positionsEqual({ line: 5, ch: 8 }, { line: 5, ch: 8 })).toBe(true);
    expect(positionsEqual({ line: 5, ch: 8 }, { line: 6, ch: 0 })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { normalizeCapturedAt } from "../../src/metadata/normalize-captured-at";

describe("normalizeCapturedAt", () => {
  it("combines EXIF local time with explicit offset", () => {
    expect(normalizeCapturedAt("2026:07:17 09:20:30", "+0800")).toBe("2026-07-17T09:20:30+08:00");
  });

  it("does not guess when offset is missing", () => {
    expect(normalizeCapturedAt("2026:07:17 09:20:30", undefined)).toBeUndefined();
  });
});

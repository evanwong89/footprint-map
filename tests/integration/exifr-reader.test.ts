import { describe, expect, it } from "vitest";
import { ExifrPhotoMetadataReader } from "../../src/metadata/exifr-reader";
import { buildSyntheticHeic, buildSyntheticJpeg, buildSyntheticPng } from "../fixtures/synthetic-exif";

describe("ExifrPhotoMetadataReader", () => {
  const reader = new ExifrPhotoMetadataReader();

  it("reads GPS references and offset time from JPEG", async () => {
    const northeast = await reader.read(buildSyntheticJpeg());
    expect(northeast.latitude).toBeCloseTo(31.23, 5);
    expect(northeast.longitude).toBeCloseTo(121.47, 5);
    expect(northeast.capturedAt).toBe("2026-07-17T09:20:30+08:00");

    const southwest = await reader.read(buildSyntheticJpeg({ latitudeRef: "S", longitudeRef: "W" }));
    expect(southwest.latitude).toBeCloseTo(-31.23, 5);
    expect(southwest.longitude).toBeCloseTo(-121.47, 5);
  });

  it("reads the same EXIF payload through a HEIC container", async () => {
    const metadata = await reader.read(buildSyntheticHeic());
    expect(metadata.latitude).toBeCloseTo(31.23, 5);
    expect(metadata.longitude).toBeCloseTo(121.47, 5);
    expect(metadata.capturedAt).toBe("2026-07-17T09:20:30+08:00");
  });

  it("reads eXIf GPS and offset time from PNG", async () => {
    const metadata = await reader.read(buildSyntheticPng());
    expect(metadata.latitude).toBeCloseTo(31.23, 5);
    expect(metadata.longitude).toBeCloseTo(121.47, 5);
    expect(metadata.capturedAt).toBe("2026-07-17T09:20:30+08:00");
  });
});

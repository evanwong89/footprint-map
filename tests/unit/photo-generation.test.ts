import { describe, expect, it } from "vitest";
import { extractEmbeddedPhotoLinks } from "../../src/application/extract-photo-links";
import { generateFromPhotos, mergeGeneratedVisits } from "../../src/application/generate-from-photos";
import type { FootprintVisit } from "../../src/core/domain";
import type { PhotoMetadataReader } from "../../src/metadata/photo-metadata-reader";

describe("photo generation", () => {
  it("extracts Obsidian and Markdown photo links without duplicates", () => {
    const links = extractEmbeddedPhotoLinks(
      "![[照片/早餐.jpg|早餐]]\n![](照片/午餐.heic)\n![[照片/早餐.jpg]]\n![[Assets/午后.png\\|360]]",
    );
    expect(links).toHaveLength(3);
    expect(links).toEqual(expect.arrayContaining(["照片/早餐.jpg", "照片/午餐.heic", "Assets/午后.png"]));
  });

  it("continues after one unreadable photo", async () => {
    const reader: PhotoMetadataReader = {
      read: async (input) => {
        if (new Uint8Array(input)[0] === 0) throw new Error("missing gps");
        return { latitude: 31, longitude: 121, capturedAt: "2026-07-17T09:00:00+08:00" };
      },
    };
    const result = await generateFromPhotos([
      { path: "bad.jpg", bytes: new Uint8Array([0]) },
      { path: "good.jpg", bytes: new Uint8Array([1]) },
    ], reader);
    expect(result.visits).toHaveLength(1);
    expect(result.issues).toHaveLength(1);
  });

  it("preserves manual visits while replacing a generated visit with the same id", () => {
    const base: FootprintVisit = {
      id: "manual",
      observedAt: "2026-07-17T08:00:00+08:00",
      timeConfidence: "manual",
      coordinates: { longitude: 1, latitude: 1 },
      photos: [],
      source: "manual",
    };
    const generated = { ...base, id: "photo", source: "photo-exif" as const };
    const updated = { ...generated, coordinates: { longitude: 2, latitude: 2 } };
    expect(mergeGeneratedVisits([base, generated], [updated])).toEqual([base, updated]);
  });

  it("clusters consecutive photos within 200 meters at the first photo position", async () => {
    const coordinates = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0.001 },
      { latitude: 0, longitude: 0.002 },
    ];
    let index = 0;
    const reader: PhotoMetadataReader = {
      read: async () => ({
        ...coordinates[index]!,
        capturedAt: `2026-07-17T09:0${index++}:00+08:00`,
      }),
    };
    const result = await generateFromPhotos([
      { path: "one.jpg", bytes: new Uint8Array([1]) },
      { path: "two.jpg", bytes: new Uint8Array([2]) },
      { path: "three.jpg", bytes: new Uint8Array([3]) },
    ], reader);
    expect(result.visits).toHaveLength(2);
    expect(result.visits[0]?.coordinates).toEqual({ latitude: 0, longitude: 0 });
    expect(result.visits[0]?.photos.map(({ path }) => path)).toEqual(["one.jpg", "two.jpg"]);
    expect(result.visits[1]?.photos.map(({ path }) => path)).toEqual(["three.jpg"]);
  });
});

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFootprintBlock,
  parseCliArguments,
  resolvePhotoPath,
  upsertFootprintBlock,
} from "../../src/tools/footprint-cli-core";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { force: true, recursive: true })));
});

describe("Footprint Map CLI core", () => {
  it("parses a safe preview by default and an explicit apply mode", () => {
    const preview = parseCliArguments(["generate", "--input", "log.md", "--vault", "."]);
    expect(preview).toMatchObject({ command: "generate", apply: false, height: 520, tileProvider: "amap" });
    const apply = parseCliArguments([
      "generate", "--input", "log.md", "--vault", ".", "--apply", "--height", "640", "--tile-provider", "osm",
    ]);
    expect(apply).toMatchObject({ command: "generate", apply: true, height: 640, tileProvider: "osm" });
  });

  it("rejects invalid heights and providers", () => {
    expect(() => parseCliArguments(["generate", "--input", "log.md", "--vault", ".", "--height", "100"])).toThrow("240 至 960");
    expect(() => parseCliArguments(["generate", "--input", "log.md", "--vault", ".", "--tile-provider", "unknown"])).toThrow("amap 或 osm");
  });

  it("adds one canonical block and replaces duplicate existing blocks", () => {
    const block = createFootprintBlock({
      source: "2026-07-16.footprint.geojson",
      height: 520,
      title: "2026-07-16 当日足迹",
      tileProvider: "amap",
    });
    const added = upsertFootprintBlock("# 日志\n", block);
    expect(added.match(/```footprint-map/g)).toHaveLength(1);
    expect(added).toContain("tileProvider: amap");
    const replaced = upsertFootprintBlock(`${added}\n${block}\n`, block.replace("height: 520", "height: 640"));
    expect(replaced.match(/```footprint-map/g)).toHaveLength(1);
    expect(replaced).toContain("height: 640");
  });

  it("resolves Vault-root and note-relative photos without leaving the Vault", async () => {
    const vault = await mkdtemp(join(tmpdir(), "footprint-cli-"));
    temporaryDirectories.push(vault);
    const noteDirectory = join(vault, "Travel", "logs");
    await mkdir(join(vault, "Assets"), { recursive: true });
    await mkdir(noteDirectory, { recursive: true });
    await writeFile(join(vault, "Assets", "root.png"), "root");
    await writeFile(join(noteDirectory, "local.png"), "local");
    const note = join(noteDirectory, "2026-07-16.md");
    expect(await resolvePhotoPath(vault, note, "Assets/root.png")).toBe(join(vault, "Assets", "root.png"));
    expect(await resolvePhotoPath(vault, note, "./local.png")).toBe(join(noteDirectory, "local.png"));
    await expect(resolvePhotoPath(vault, note, "../../../outside.png")).rejects.toThrow("必须位于 Vault 内");
  });
});

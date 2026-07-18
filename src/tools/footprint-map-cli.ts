import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { extractEmbeddedPhotoLinks } from "../application/extract-photo-links";
import { generateFromPhotos, mergeGeneratedVisits } from "../application/generate-from-photos";
import { buildViewModel } from "../core/build-view-model";
import type { FootprintDocument, FootprintIssue, FootprintVisit } from "../core/domain";
import { serializeFootprintGeoJson } from "../core/serialize-footprint";
import { validateFootprintGeoJson } from "../core/validate-footprint";
import { ExifrPhotoMetadataReader } from "../metadata/exifr-reader";
import { renderStaticSvg } from "../renderer/static-svg-renderer";
import {
  assertPathInsideVault,
  CLI_USAGE,
  createFootprintBlock,
  parseCliArguments,
  resolvePhotoPath,
  upsertFootprintBlock,
} from "./footprint-cli-core";

const readExistingVisits = async (path: string): Promise<readonly FootprintVisit[]> => {
  try {
    const validation = validateFootprintGeoJson(JSON.parse(await readFile(path, "utf8")));
    if (!validation.document) throw new Error(validation.issues.map(({ message }) => message).join("；"));
    return validation.document.visits;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error(`FM_EXISTING_DATA_INVALID: ${path} 无法解析，为避免覆盖已停止生成。`);
  }
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.footprint-map-${process.pid}.tmp`;
  await writeFile(temporary, content, "utf8");
  await rename(temporary, path);
};

const main = async (): Promise<void> => {
  const options = parseCliArguments(process.argv.slice(2));
  if (options.command === "help") {
    process.stdout.write(`${CLI_USAGE}\n`);
    return;
  }
  assertPathInsideVault(options.vault, options.input, "Markdown 日志");
  if (!/\.md$/i.test(options.input)) throw new Error("--input 必须是 Markdown 文件。");
  const markdown = await readFile(options.input, "utf8");
  const links = extractEmbeddedPhotoLinks(markdown);
  if (!links.length) throw new Error("当前日志没有可读取的 JPEG/HEIC/PNG 嵌入图片。");

  const photoInputs: Array<{ path: string; bytes: Uint8Array }> = [];
  const unresolved: FootprintIssue[] = [];
  for (const link of links) {
    try {
      const path = await resolvePhotoPath(options.vault, options.input, link);
      photoInputs.push({ path: link, bytes: new Uint8Array(await readFile(path)) });
    } catch (error) {
      unresolved.push({
        code: "FM_PHOTO_IMPORT_FAILED",
        severity: "warning",
        path: link,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const generated = await generateFromPhotos(photoInputs, new ExifrPhotoMetadataReader());
  const noteStem = basename(options.input, ".md");
  const directory = dirname(options.input);
  const geoJsonName = `${noteStem}.footprint.geojson`;
  const svgName = `${noteStem}.footprint.svg`;
  const geoJsonPath = join(directory, geoJsonName);
  const svgPath = join(directory, svgName);
  const existing = await readExistingVisits(geoJsonPath);
  const visits = mergeGeneratedVisits(existing, generated.visits);
  if (!visits.length) throw new Error("没有照片同时包含有效 GPS 和明确时区，且不存在可保留的手动点位，未生成空足迹。");
  const title = options.title ?? `${noteStem} 当日足迹`;
  const document: FootprintDocument = {
    schemaVersion: "1.0",
    title,
    timezone: options.timezone,
    createdAt: new Date().toISOString(),
    visits,
  };
  const serialized = serializeFootprintGeoJson(document);
  const validation = validateFootprintGeoJson(serialized);
  if (!validation.document) throw new Error(`生成的 GeoJSON 未通过校验：${validation.issues.map(({ message }) => message).join("；")}`);
  const fallback = options.staticPreview ? svgName : undefined;
  const block = createFootprintBlock({
    source: geoJsonName,
    height: options.height,
    ...(fallback ? { fallback } : {}),
    title,
    tileProvider: options.tileProvider,
  });
  const updatedMarkdown = upsertFootprintBlock(markdown, block);

  if (options.apply) {
    await atomicWrite(geoJsonPath, `${JSON.stringify(serialized, null, 2)}\n`);
    if (options.staticPreview) await atomicWrite(svgPath, `${renderStaticSvg(buildViewModel(document))}\n`);
    await atomicWrite(options.input, updatedMarkdown);
  }

  const issues = [...unresolved, ...generated.issues, ...validation.issues];
  process.stdout.write(`${JSON.stringify({
    mode: options.apply ? "apply" : "preview",
    markdown: options.input,
    geoJson: geoJsonPath,
    staticPreview: options.staticPreview ? svgPath : null,
    referencedImages: links.length,
    readableImages: photoInputs.length,
    generatedVisits: generated.visits.length,
    totalVisits: visits.length,
    issues: issues.map(({ code, path, message }) => ({ code, ...(path ? { path } : {}), message })),
    changedMarkdown: updatedMarkdown !== markdown,
  }, null, 2)}\n`);
};

await main().catch((error: unknown) => {
  process.stderr.write(`Footprint Map CLI：${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

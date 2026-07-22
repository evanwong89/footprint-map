import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { extractEmbeddedPhotoLinks } from "../application/extract-photo-links";
import { generateFromPhotos } from "../application/generate-from-photos";
import type { FootprintDocument } from "../core/domain";
import { serializeFootprintGeoJson } from "../core/serialize-footprint";
import { validateFootprintGeoJson } from "../core/validate-footprint";
import { ExifrPhotoMetadataReader } from "../metadata/exifr-reader";

interface ToolOptions {
  input: string;
  vault: string;
  output: string;
  plugin?: string;
}

const parseArguments = (arguments_: readonly string[]): ToolOptions => {
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error(`无效参数：${key ?? "<empty>"}`);
    values.set(key.slice(2), value);
  }
  const input = values.get("input");
  const vault = values.get("vault");
  const output = values.get("output");
  if (!input || !vault || !output) {
    throw new Error("用法：--input <md> --vault <源 Vault> --output <临时 Vault> [--plugin <插件包目录>]");
  }
  const options: ToolOptions = { input: resolve(input), vault: resolve(vault), output: resolve(output) };
  const plugin = values.get("plugin");
  if (plugin) options.plugin = resolve(plugin);
  return options;
};

const safeSourcePath = (vault: string, link: string): string => {
  if (/^[a-z][a-z\d+.-]*:/i.test(link) || link.startsWith("//")) {
    throw new Error(`不复制远程资源：${link}`);
  }
  const path = resolve(vault, link.replaceAll("\\", "/"));
  if (path !== vault && !path.startsWith(`${vault}${sep}`)) throw new Error(`附件越过 Vault 根目录：${link}`);
  return path;
};

const main = async (): Promise<void> => {
  const options = parseArguments(process.argv.slice(2));
  const markdown = await readFile(options.input, "utf8");
  const links = extractEmbeddedPhotoLinks(markdown);
  await mkdir(options.output, { recursive: true });

  const copied: string[] = [];
  const photoInputs = [];
  for (const link of links) {
    const source = safeSourcePath(options.vault, link);
    const target = join(options.output, link);
    try {
      const bytes = await readFile(source);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(source, target);
      copied.push(link);
      photoInputs.push({ path: link, bytes: new Uint8Array(bytes) });
    } catch (error) {
      console.warn(`跳过无法复制的附件 ${link}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const generated = await generateFromPhotos(photoInputs, new ExifrPhotoMetadataReader());
  if (!generated.visits.length) throw new Error("没有照片同时包含有效 GPS 和明确时区，无法生成测试足迹。");
  const noteStem = basename(options.input, ".md");
  const document: FootprintDocument = {
    schemaVersion: "1.0",
    title: `${noteStem} 真实日志测试足迹`,
    timezone: "Asia/Shanghai",
    createdAt: new Date().toISOString(),
    visits: generated.visits,
  };
  const geoJsonName = `${noteStem}-test.footprint.geojson`;
  const serialized = serializeFootprintGeoJson(document);
  const validation = validateFootprintGeoJson(serialized);
  if (!validation.document) {
    throw new Error(`生成的 GeoJSON 未通过校验：${validation.issues.map(({ message }) => message).join("；")}`);
  }
  await writeFile(join(options.output, geoJsonName), `${JSON.stringify(serialized, null, 2)}\n`, "utf8");

  const testBlock = `\n\n## Footprint Map 测试\n\n\`\`\`footprint-map\nsource: ${geoJsonName}\nheight: 520\ntitle: ${noteStem} 真实日志测试足迹\ntiles: true\ntileProvider: amap\n\`\`\`\n`;
  await writeFile(join(options.output, `${noteStem}-test.md`), `${markdown.trimEnd()}${testBlock}`, "utf8");

  if (options.plugin) {
    const pluginTarget = join(options.output, ".obsidian", "plugins", "footprint-map");
    await mkdir(dirname(pluginTarget), { recursive: true });
    await cp(options.plugin, pluginTarget, { recursive: true, force: true });
    await writeFile(join(options.output, ".obsidian", "community-plugins.json"), '["footprint-map"]\n', "utf8");
  }

  const output = {
    testVault: options.output,
    testNote: join(options.output, `${noteStem}-test.md`),
    geoJson: join(options.output, geoJsonName),
    referencedImages: links.length,
    copiedImages: copied.length,
    generatedVisits: generated.visits.length,
    validationWarnings: validation.issues.length,
    skippedImages: generated.issues.map(({ path, message }) => ({ path, message })),
    sourceRelativeToVault: relative(options.vault, options.input),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
};

await main();

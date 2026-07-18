import { parse } from "yaml";

export interface FootprintMapBlockConfig {
  source: string;
  height: number;
  fallback?: string;
  title?: string;
  tiles: boolean;
  tileProvider?: "osm" | "amap" | "custom";
  warnings: readonly ConfigWarning[];
}

export interface ConfigWarning {
  type: "unknown-field";
  field: string;
}

const knownFields = new Set(["source", "height", "fallback", "title", "tiles", "tileProvider"]);

export const parseCodeBlockConfig = (source: string): FootprintMapBlockConfig => {
  let input: unknown;
  try {
    input = parse(source);
  } catch (error) {
    throw new Error(`FM_BLOCK_CONFIG_INVALID: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("FM_BLOCK_CONFIG_INVALID: 代码块内容必须是 YAML 对象。");
  }
  const record = input as Record<string, unknown>;
  if (typeof record.source !== "string" || !record.source.trim()) {
    throw new Error("FM_SOURCE_REQUIRED: source 是必填路径。");
  }
  const rawHeight = record.height ?? 420;
  if (typeof rawHeight !== "number" || !Number.isFinite(rawHeight)) {
    throw new Error("FM_HEIGHT_INVALID: height 必须是数字。");
  }
  const warnings = Object.keys(record)
    .filter((key) => !knownFields.has(key))
    .map((field): ConfigWarning => ({ type: "unknown-field", field }));
  const config: FootprintMapBlockConfig = {
    source: record.source.trim(),
    height: Math.min(960, Math.max(240, Math.round(rawHeight))),
    tiles: record.tiles !== false,
    warnings,
  };
  if (typeof record.fallback === "string" && record.fallback.trim()) {
    if (!/\.(?:svg|png|jpe?g|webp)$/i.test(record.fallback.trim())) {
      throw new Error("FM_FALLBACK_INVALID: fallback 只支持 SVG、PNG、JPEG 或 WebP。");
    }
    config.fallback = record.fallback.trim();
  }
  if (typeof record.title === "string" && record.title.trim()) config.title = record.title.trim();
  if (record.tileProvider !== undefined) {
    if (record.tileProvider !== "osm" && record.tileProvider !== "amap" && record.tileProvider !== "custom") {
      throw new Error("FM_TILE_PROVIDER_INVALID: tileProvider 只支持 osm、amap 或 custom。");
    }
    config.tileProvider = record.tileProvider;
  }
  return config;
};

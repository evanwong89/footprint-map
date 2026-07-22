import { access } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

export type CliTileProvider = "amap" | "osm";

export interface GenerateCliOptions {
  command: "generate";
  input: string;
  vault: string;
  height: number;
  tileProvider: CliTileProvider;
  timezone: string;
  title?: string;
  apply: boolean;
}

export const CLI_USAGE = `用法：
  footprint-map generate --input <日志.md> --vault <Vault根目录> [选项]

选项：
  --height <240-960>          地图高度，默认 520
  --tile-provider <amap|osm>  地图提供者，默认 amap
  --timezone <IANA时区>       默认使用当前系统时区
  --title <标题>              默认“<日志文件名> 当日足迹”
  --apply                     写入 GeoJSON 和 Markdown；不填写时只预览
  --help                      显示帮助`;

const requireValue = (arguments_: readonly string[], index: number, option: string): string => {
  const value = arguments_[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} 缺少值。\n${CLI_USAGE}`);
  return value;
};

export const parseCliArguments = (arguments_: readonly string[]): GenerateCliOptions | { command: "help" } => {
  if (!arguments_.length || arguments_.includes("--help") || arguments_[0] === "help") return { command: "help" };
  if (arguments_[0] !== "generate") throw new Error(`未知命令：${arguments_[0]}。\n${CLI_USAGE}`);
  const values = new Map<string, string>();
  let apply = false;
  for (let index = 1; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--apply") {
      apply = true;
      continue;
    }
    if (!argument?.startsWith("--")) throw new Error(`无效参数：${argument ?? "<empty>"}。\n${CLI_USAGE}`);
    const value = requireValue(arguments_, index, argument);
    values.set(argument.slice(2), value);
    index += 1;
  }
  const allowed = new Set(["input", "vault", "height", "tile-provider", "timezone", "title"]);
  const unknown = [...values.keys()].find((key) => !allowed.has(key));
  if (unknown) throw new Error(`未知参数：--${unknown}。\n${CLI_USAGE}`);
  const input = values.get("input");
  const vault = values.get("vault");
  if (!input || !vault) throw new Error(`--input 和 --vault 为必填项。\n${CLI_USAGE}`);
  const height = Number(values.get("height") ?? "520");
  if (!Number.isInteger(height) || height < 240 || height > 960) throw new Error("--height 必须是 240 至 960 的整数。");
  const tileProvider = values.get("tile-provider") ?? "amap";
  if (tileProvider !== "amap" && tileProvider !== "osm") throw new Error("--tile-provider 只支持 amap 或 osm。");
  const timezone = values.get("timezone") ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const options: GenerateCliOptions = {
    command: "generate",
    input: resolve(input),
    vault: resolve(vault),
    height,
    tileProvider,
    timezone,
    apply,
  };
  const title = values.get("title")?.trim();
  if (title) options.title = title;
  return options;
};

export const assertPathInsideVault = (vault: string, path: string, label: string): void => {
  if (path !== vault && !path.startsWith(`${vault}${sep}`)) throw new Error(`${label} 必须位于 Vault 内：${path}`);
};

const decodeLink = (link: string): string => {
  try {
    return decodeURIComponent(link);
  } catch {
    return link;
  }
};

export const resolvePhotoPath = async (vault: string, notePath: string, link: string): Promise<string> => {
  if (/^[a-z][a-z\d+.-]*:/i.test(link) || link.startsWith("//")) throw new Error(`不读取远程资源：${link}`);
  const normalized = decodeLink(link).replaceAll("\\", "/");
  const rootRelative = normalized.replace(/^\/+/, "");
  const candidates = normalized.startsWith("./") || normalized.startsWith("../")
    ? [resolve(dirname(notePath), normalized)]
    : [resolve(vault, rootRelative), resolve(dirname(notePath), normalized)];
  for (const candidate of [...new Set(candidates)]) {
    assertPathInsideVault(vault, candidate, "照片");
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next Obsidian-compatible location.
    }
  }
  throw new Error(`找不到本地照片：${link}`);
};

const FOOTPRINT_BLOCK = /```footprint-map[^\n]*\n[\s\S]*?```[ \t]*/g;

export const createFootprintBlock = (options: {
  source: string;
  height: number;
  fallback?: string;
  title: string;
  tileProvider: CliTileProvider;
}): string => [
  "```footprint-map",
  `source: ${options.source}`,
  `height: ${options.height}`,
  ...(options.fallback ? [`fallback: ${options.fallback}`] : []),
  `title: ${options.title}`,
  "tiles: true",
  `tileProvider: ${options.tileProvider}`,
  "```",
].join("\n");

export const upsertFootprintBlock = (markdown: string, block: string): string => {
  let inserted = false;
  const updated = markdown.replace(FOOTPRINT_BLOCK, () => {
    if (inserted) return "";
    inserted = true;
    return block;
  });
  if (inserted) return `${updated.trimEnd()}\n`;
  return `${markdown.trimEnd()}\n\n${block}\n`;
};

import type { VisitPeriod } from "./core/domain";

export type LanguagePreference = "auto" | "en" | "zh-CN";
export type SupportedLocale = Exclude<LanguagePreference, "auto">;
export type DisplayPeriod = VisitPeriod | "unknown";

const EN = {
  language: "Language",
  languageDesc: "Auto follows Obsidian. Reload the plugin after changing this setting to refresh all open maps and command names.",
  languageAuto: "Auto",
  languageEnglish: "English",
  languageChinese: "Simplified Chinese",
  defaultBasemap: "Default basemap",
  defaultBasemapDesc: "Used when a code block does not specify tileProvider. tiles: false still disables the basemap.",
  osmProvider: "OpenStreetMap / Leaflet",
  amapProvider: "AMap static map",
  customProvider: "Custom tiles / Leaflet",
  amapKey: "AMap Web Service key",
  amapKeyDesc: "Select or create an Obsidian secret containing an AMap Web Service API key. Static map requests send the key, visible center, zoom, image size, and network IP to AMap; photos, Markdown, and GeoJSON files are not uploaded.",
  customTileUrl: "Custom tile URL",
  customTileUrlDesc: "Advanced. Must use HTTP(S) and include {z}, {x}, and {y}. Most users can leave this empty.",
  customTileAttribution: "Custom tile attribution",
  customTileAttributionDesc: "Enter the plain-text attribution required by the tile provider. Required for custom tiles.",
  customTileAttributionPlaceholder: "© Map data provider",
  customTileMaxZoom: "Custom tile maximum zoom",
  customTileMaxZoomDesc: "Set this to the maximum zoom supported by the provider.",
  legend: "Dashed lines and arrows show time order only, not the actual route taken.",
  zoomHint: "Pinch or hold ⌘/Ctrl while scrolling to zoom the map.",
  fitAll: "Fit all places",
  placeAria: "Place {sequence}, {time}",
  primaryPhotoAlt: "First photo from place {sequence}",
  noImage: "No image",
  photoHeading: "Place {sequence} · {time}",
  noPhotos: "This place has no photos to display.",
  photoAlt: "Photo from place {sequence}",
  photoUnavailable: "Photo unavailable",
  visit: "Place",
  visitNumber: "Place {sequence}",
  timelineAria: "Visits in time order",
  basemapUnavailable: "The basemap failed to load and was removed. Photo markers, the timeline, and connecting lines remain available.",
  amapUnavailable: "The AMap static basemap failed to load. The map is using no-basemap mode, and footprint data remains available.",
  mapLoadFailed: "Footprint map failed to load",
  mapName: "Footprint map",
  staticPreviewAlt: "{title} static preview",
  periodMorning: "Morning",
  periodNoon: "Noon",
  periodAfternoon: "Afternoon",
  periodEvening: "Evening",
  periodNight: "Night",
  periodUnknown: "Unknown period",
  commandGenerate: "Generate footprint from photos in the current note",
  noMarkdownFile: "No Markdown file is currently open.",
  noEmbeddedPhotos: "The current note has no readable embedded JPEG, HEIC, or PNG photos.",
  noGeneratedVisits: "No photo produced a visit, so an empty footprint file was not created.",
  generatedTitle: "{name} daily footprint",
  generatedSummary: "Generated {visits} visits; {issues} photos were not imported.",
  languageChanged: "Language saved. Reload Footprint Map to refresh all open views and command names.",
  warningUnknownField: "Unknown configuration field {field} was ignored.",
  customTileUrlRequired: "Custom tiles have no URL. Using no-basemap mode.",
  customTileUrlProtocol: "The custom tile URL must use HTTP or HTTPS. Using no-basemap mode.",
  customTileUrlTokens: "The custom tile URL must include {z}, {x}, and {y}. Using no-basemap mode.",
  customTileAttributionRequired: "Custom tiles have no attribution. Using no-basemap mode.",
  customTileMaxZoomInvalid: "The custom tile maximum zoom must be an integer from 1 to 24. Using no-basemap mode.",
} as const;

type MessageKey = keyof typeof EN;

const ZH: Record<MessageKey, string> = {
  language: "语言",
  languageDesc: "自动跟随 Obsidian。修改后重载插件，以刷新所有已打开地图和命令名称。",
  languageAuto: "自动",
  languageEnglish: "English",
  languageChinese: "简体中文",
  defaultBasemap: "默认底图",
  defaultBasemapDesc: "代码块未填写 tileProvider 时使用。已有 tiles: false 仍会完全关闭底图。",
  osmProvider: "OpenStreetMap / Leaflet",
  amapProvider: "高德静态地图",
  customProvider: "自定义瓦片 / Leaflet",
  amapKey: "高德 Web 服务 Key",
  amapKeyDesc: "在 Obsidian 安全存储中选择或创建包含高德 Web 服务 API Key 的凭据。静态地图请求会向高德发送 Key、可见中心点、缩放级别、图片尺寸和网络 IP；不会上传照片、Markdown 或 GeoJSON 文件。",
  customTileUrl: "自定义瓦片 URL",
  customTileUrlDesc: "高级设置。必须使用 HTTP(S)，并包含 {z}、{x}、{y}；普通用户无需填写。",
  customTileAttribution: "自定义瓦片署名",
  customTileAttributionDesc: "按瓦片服务商要求填写纯文本署名；选择自定义底图时必填。",
  customTileAttributionPlaceholder: "© 地图数据提供商",
  customTileMaxZoom: "自定义瓦片最大缩放级别",
  customTileMaxZoomDesc: "按服务商实际支持范围设置。",
  legend: "虚线和箭头仅表示时间顺序，不表示实际街道路线。",
  zoomHint: "捏合，或按住 ⌘/Ctrl 滚动以缩放地图。",
  fitAll: "适配全部点位",
  placeAria: "地点 {sequence}，{time}",
  primaryPhotoAlt: "地点 {sequence} 的第一张照片",
  noImage: "无图",
  photoHeading: "地点 {sequence} · {time}",
  noPhotos: "这个地点没有可展示的照片。",
  photoAlt: "地点 {sequence} 的照片",
  photoUnavailable: "照片无法预览",
  visit: "到访点",
  visitNumber: "到访点 {sequence}",
  timelineAria: "按时间排序的到访列表",
  basemapUnavailable: "底图加载失败，已切换为无底图模式；照片点、时间线和连线仍可使用。",
  amapUnavailable: "高德静态底图加载失败，已使用无底图模式；足迹数据仍可用。",
  mapLoadFailed: "足迹地图无法加载",
  mapName: "足迹地图",
  staticPreviewAlt: "{title}静态预览",
  periodMorning: "上午",
  periodNoon: "中午",
  periodAfternoon: "下午",
  periodEvening: "晚上",
  periodNight: "凌晨",
  periodUnknown: "未知时段",
  commandGenerate: "从当前笔记的照片生成足迹",
  noMarkdownFile: "当前没有 Markdown 文件。",
  noEmbeddedPhotos: "当前笔记没有可读取的 JPEG/HEIC/PNG 嵌入图片。",
  noGeneratedVisits: "没有照片能生成到访点，未创建空足迹文件。",
  generatedTitle: "{name} 当日足迹",
  generatedSummary: "生成 {visits} 个到访点，{issues} 张照片未导入。",
  languageChanged: "语言已保存。请重载 Footprint Map，以刷新所有已打开视图和命令名称。",
  warningUnknownField: "未知配置字段 {field} 已忽略。",
  customTileUrlRequired: "自定义底图未填写瓦片 URL，已使用无底图模式。",
  customTileUrlProtocol: "自定义瓦片 URL 必须使用 HTTP 或 HTTPS，已使用无底图模式。",
  customTileUrlTokens: "自定义瓦片 URL 必须包含 {z}、{x} 和 {y}，已使用无底图模式。",
  customTileAttributionRequired: "自定义底图未填写署名，已使用无底图模式。",
  customTileMaxZoomInvalid: "自定义底图最大缩放级别必须是 1—24 的整数，已使用无底图模式。",
};

const ERROR_MESSAGES: Partial<Record<string, { en: string; zh: string }>> = {
  FM_AMAP_KEY_REQUIRED: { en: "Select an AMap Web Service API key in the plugin settings.", zh: "请在插件设置中选择高德 Web 服务 API Key。" },
  FM_STANDALONE_AMAP_KEY_REQUIRED: { en: "Configure an AMap Web Service API key in amap-config.js.", zh: "请在 amap-config.js 中配置高德 Web 服务 API Key。" },
  FM_BLOCK_CONFIG_INVALID: { en: "The code block configuration is invalid.", zh: "代码块配置无效。" },
  FM_SOURCE_REQUIRED: { en: "source is required.", zh: "source 是必填路径。" },
  FM_HEIGHT_INVALID: { en: "height must be a number.", zh: "height 必须是数字。" },
  FM_FALLBACK_INVALID: { en: "fallback only supports SVG, PNG, JPEG, or WebP.", zh: "fallback 只支持 SVG、PNG、JPEG 或 WebP。" },
  FM_TILE_PROVIDER_INVALID: { en: "tileProvider only supports osm, amap, or custom.", zh: "tileProvider 只支持 osm、amap 或 custom。" },
  FM_GEOJSON_PARSE_FAILED: { en: "GeoJSON is not valid JSON.", zh: "GeoJSON 不是有效 JSON。" },
  FM_SOURCE_NOT_FOUND: { en: "The source file could not be found.", zh: "找不到源文件。" },
  FM_PATH_OUTSIDE_VAULT: { en: "The path leaves the Vault root.", zh: "路径越过 Vault 根目录。" },
  FM_EXISTING_DATA_INVALID: { en: "Existing data is invalid, so generation stopped to avoid overwriting it.", zh: "现有数据无效，为避免覆盖已停止生成。" },
  FM_EXIF_GPS_MISSING: { en: "The photo has no usable GPS metadata.", zh: "照片没有可用 GPS。" },
  FM_EXIF_TIMEZONE_REQUIRED: { en: "The photo timestamp has no explicit UTC offset and was not guessed.", zh: "照片时间缺少明确 UTC 偏移，未进行猜测。" },
  FM_GEOJSON_INVALID: { en: "The data must be a GeoJSON FeatureCollection.", zh: "数据必须是 GeoJSON FeatureCollection。" },
  FM_SCHEMA_UNSUPPORTED: { en: "Only footprintMap.schemaVersion 1.0 is supported.", zh: "仅支持 footprintMap.schemaVersion 1.0。" },
  FM_TIMEZONE_REQUIRED: { en: "footprintMap.timezone is required.", zh: "footprintMap.timezone 不能为空。" },
  FM_CREATED_AT_INVALID: { en: "footprintMap.createdAt must include an explicit time zone.", zh: "footprintMap.createdAt 必须包含明确时区。" },
  FM_NO_VALID_VISITS: { en: "There are no valid visits to display.", zh: "没有可显示的有效到访点。" },
};

const ISSUE_MESSAGES: Partial<Record<string, { en: string; zh: string }>> = {
  FM_PHOTOS_INVALID: { en: "photos must be an array and was ignored.", zh: "photos 必须是数组，已忽略。" },
  FM_PHOTO_INVALID: { en: "A photo has no valid path and was ignored.", zh: "照片缺少有效 path，已忽略。" },
  FM_FEATURE_INVALID: { en: "An item is not a valid GeoJSON Feature and was ignored.", zh: "数据项不是有效的 GeoJSON Feature，已忽略。" },
  FM_VISIT_INVALID_GEOMETRY: { en: "Visit geometry must be a Point and was ignored.", zh: "到访点 geometry 必须是 Point，已忽略。" },
  FM_VISIT_INVALID_COORDINATES: { en: "Visit coordinates are invalid and were ignored.", zh: "到访点坐标越界或不是数字，已忽略。" },
  FM_VISIT_ID_MISSING: { en: "A visit has no stable ID and was ignored.", zh: "到访点缺少稳定 ID，已忽略。" },
  FM_VISIT_INVALID_TIME: { en: "observedAt must be an RFC 3339 timestamp with a time zone and was ignored.", zh: "observedAt 必须是包含时区的 RFC 3339 时间，已忽略。" },
  FM_VISIT_INVALID_SOURCE: { en: "A visit has an invalid source and was ignored.", zh: "到访点 source 无效，已忽略。" },
  FM_VISIT_INVALID_CONFIDENCE: { en: "A visit has invalid timeConfidence and was ignored.", zh: "到访点 timeConfidence 无效，已忽略。" },
  FM_VISIT_DUPLICATE_ID: { en: "A duplicate visit ID was ignored.", zh: "重复的到访点 ID 已忽略。" },
};

const interpolate = (message: string, variables: Record<string, string | number> = {}): string => (
  message.replace(/\{(\w+)\}/g, (match, key: string) => String(variables[key] ?? match))
);

export const resolveLocale = (
  preference: LanguagePreference,
  hostLocale: string | undefined,
): SupportedLocale => {
  if (preference !== "auto") return preference;
  return hostLocale?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
};

export interface I18n {
  locale: SupportedLocale;
  t(key: MessageKey, variables?: Record<string, string | number>): string;
  period(period: DisplayPeriod): string;
  issue(code: string, fallback: string): string;
  error(error: unknown): string;
}

export const createI18n = (
  preference: LanguagePreference,
  hostLocale?: string,
): I18n => {
  const locale = resolveLocale(preference, hostLocale);
  const messages = locale === "zh-CN" ? ZH : EN;
  const t = (key: MessageKey, variables?: Record<string, string | number>): string => (
    interpolate(messages[key] ?? EN[key], variables)
  );
  return {
    locale,
    t,
    period(period): string {
      const keys: Record<DisplayPeriod, MessageKey> = {
        morning: "periodMorning",
        noon: "periodNoon",
        afternoon: "periodAfternoon",
        evening: "periodEvening",
        night: "periodNight",
        unknown: "periodUnknown",
      };
      return t(keys[period]);
    },
    issue(code, fallback): string {
      const localized = ISSUE_MESSAGES[code];
      return localized ? localized[locale === "zh-CN" ? "zh" : "en"] : fallback;
    },
    error(error): string {
      const original = error instanceof Error ? error.message : String(error);
      const code = original.match(/^([A-Z][A-Z0-9_]+):/)?.[1];
      if (!code) return original;
      const localized = ERROR_MESSAGES[code];
      return localized ? `${code}: ${localized[locale === "zh-CN" ? "zh" : "en"]}` : original;
    },
  };
};

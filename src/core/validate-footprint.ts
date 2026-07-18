import type {
  FootprintDocument,
  FootprintPhoto,
  FootprintVisit,
  TimeConfidence,
  ValidationResult,
  VisitPeriod,
  VisitSource,
} from "./domain";
import { fatal, warning } from "./errors";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const RFC3339_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
const SOURCES = new Set<VisitSource>(["manual", "photo-exif", "gpx-stop"]);
const PERIODS = new Set<VisitPeriod>(["morning", "noon", "afternoon", "evening", "night"]);
const CONFIDENCE = new Set<TimeConfidence>(["exact-offset", "configured-timezone", "manual"]);

const validTimestamp = (value: unknown): value is string =>
  typeof value === "string" && RFC3339_WITH_ZONE.test(value) && Number.isFinite(Date.parse(value));

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const parsePhotos = (value: unknown, featureIndex: number): { photos: FootprintPhoto[]; issues: ReturnType<typeof warning>[] } => {
  const issues: ReturnType<typeof warning>[] = [];
  if (value === undefined) return { photos: [], issues };
  if (!Array.isArray(value)) {
    issues.push(warning("FM_PHOTOS_INVALID", "photos 必须是数组，已忽略。", { featureIndex }));
    return { photos: [], issues };
  }
  const photos = value.flatMap((item, photoIndex): FootprintPhoto[] => {
    if (!isRecord(item) || typeof item.path !== "string" || !item.path.trim()) {
      issues.push(
        warning("FM_PHOTO_INVALID", `第 ${photoIndex + 1} 张照片缺少有效 path，已忽略。`, { featureIndex }),
      );
      return [];
    }
    const photo: FootprintPhoto = { path: item.path };
    const capturedAt = optionalString(item.capturedAt);
    const caption = optionalString(item.caption);
    if (capturedAt) photo.capturedAt = capturedAt;
    if (caption) photo.caption = caption;
    if (typeof item.isPrimary === "boolean") photo.isPrimary = item.isPrimary;
    return [photo];
  });
  return { photos, issues };
};

const parseVisit = (
  feature: unknown,
  featureIndex: number,
): { visit?: FootprintVisit; issues: ReturnType<typeof warning>[] } => {
  const issues: ReturnType<typeof warning>[] = [];
  if (!isRecord(feature) || feature.type !== "Feature") {
    return {
      issues: [warning("FM_FEATURE_INVALID", "数据项不是有效的 GeoJSON Feature，已忽略。", { featureIndex })],
    };
  }
  const properties = feature.properties;
  if (!isRecord(properties) || properties.kind !== "visit") return { issues };
  const geometry = feature.geometry;
  if (!isRecord(geometry) || geometry.type !== "Point" || !Array.isArray(geometry.coordinates)) {
    return {
      issues: [warning("FM_VISIT_INVALID_GEOMETRY", "到访点 geometry 必须是 Point，已忽略。", { featureIndex })],
    };
  }
  const longitude: unknown = geometry.coordinates[0];
  const latitude: unknown = geometry.coordinates[1];
  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return {
      issues: [warning("FM_VISIT_INVALID_COORDINATES", "到访点坐标越界或不是数字，已忽略。", { featureIndex })],
    };
  }
  if (typeof feature.id !== "string" || !feature.id.trim()) {
    return { issues: [warning("FM_VISIT_ID_MISSING", "到访点缺少稳定 ID，已忽略。", { featureIndex })] };
  }
  if (!validTimestamp(properties.observedAt)) {
    return {
      issues: [warning("FM_VISIT_INVALID_TIME", "observedAt 必须是包含时区的 RFC 3339 时间，已忽略。", { featureIndex })],
    };
  }
  if (typeof properties.source !== "string" || !SOURCES.has(properties.source as VisitSource)) {
    return { issues: [warning("FM_VISIT_INVALID_SOURCE", "到访点 source 无效，已忽略。", { featureIndex })] };
  }
  if (
    typeof properties.timeConfidence !== "string" ||
    !CONFIDENCE.has(properties.timeConfidence as TimeConfidence)
  ) {
    return {
      issues: [warning("FM_VISIT_INVALID_CONFIDENCE", "到访点 timeConfidence 无效，已忽略。", { featureIndex })],
    };
  }

  const parsedPhotos = parsePhotos(properties.photos, featureIndex);
  issues.push(...parsedPhotos.issues);
  const visit: FootprintVisit = {
    id: feature.id,
    observedAt: properties.observedAt,
    timeConfidence: properties.timeConfidence as TimeConfidence,
    coordinates: { longitude, latitude },
    photos: parsedPhotos.photos,
    source: properties.source as VisitSource,
  };
  const label = optionalString(properties.label);
  const note = optionalString(properties.note);
  if (label) visit.label = label;
  if (note) visit.note = note;
  if (typeof properties.period === "string" && PERIODS.has(properties.period as VisitPeriod)) {
    visit.period = properties.period as VisitPeriod;
  }
  return { visit, issues };
};

export const validateFootprintGeoJson = (input: unknown): ValidationResult => {
  if (!isRecord(input) || input.type !== "FeatureCollection" || !Array.isArray(input.features)) {
    return { issues: [fatal("FM_GEOJSON_INVALID", "数据必须是 GeoJSON FeatureCollection。") ] };
  }
  const metadata = input.footprintMap;
  if (!isRecord(metadata) || metadata.schemaVersion !== "1.0") {
    return { issues: [fatal("FM_SCHEMA_UNSUPPORTED", "仅支持 footprintMap.schemaVersion 1.0。") ] };
  }
  if (typeof metadata.timezone !== "string" || !metadata.timezone.trim()) {
    return { issues: [fatal("FM_TIMEZONE_REQUIRED", "footprintMap.timezone 不能为空。") ] };
  }
  if (!validTimestamp(metadata.createdAt)) {
    return { issues: [fatal("FM_CREATED_AT_INVALID", "footprintMap.createdAt 必须包含明确时区。") ] };
  }

  const issues: ValidationResult["issues"][number][] = [];
  const visits: FootprintVisit[] = [];
  const ids = new Set<string>();
  input.features.forEach((feature, featureIndex) => {
    const parsed = parseVisit(feature, featureIndex);
    issues.push(...parsed.issues);
    if (!parsed.visit) return;
    if (ids.has(parsed.visit.id)) {
      issues.push(warning("FM_VISIT_DUPLICATE_ID", `到访点 ID ${parsed.visit.id} 重复，已忽略后者。`, { featureIndex }));
      return;
    }
    ids.add(parsed.visit.id);
    visits.push(parsed.visit);
  });
  if (!visits.length) return { issues: [...issues, fatal("FM_NO_VALID_VISITS", "没有可显示的有效到访点。")] };

  const document: FootprintDocument = {
    schemaVersion: "1.0",
    timezone: metadata.timezone,
    createdAt: metadata.createdAt,
    visits,
  };
  const title = optionalString(metadata.title);
  if (title) document.title = title;
  return { document, issues };
};

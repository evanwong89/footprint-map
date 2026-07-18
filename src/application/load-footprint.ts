import { buildViewModel } from "../core/build-view-model";
import type { FootprintViewModel } from "../core/domain";
import { validateFootprintGeoJson } from "../core/validate-footprint";

export const loadFootprint = (json: string): FootprintViewModel => {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw new Error("FM_GEOJSON_PARSE_FAILED: GeoJSON 不是有效 JSON。");
  }
  const validation = validateFootprintGeoJson(input);
  if (!validation.document) {
    const message = validation.issues.map(({ code, message: detail }) => `${code}: ${detail}`).join("\n");
    throw new Error(message);
  }
  return buildViewModel(validation.document, validation.issues);
};

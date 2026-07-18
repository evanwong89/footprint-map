export interface TileProviderConfig {
  urlTemplate: string;
  attribution: string;
  maxZoom?: number;
}

export interface CustomTileProviderInput {
  urlTemplate: string;
  attribution: string;
  maxZoom: number;
}

export type CustomTileProviderResolution =
  | { provider: TileProviderConfig; warning?: never }
  | { provider: null; warning: CustomTileProviderWarning };

export type CustomTileProviderWarning =
  | "customTileUrlRequired"
  | "customTileUrlProtocol"
  | "customTileUrlTokens"
  | "customTileAttributionRequired"
  | "customTileMaxZoomInvalid";

export const OPEN_STREET_MAP_TILES: TileProviderConfig = {
  urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export const resolveCustomTileProvider = (
  input: CustomTileProviderInput,
): CustomTileProviderResolution => {
  const urlTemplate = input.urlTemplate.trim();
  const attribution = input.attribution.trim();
  if (!urlTemplate) {
    return { provider: null, warning: "customTileUrlRequired" };
  }
  if (!/^https?:\/\//i.test(urlTemplate)) {
    return { provider: null, warning: "customTileUrlProtocol" };
  }
  if (!["{z}", "{x}", "{y}"].every((token) => urlTemplate.includes(token))) {
    return { provider: null, warning: "customTileUrlTokens" };
  }
  if (!attribution) {
    return { provider: null, warning: "customTileAttributionRequired" };
  }
  if (!Number.isInteger(input.maxZoom) || input.maxZoom < 1 || input.maxZoom > 24) {
    return { provider: null, warning: "customTileMaxZoomInvalid" };
  }
  return {
    provider: {
      urlTemplate,
      attribution: escapeHtml(attribution),
      maxZoom: input.maxZoom,
    },
  };
};

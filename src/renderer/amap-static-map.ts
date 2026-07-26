export const AMAP_STATIC_MAP_ENDPOINT = "https://restapi.amap.com/v3/staticmap";

export interface AMapStaticMapRequest {
  key: string;
  longitude: number;
  latitude: number;
  leafletZoom: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface AMapStaticMapImage {
  url: string;
  requestWidth: number;
  requestHeight: number;
  leafletImageZoom: number;
}

const clampRoundedInteger = (value: number, minimum: number, maximum: number): number => (
  Math.min(maximum, Math.max(minimum, Math.round(value)))
);

/**
 * AMap scale=2 returns twice the requested pixel dimensions and renders one
 * zoom level closer. Leaflet may use fractional zooms, while AMap accepts only
 * integers. Prefer the next sharper integer image with enough pixels to cover
 * the fractional viewport; otherwise use the lower integer image and crop it.
 * The caller places the image at its own geographic bounds rather than forcing
 * it into the fractional Leaflet viewport.
 */
export const createAMapStaticMapImage = (request: AMapStaticMapRequest): AMapStaticMapImage => {
  const leafletZoom = Math.min(18, Math.max(2, request.leafletZoom));
  const sharperZoom = Math.ceil(leafletZoom);
  const sharperScale = 2 ** (sharperZoom - leafletZoom);
  const sharperWidth = request.viewportWidth * sharperScale / 2;
  const sharperHeight = request.viewportHeight * sharperScale / 2;
  const canUseSharperImage = sharperWidth <= 1024 && sharperHeight <= 1024;
  const leafletImageZoom = canUseSharperImage ? sharperZoom : Math.floor(leafletZoom);
  const dimensionScale = canUseSharperImage ? sharperScale : 1;
  const requestWidth = clampRoundedInteger(request.viewportWidth * dimensionScale / 2, 64, 1024);
  const requestHeight = clampRoundedInteger(request.viewportHeight * dimensionScale / 2, 64, 1024);
  const amapZoom = clampRoundedInteger(leafletImageZoom - 1, 1, 17);
  const parameters = new URLSearchParams({
    key: request.key,
    location: `${request.longitude.toFixed(6)},${request.latitude.toFixed(6)}`,
    zoom: String(amapZoom),
    size: `${requestWidth}*${requestHeight}`,
    scale: "2",
  });
  return {
    url: `${AMAP_STATIC_MAP_ENDPOINT}?${parameters.toString()}`,
    requestWidth,
    requestHeight,
    leafletImageZoom: amapZoom + 1,
  };
};

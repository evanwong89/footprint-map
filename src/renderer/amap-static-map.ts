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
}

const clampInteger = (value: number, minimum: number, maximum: number): number => (
  Math.min(maximum, Math.max(minimum, Math.round(value)))
);

/**
 * AMap scale=2 returns twice the requested pixel dimensions and renders one
 * zoom level closer. Request half of the CSS viewport and one lower zoom so
 * the returned image aligns with Leaflet's current view.
 */
export const createAMapStaticMapImage = (request: AMapStaticMapRequest): AMapStaticMapImage => {
  const requestWidth = clampInteger(request.viewportWidth / 2, 64, 1024);
  const requestHeight = clampInteger(request.viewportHeight / 2, 64, 1024);
  const amapZoom = clampInteger(request.leafletZoom - 1, 1, 17);
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
  };
};

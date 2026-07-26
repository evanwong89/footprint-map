export const PHOTO_ZOOM_MIN = 1;
export const PHOTO_ZOOM_MAX = 6;

export interface PhotoZoomPoint {
  x: number;
  y: number;
}

export interface PhotoZoomSize {
  width: number;
  height: number;
}

export interface PhotoZoomTransform {
  scale: number;
  x: number;
  y: number;
}

export const IDENTITY_PHOTO_ZOOM: PhotoZoomTransform = {
  scale: PHOTO_ZOOM_MIN,
  x: 0,
  y: 0,
};

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.min(maximum, Math.max(minimum, value))
);

export const clampPhotoZoom = (
  transform: PhotoZoomTransform,
  viewport: PhotoZoomSize,
): PhotoZoomTransform => {
  const scale = clamp(transform.scale, PHOTO_ZOOM_MIN, PHOTO_ZOOM_MAX);
  return {
    scale,
    x: clamp(transform.x, viewport.width * (1 - scale), 0),
    y: clamp(transform.y, viewport.height * (1 - scale), 0),
  };
};

export const zoomPhotoAt = (
  transform: PhotoZoomTransform,
  requestedScale: number,
  point: PhotoZoomPoint,
  viewport: PhotoZoomSize,
): PhotoZoomTransform => {
  const scale = clamp(requestedScale, PHOTO_ZOOM_MIN, PHOTO_ZOOM_MAX);
  const imageX = (point.x - transform.x) / transform.scale;
  const imageY = (point.y - transform.y) / transform.scale;
  return clampPhotoZoom({
    scale,
    x: point.x - imageX * scale,
    y: point.y - imageY * scale,
  }, viewport);
};

export const panPhotoBy = (
  transform: PhotoZoomTransform,
  delta: PhotoZoomPoint,
  viewport: PhotoZoomSize,
): PhotoZoomTransform => clampPhotoZoom({
  ...transform,
  x: transform.x + delta.x,
  y: transform.y + delta.y,
}, viewport);

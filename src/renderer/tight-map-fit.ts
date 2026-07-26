export interface ProjectedPoint {
  x: number;
  y: number;
}

export interface MarkerInsets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface TightMapFitOptions<T> {
  points: readonly T[];
  viewport: {
    width: number;
    height: number;
  };
  minimumZoom: number;
  maximumZoom: number;
  zoomStep: number;
  markerInsets: MarkerInsets;
  project(point: T, zoom: number): ProjectedPoint;
}

export interface TightMapFit {
  center: ProjectedPoint;
  zoom: number;
}

/**
 * Finds the closest supported zoom that keeps every fixed-size marker inside
 * the viewport. The step can remain fractional even when the basemap source
 * uses integer zooms, provided the source image is georeferenced separately.
 */
export const calculateTightMapFit = <T>({
  points,
  viewport,
  minimumZoom,
  maximumZoom,
  zoomStep,
  markerInsets,
  project,
}: TightMapFitOptions<T>): TightMapFit | undefined => {
  if (
    !points.length
    || viewport.width <= 0
    || viewport.height <= 0
    || !Number.isFinite(zoomStep)
    || zoomStep <= 0
  ) return undefined;
  const firstStep = Math.floor(maximumZoom / zoomStep);
  const lastStep = Math.ceil(minimumZoom / zoomStep);
  for (let step = firstStep; step >= lastStep; step -= 1) {
    const zoom = Number((step * zoomStep).toFixed(6));
    const projected = points.map((point) => project(point, zoom));
    const xs = projected.map(({ x }) => x);
    const ys = projected.map(({ y }) => y);
    const left = Math.min(...xs) - markerInsets.left;
    const right = Math.max(...xs) + markerInsets.right;
    const top = Math.min(...ys) - markerInsets.top;
    const bottom = Math.max(...ys) + markerInsets.bottom;
    if (right - left <= viewport.width && bottom - top <= viewport.height) {
      return {
        center: {
          x: (left + right) / 2,
          y: (top + bottom) / 2,
        },
        zoom,
      };
    }
  }
  return undefined;
};

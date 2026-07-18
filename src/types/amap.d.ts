export interface AMapLngLat {
  getLng(): number;
  getLat(): number;
}

export interface AMapEventTarget {
  on(event: string, callback: (event: { target: AMapMarker }) => void): void;
  off(event: string, callback: (event: { target: AMapMarker }) => void): void;
}

export interface AMapMarker extends AMapEventTarget {
  getPosition(): AMapLngLat;
}

export interface AMapInfoWindow {
  open(map: AMapMap, position: AMapLngLat | readonly [number, number]): void;
  close(): void;
}

export interface AMapMap {
  add(overlays: unknown | readonly unknown[]): void;
  destroy(): void;
  on(event: "complete" | "resize", callback: () => void): void;
  off(event: "complete" | "resize", callback: () => void): void;
  setFitView(overlays?: readonly unknown[], immediately?: boolean, avoid?: readonly number[], maxZoom?: number): void;
  zoomIn(): void;
  zoomOut(): void;
}

export interface AMapNamespace {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  Polyline: new (options: Record<string, unknown>) => unknown;
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindow;
  Pixel: new (x: number, y: number) => unknown;
}

declare global {
  interface Window {
    AMap?: AMapNamespace;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
      serviceHost?: string;
    };
    FOOTPRINT_MAP_AMAP_CONFIG?: {
      key: string;
      securityJsCode?: string;
    };
  }
}

export {};

declare global {
  interface Window {
    createEl<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K];
    FOOTPRINT_MAP_AMAP_CONFIG?: {
      webServiceKey: string;
    };
  }
}

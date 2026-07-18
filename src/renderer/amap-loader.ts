import type { AMapNamespace } from "../types/amap";

export interface AMapCredentials {
  key: string;
  securityJsCode?: string;
}

let loadedKey: string | undefined;
let loading: Promise<AMapNamespace> | undefined;

export const loadAMap = (credentials: AMapCredentials): Promise<AMapNamespace> => {
  const key = credentials.key.trim();
  if (!key) return Promise.reject(new Error("FM_AMAP_KEY_REQUIRED: 请在插件设置中填写高德 Web Key。"));
  if (window.AMap) {
    loadedKey ??= key;
    if (loadedKey !== key) return Promise.reject(new Error("FM_AMAP_KEY_CHANGED: 请重新加载 Obsidian 后使用新的高德 Key。"));
    return Promise.resolve(window.AMap);
  }
  if (loading) {
    if (loadedKey !== key) return Promise.reject(new Error("FM_AMAP_KEY_CHANGED: 请重新加载 Obsidian 后使用新的高德 Key。"));
    return loading;
  }
  loadedKey = key;
  if (credentials.securityJsCode?.trim()) {
    window._AMapSecurityConfig = { securityJsCode: credentials.securityJsCode.trim() };
  }
  const script = document.createElement("script");
  const pending = new Promise<AMapNamespace>((resolve, reject) => {
    script.id = "footprint-map-amap-jsapi";
    script.async = true;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`;
    const timeout = window.setTimeout(() => reject(new Error("FM_AMAP_LOAD_TIMEOUT: 高德地图加载超时。")), 15_000);
    script.addEventListener("load", () => {
      window.clearTimeout(timeout);
      if (window.AMap) resolve(window.AMap);
      else reject(new Error("FM_AMAP_GLOBAL_MISSING: 高德脚本已返回但 AMap 不存在。"));
    }, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("FM_AMAP_LOAD_FAILED: 无法加载高德 JS API 2.0。"));
    }, { once: true });
    document.head.append(script);
  });
  let recoverable: Promise<AMapNamespace>;
  recoverable = pending.catch((error: unknown) => {
    if (loading === recoverable) {
      loading = undefined;
      loadedKey = undefined;
    }
    script.remove();
    throw error;
  });
  loading = recoverable;
  return recoverable;
};

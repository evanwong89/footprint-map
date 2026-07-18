import { loadFootprint } from "../../application/load-footprint";
import { OPEN_STREET_MAP_TILES } from "../../platform/tile-provider";
import { FootprintMapController } from "../../renderer/map-controller";
import { element } from "../../renderer/dom";
import { BrowserResourceResolver } from "./browser-resources";
import { AMapController } from "../../renderer/amap-map-controller";
import type { MapController } from "../../renderer/controller";
import { createI18n } from "../../i18n";

let controller: MapController | undefined;
const i18n = createI18n("en", "en");

const renderError = (container: HTMLElement, error: unknown): void => {
  container.replaceChildren();
  const panel = element("section", "footprint-map-error");
  panel.append(
    element("h2", undefined, i18n.t("mapLoadFailed")),
    element("pre", undefined, i18n.error(error)),
  );
  container.append(panel);
};

const loadSource = async (
  source: string,
  tilesEnabled = true,
  provider: "osm" | "amap" = "osm",
): Promise<void> => {
  const container = document.querySelector<HTMLElement>("#footprint-map");
  if (!container) return;
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`FM_SOURCE_NOT_FOUND: ${response.status} ${response.statusText}`);
    const model = loadFootprint(await response.text());
    controller?.destroy();
    const resourceResolver = new BrowserResourceResolver();
    if (tilesEnabled && provider === "amap") {
      const config = window.FOOTPRINT_MAP_AMAP_CONFIG;
      if (!config?.key.trim()) throw new Error("FM_STANDALONE_AMAP_KEY_REQUIRED: AMap Web key is missing.");
      const credentials = config.securityJsCode?.trim()
        ? { key: config.key, securityJsCode: config.securityJsCode }
        : { key: config.key };
      controller = await AMapController.create({
        container,
        model,
        resourceResolver,
        resourceBasePath: source,
        credentials,
        height: 520,
        i18n,
      });
    } else {
      controller = new FootprintMapController({
        container,
        model,
        resourceResolver,
        resourceBasePath: source,
        tileProvider: tilesEnabled ? OPEN_STREET_MAP_TILES : null,
        height: 520,
        i18n,
      });
    }
  } catch (error) {
    renderError(container, error);
  }
};

const start = (): void => {
  const query = new URLSearchParams(window.location.search);
  const source = query.get("source") ?? "./example.geojson";
  const tilesEnabled = query.get("tiles") !== "false";
  const provider = query.get("tileProvider") === "amap" ? "amap" : "osm";
  const input = document.querySelector<HTMLInputElement>("#source");
  const providerInput = document.querySelector<HTMLSelectElement>("#tile-provider");
  const form = document.querySelector<HTMLFormElement>("#source-form");
  if (input) input.value = source;
  if (providerInput) providerInput.value = provider;
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input?.value.trim()) return;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("source", input.value.trim());
    const nextProvider = providerInput?.value === "amap" ? "amap" : "osm";
    nextUrl.searchParams.set("tileProvider", nextProvider);
    window.history.replaceState({}, "", nextUrl);
    void loadSource(input.value.trim(), tilesEnabled, nextProvider);
  });
  void loadSource(source, tilesEnabled, provider);
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

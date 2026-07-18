import type { FootprintViewModel } from "../core/domain";
import type { ResourceResolver } from "../platform/resource-resolver";
import type { AMapMap, AMapMarker } from "../types/amap";
import { loadAMap, type AMapCredentials } from "./amap-loader";
import type { MapController } from "./controller";
import { element } from "./dom";
import {
  createTimeline,
  createVisitMarkerContent,
  createVisitPhotoBrowser,
  selectTimelineVisit,
} from "./map-controller";
import { convertCoordinates } from "./amap-coordinate-conversion";
import type { I18n } from "../i18n";

export interface AMapRenderOptions {
  container: HTMLElement;
  model: FootprintViewModel;
  resourceResolver: ResourceResolver;
  resourceBasePath: string;
  credentials: AMapCredentials;
  height?: number;
  i18n: I18n;
}

export class AMapController implements MapController {
  private constructor(
    private readonly root: HTMLElement,
    private readonly map: AMapMap,
    private readonly markerListeners: readonly { marker: AMapMarker; callback: (event: { target: AMapMarker }) => void }[],
    private readonly cleanupInitialFit: () => void,
  ) {}

  static async create(options: AMapRenderOptions): Promise<AMapController> {
    const AMap = await loadAMap(options.credentials);
    const positions = convertCoordinates(options.model);
    const root = element("section", "footprint-map-root footprint-map-amap-root");
    root.setAttribute("aria-label", options.model.title);
    const header = element("header", "footprint-map-header");
    const heading = element("div");
    heading.append(
      element("h3", "footprint-map-title", options.model.title),
      element("p", "footprint-map-legend", options.i18n.t("legend")),
    );
    const controls = element("div", "footprint-map-header-controls");
    const zoomOut = element("button", "footprint-map-fit", "−");
    const zoomIn = element("button", "footprint-map-fit", "+");
    const fitButton = element("button", "footprint-map-fit", options.i18n.t("fitAll"));
    for (const button of [zoomOut, zoomIn, fitButton]) button.type = "button";
    controls.append(zoomOut, zoomIn, fitButton);
    header.append(heading, controls);
    const mapElement = element("div", "footprint-map-canvas");
    mapElement.style.height = `${Math.min(960, Math.max(240, options.height ?? 420))}px`;
    const photoBrowser = createVisitPhotoBrowser(options.resourceResolver, options.resourceBasePath, options.i18n);
    root.append(header, mapElement, photoBrowser.element);
    options.container.replaceChildren(root);

    const firstPosition = positions.get(options.model.visits[0]!.id);
    if (!firstPosition) throw new Error("FM_AMAP_NO_POSITION: 坐标转换未返回任何点位。");
    const map = new AMap.Map(mapElement, {
      center: firstPosition,
      zoom: 14,
      viewMode: "2D",
      mapStyle: "amap://styles/normal",
      resizeEnable: true,
      scrollWheel: false,
    });
    const overlays: unknown[] = [];
    let mapReady = false;
    let initialFitCompleted = false;
    let layoutTimer: number | undefined;
    let layoutFrame: number | undefined;
    const fit = (immediately: boolean): void => map.setFitView(overlays, immediately, [96, 64, 64, 64], 16);
    const cleanupInitialFit = (): void => {
      if (layoutTimer !== undefined) window.clearTimeout(layoutTimer);
      if (layoutFrame !== undefined) window.cancelAnimationFrame(layoutFrame);
      resizeObserver.disconnect();
      map.off("complete", handleMapComplete);
      map.off("resize", scheduleInitialFit);
    };
    const completeInitialFit = (): void => {
      if (initialFitCompleted || !mapReady) return;
      if (mapElement.clientWidth < 100 || mapElement.clientHeight < 100) return;
      fit(true);
      initialFitCompleted = true;
      cleanupInitialFit();
    };
    function scheduleInitialFit(): void {
      if (initialFitCompleted) return;
      if (layoutTimer !== undefined) window.clearTimeout(layoutTimer);
      if (layoutFrame !== undefined) window.cancelAnimationFrame(layoutFrame);
      layoutTimer = window.setTimeout(() => {
        layoutFrame = window.requestAnimationFrame(completeInitialFit);
      }, 100);
    }
    function handleMapComplete(): void {
      mapReady = true;
      scheduleInitialFit();
    }
    const resizeObserver = new ResizeObserver(scheduleInitialFit);
    resizeObserver.observe(mapElement);
    map.on("complete", handleMapComplete);
    map.on("resize", scheduleInitialFit);
    for (const segment of options.model.segments) {
      const from = positions.get(segment.fromId);
      const to = positions.get(segment.toId);
      if (!from || !to) continue;
      const polyline = new AMap.Polyline({
        path: [from, to],
        strokeColor: "#e2673d",
        strokeWeight: 2,
        strokeOpacity: 0.9,
        strokeStyle: "dashed",
        showDir: true,
        lineJoin: "round",
        zIndex: 40,
      });
      overlays.push(polyline);
    }
    const markerListeners: Array<{ marker: AMapMarker; callback: (event: { target: AMapMarker }) => void }> = [];
    for (const visit of options.model.visits) {
      const position = positions.get(visit.id);
      if (!position) continue;
      const markerContent = createVisitMarkerContent(visit, options.resourceResolver, options.resourceBasePath, options.i18n);
      const marker = new AMap.Marker({
        position,
        content: markerContent,
        anchor: "bottom-center",
        title: `${visit.sequence}. ${visit.displayTime} ${visit.label ?? options.i18n.t("visit")}`,
        zIndex: 100 + visit.sequence,
      });
      const callback = (): void => {
        root.querySelectorAll(".footprint-map-place-card.is-selected").forEach((node) => node.classList.remove("is-selected"));
        markerContent.classList.add("is-selected");
        selectTimelineVisit(root, visit.id);
        photoBrowser.selectVisit(visit);
      };
      marker.on("click", callback);
      markerListeners.push({ marker, callback });
      overlays.push(marker);
    }
    root.append(
      createTimeline(options.model, options.i18n),
      AMapController.createIssues(options.model, options.i18n),
    );
    const firstVisit = options.model.visits[0];
    if (firstVisit) {
      root.querySelector(".footprint-map-place-card")?.classList.add("is-selected");
      selectTimelineVisit(root, firstVisit.id);
      photoBrowser.selectVisit(firstVisit);
    }
    map.add(overlays);
    zoomOut.addEventListener("click", () => map.zoomOut());
    zoomIn.addEventListener("click", () => map.zoomIn());
    fitButton.addEventListener("click", () => fit(false));
    scheduleInitialFit();
    return new AMapController(root, map, markerListeners, cleanupInitialFit);
  }

  private static createIssues(model: FootprintViewModel, i18n: I18n): HTMLElement {
    const region = element("aside", "footprint-map-issues");
    if (!model.issues.length) region.hidden = true;
    for (const item of model.issues) {
      region.append(element("p", undefined, `${item.code}: ${i18n.issue(item.code, item.message)}`));
    }
    return region;
  }

  destroy(): void {
    this.cleanupInitialFit();
    for (const { marker, callback } of this.markerListeners) marker.off("click", callback);
    this.map.destroy();
    this.root.remove();
  }
}

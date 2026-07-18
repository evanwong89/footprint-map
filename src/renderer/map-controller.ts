import L, {
  type ImageOverlay,
  type LatLngBoundsExpression,
  type Map as LeafletMap,
  type Marker,
  type TileLayer,
} from "leaflet";
import type { FootprintViewModel, SequenceSegment, VisitViewModel } from "../core/domain";
import type { ResourceResolver } from "../platform/resource-resolver";
import type { TileProviderConfig } from "../platform/tile-provider";
import type { I18n } from "../i18n";
import { element } from "./dom";
import type { MapController } from "./controller";
import { createAMapStaticMapImage } from "./amap-static-map";

export type CoordinateTransform = (
  longitude: number,
  latitude: number,
) => readonly [longitude: number, latitude: number];

export interface AMapStaticMapConfig {
  key: string;
}

export interface MapRenderOptions {
  container: HTMLElement;
  model: FootprintViewModel;
  resourceResolver: ResourceResolver;
  resourceBasePath: string;
  tileProvider?: TileProviderConfig | null;
  coordinateTransform?: CoordinateTransform;
  amapStaticMap?: AMapStaticMapConfig;
  height?: number;
  i18n: I18n;
}

const toLatLng = (
  coordinates: { longitude: number; latitude: number },
  transform?: CoordinateTransform,
): [number, number] => {
  const [longitude, latitude] = transform
    ? transform(coordinates.longitude, coordinates.latitude)
    : [coordinates.longitude, coordinates.latitude];
  return [latitude, longitude];
};

export const createVisitMarkerContent = (
  visit: VisitViewModel,
  resolver: ResourceResolver,
  basePath: string,
  i18n: I18n,
): HTMLElement => {
  const card = element("div", "footprint-map-place-card");
  card.setAttribute("aria-label", i18n.t("placeAria", { sequence: visit.sequence, time: visit.displayTime }));
  const preview = element("div", "footprint-map-place-preview");
  const primaryPhoto = visit.photos[0];
  if (primaryPhoto) {
    const image = element("img");
    image.alt = primaryPhoto.caption ?? i18n.t("primaryPhotoAlt", { sequence: visit.sequence });
    image.src = resolver.resolve(primaryPhoto.path, basePath);
    image.draggable = false;
    image.addEventListener("error", () => {
      image.replaceWith(element("span", "footprint-map-place-fallback", i18n.t("noImage")));
    }, { once: true });
    preview.append(image);
  } else {
    preview.append(element("span", "footprint-map-place-fallback", i18n.t("noImage")));
  }
  card.append(
    preview,
    element("span", "footprint-map-place-sequence", String(visit.sequence)),
    element("span", "footprint-map-place-caption", visit.displayTime),
  );
  return card;
};

interface VisitPhotoBrowser {
  element: HTMLElement;
  selectVisit(visit: VisitViewModel): void;
}

export const createVisitPhotoBrowser = (
  resolver: ResourceResolver,
  basePath: string,
  i18n: I18n,
): VisitPhotoBrowser => {
  const region = element("section", "footprint-map-photo-browser");
  region.setAttribute("aria-live", "polite");
  const heading = element("div", "footprint-map-photo-browser-heading");
  const strip = element("div", "footprint-map-photo-strip");
  region.append(heading, strip);
  return {
    element: region,
    selectVisit(visit): void {
      heading.textContent = i18n.t("photoHeading", { sequence: visit.sequence, time: visit.displayTime });
      strip.replaceChildren();
      if (!visit.photos.length) {
        strip.append(element("p", "footprint-map-photo-empty", i18n.t("noPhotos")));
        return;
      }
      for (const photo of visit.photos) {
        const frame = element("figure", "footprint-map-browser-photo");
        const image = element("img");
        image.loading = "lazy";
        image.alt = photo.caption ?? i18n.t("photoAlt", { sequence: visit.sequence });
        image.src = resolver.resolve(photo.path, basePath);
        image.addEventListener("error", () => {
          image.replaceWith(element("div", "footprint-map-photo-placeholder", i18n.t("photoUnavailable")));
        }, { once: true });
        frame.append(image);
        if (photo.caption) frame.append(element("figcaption", undefined, photo.caption));
        strip.append(frame);
      }
      strip.scrollLeft = 0;
    },
  };
};

export const createTimeline = (model: FootprintViewModel, i18n: I18n): HTMLElement => {
  const region = element("section", "footprint-map-timeline");
  region.setAttribute("aria-label", i18n.t("timelineAria"));
  const list = element("ol");
  for (const visit of model.visits) {
    const item = element("li");
    item.dataset.visitId = visit.id;
    item.append(
      element("span", "footprint-map-time", `${i18n.period(visit.displayPeriod)} ${visit.displayTime}`),
      element("span", "footprint-map-visit-label", visit.label ?? i18n.t("visitNumber", { sequence: visit.sequence })),
    );
    list.append(item);
  }
  region.append(list);
  return region;
};

export const selectTimelineVisit = (root: HTMLElement, visitId: string): void => {
  const items = root.querySelectorAll<HTMLElement>(".footprint-map-timeline li");
  for (const item of items) {
    const selected = item.dataset.visitId === visitId;
    item.classList.toggle("is-selected", selected);
    if (selected) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  }
};

interface DisplaySegment {
  source: SequenceSegment;
  from: [number, number];
  to: [number, number];
}

const segmentAngle = (map: LeafletMap, segment: DisplaySegment): number => {
  const from = map.latLngToContainerPoint(segment.from);
  const to = map.latLngToContainerPoint(segment.to);
  return Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
};

const segmentMidpoint = (segment: DisplaySegment): [number, number] => [
  (segment.from[0] + segment.to[0]) / 2,
  (segment.from[1] + segment.to[1]) / 2,
];

export class FootprintMapController implements MapController {
  private readonly map: LeafletMap;
  private readonly root: HTMLElement;
  private readonly issuesRegion: HTMLElement;
  private readonly arrowMarkers: Array<{ marker: Marker; segment: DisplaySegment }> = [];
  private readonly updateArrows: () => void;
  private readonly cleanupInitialFit: () => void;
  private cleanupStaticMap: () => void = () => undefined;
  private tileLayer: TileLayer | undefined;
  private staticImageLayer: ImageOverlay | undefined;
  private tileErrorCount = 0;
  private basemapWarningShown = false;

  constructor(private readonly options: MapRenderOptions) {
    const { container, model, i18n } = options;
    container.replaceChildren();
    this.root = element("section", "footprint-map-root");
    this.root.setAttribute("aria-label", model.title);

    const header = element("header", "footprint-map-header");
    const heading = element("div");
    heading.append(
      element("h3", "footprint-map-title", model.title),
      element("p", "footprint-map-legend", i18n.t("legend")),
    );
    const fitButton = element("button", "footprint-map-fit", i18n.t("fitAll"));
    fitButton.type = "button";
    header.append(heading, fitButton);

    const mapElement = element("div", "footprint-map-canvas");
    mapElement.style.height = `${Math.min(960, Math.max(240, options.height ?? 420))}px`;
    const photoBrowser = createVisitPhotoBrowser(options.resourceResolver, options.resourceBasePath, i18n);
    this.root.append(header, mapElement, photoBrowser.element);
    this.issuesRegion = this.createIssues(model);
    container.append(this.root);

    this.map = L.map(mapElement, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
      zoomSnap: options.amapStaticMap ? 1 : 0.25,
      minZoom: options.amapStaticMap ? 2 : undefined,
      maxZoom: options.amapStaticMap ? 18 : undefined,
    });
    if (options.tileProvider) {
      this.tileLayer = L.tileLayer(options.tileProvider.urlTemplate, {
        attribution: options.tileProvider.attribution,
        maxZoom: options.tileProvider.maxZoom ?? 19,
      });
      this.tileLayer.on("tileerror", this.handleTileError);
      this.tileLayer.addTo(this.map);
    }

    if (options.amapStaticMap) {
      this.configureAMapStaticBasemap(mapElement, options.amapStaticMap);
    }

    const positions = new Map(model.visits.map((visit) => [
      visit.id,
      toLatLng(visit.coordinates, options.coordinateTransform),
    ]));
    const bounds: LatLngBoundsExpression = model.visits.map((visit) => positions.get(visit.id)!);
    for (const segment of model.segments) {
      const displaySegment: DisplaySegment = {
        source: segment,
        from: toLatLng(segment.from, options.coordinateTransform),
        to: toLatLng(segment.to, options.coordinateTransform),
      };
      L.polyline(
        [displaySegment.from, displaySegment.to],
        { color: "#e2673d", weight: 2, opacity: 0.9, dashArray: "9 9", lineCap: "round" },
      ).addTo(this.map);
      const marker = L.marker(segmentMidpoint(displaySegment), {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: "footprint-map-arrow", html: "<span>➤</span>", iconSize: [14, 14], iconAnchor: [7, 7] }),
      }).addTo(this.map);
      this.arrowMarkers.push({ marker, segment: displaySegment });
    }

    for (const visit of model.visits) {
      const markerContent = createVisitMarkerContent(visit, options.resourceResolver, options.resourceBasePath, i18n);
      const marker = L.marker(positions.get(visit.id)!, {
        icon: L.divIcon({
          className: "footprint-map-marker-host",
          html: markerContent,
          iconSize: [64, 84],
          iconAnchor: [32, 84],
        }),
        title: `${visit.sequence}. ${visit.displayTime} ${visit.label ?? i18n.t("visit")}`,
        keyboard: true,
        riseOnHover: true,
      }).addTo(this.map);
      marker.on("click", () => {
        this.root.querySelectorAll(".footprint-map-place-card.is-selected").forEach((node) => node.classList.remove("is-selected"));
        markerContent.classList.add("is-selected");
        selectTimelineVisit(this.root, visit.id);
        photoBrowser.selectVisit(visit);
      });
    }
    this.root.append(createTimeline(model, i18n), this.issuesRegion);
    const firstVisit = model.visits[0];
    if (firstVisit) {
      this.root.querySelector(".footprint-map-place-card")?.classList.add("is-selected");
      selectTimelineVisit(this.root, firstVisit.id);
      photoBrowser.selectVisit(firstVisit);
    }

    const fit = (): void => {
      if (model.visits.length === 1) this.map.setView(positions.get(model.visits[0]!.id)!, 14);
      else this.map.fitBounds(bounds, {
        paddingTopLeft: [48, 104],
        paddingBottomRight: [48, 24],
        maxZoom: 16,
      });
    };
    this.updateArrows = () => {
      for (const { marker, segment } of this.arrowMarkers) {
        const node = marker.getElement()?.querySelector<HTMLElement>("span");
        if (node) node.style.transform = `rotate(${segmentAngle(this.map, segment)}deg)`;
      }
    };
    this.map.on("zoomend moveend", this.updateArrows);
    this.map.whenReady(this.updateArrows);

    let initialFitCompleted = false;
    let layoutTimer: number | undefined;
    let layoutFrame: number | undefined;
    const completeInitialFit = (): void => {
      if (initialFitCompleted) return;
      if (mapElement.clientWidth < 100 || mapElement.clientHeight < 100) return;
      this.map.invalidateSize({ animate: false, pan: false });
      fit();
      initialFitCompleted = true;
      this.cleanupInitialFit();
    };
    const scheduleInitialFit = (): void => {
      if (initialFitCompleted) return;
      if (layoutTimer !== undefined) window.clearTimeout(layoutTimer);
      if (layoutFrame !== undefined) window.cancelAnimationFrame(layoutFrame);
      layoutTimer = window.setTimeout(() => {
        layoutFrame = window.requestAnimationFrame(completeInitialFit);
      }, 100);
    };
    const resizeObserver = new ResizeObserver(scheduleInitialFit);
    this.cleanupInitialFit = (): void => {
      if (layoutTimer !== undefined) window.clearTimeout(layoutTimer);
      if (layoutFrame !== undefined) window.cancelAnimationFrame(layoutFrame);
      resizeObserver.disconnect();
    };
    fitButton.addEventListener("click", () => {
      this.map.invalidateSize({ animate: false, pan: false });
      fit();
    });
    resizeObserver.observe(mapElement);
    scheduleInitialFit();

  }

  private configureAMapStaticBasemap(
    mapElement: HTMLElement,
    config: AMapStaticMapConfig,
  ): void {
    const paneName = "footprint-map-amap-static-basemap";
    const pane = this.map.createPane(paneName);
    pane.classList.add("footprint-map-amap-static-pane");
    this.map.attributionControl.addAttribution('<a href="https://www.amap.com/">AMap</a>');

    let timer: number | undefined;
    let requestSequence = 0;
    let destroyed = false;
    const refresh = (): void => {
      if (destroyed || mapElement.clientWidth < 100 || mapElement.clientHeight < 100) return;
      const center = this.map.getCenter();
      const image = createAMapStaticMapImage({
        key: config.key,
        longitude: center.lng,
        latitude: center.lat,
        leafletZoom: this.map.getZoom(),
        viewportWidth: mapElement.clientWidth,
        viewportHeight: mapElement.clientHeight,
      });
      const sequence = ++requestSequence;
      const nextLayer = L.imageOverlay(image.url, this.map.getBounds(), {
        pane: paneName,
        interactive: false,
      });
      nextLayer.once("load", () => {
        if (destroyed || sequence !== requestSequence) {
          nextLayer.remove();
          return;
        }
        this.staticImageLayer?.remove();
        this.staticImageLayer = nextLayer;
      });
      nextLayer.once("error", () => {
        nextLayer.remove();
        if (!destroyed && sequence === requestSequence) this.showBasemapWarning();
      });
      nextLayer.addTo(this.map);
    };
    const schedule = (): void => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(refresh, 180);
    };
    this.map.on("moveend zoomend", schedule);
    this.map.whenReady(schedule);
    this.cleanupStaticMap = () => {
      destroyed = true;
      requestSequence += 1;
      if (timer !== undefined) window.clearTimeout(timer);
      this.map.off("moveend zoomend", schedule);
      this.staticImageLayer?.remove();
      this.staticImageLayer = undefined;
    };
  }

  private showBasemapWarning(): void {
    if (this.basemapWarningShown) return;
    this.basemapWarningShown = true;
    this.issuesRegion.hidden = false;
    this.issuesRegion.append(element(
      "p",
      "footprint-map-basemap-warning",
      this.options.i18n.t("basemapUnavailable"),
    ));
  }

  private readonly handleTileError = (): void => {
    this.tileErrorCount += 1;
    if (this.tileErrorCount < 3 || !this.tileLayer) return;
    this.tileLayer.off("tileerror", this.handleTileError);
    this.tileLayer.remove();
    this.tileLayer = undefined;
    this.showBasemapWarning();
  };

  private createIssues(model: FootprintViewModel): HTMLElement {
    const region = element("aside", "footprint-map-issues");
    if (!model.issues.length) region.hidden = true;
    for (const item of model.issues) {
      region.append(element("p", undefined, `${item.code}: ${this.options.i18n.issue(item.code, item.message)}`));
    }
    return region;
  }

  destroy(): void {
    this.cleanupInitialFit();
    this.cleanupStaticMap();
    this.tileLayer?.off("tileerror", this.handleTileError);
    this.map.off("zoomend moveend", this.updateArrows);
    this.map.remove();
    this.root.remove();
  }
}

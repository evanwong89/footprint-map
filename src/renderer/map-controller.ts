import L, {
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

export interface MapRenderOptions {
  container: HTMLElement;
  model: FootprintViewModel;
  resourceResolver: ResourceResolver;
  resourceBasePath: string;
  tileProvider?: TileProviderConfig | null;
  height?: number;
  i18n: I18n;
}

const toLatLng = (visit: VisitViewModel): [number, number] => [
  visit.coordinates.latitude,
  visit.coordinates.longitude,
];

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

const segmentAngle = (map: LeafletMap, segment: SequenceSegment): number => {
  const from = map.latLngToContainerPoint([segment.from.latitude, segment.from.longitude]);
  const to = map.latLngToContainerPoint([segment.to.latitude, segment.to.longitude]);
  return Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
};

const segmentMidpoint = (segment: SequenceSegment): [number, number] => [
  (segment.from.latitude + segment.to.latitude) / 2,
  (segment.from.longitude + segment.to.longitude) / 2,
];

export class FootprintMapController implements MapController {
  private readonly map: LeafletMap;
  private readonly root: HTMLElement;
  private readonly issuesRegion: HTMLElement;
  private readonly arrowMarkers: Array<{ marker: Marker; segment: SequenceSegment }> = [];
  private readonly updateArrows: () => void;
  private readonly cleanupInitialFit: () => void;
  private tileLayer: TileLayer | undefined;
  private tileErrorCount = 0;

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
      zoomSnap: 0.25,
    });
    if (options.tileProvider) {
      this.tileLayer = L.tileLayer(options.tileProvider.urlTemplate, {
        attribution: options.tileProvider.attribution,
        maxZoom: options.tileProvider.maxZoom ?? 19,
      });
      this.tileLayer.on("tileerror", this.handleTileError);
      this.tileLayer.addTo(this.map);
    }

    const bounds: LatLngBoundsExpression = model.visits.map(toLatLng);
    for (const segment of model.segments) {
      L.polyline(
        [
          [segment.from.latitude, segment.from.longitude],
          [segment.to.latitude, segment.to.longitude],
        ],
        { color: "#e2673d", weight: 2, opacity: 0.9, dashArray: "9 9", lineCap: "round" },
      ).addTo(this.map);
      const marker = L.marker(segmentMidpoint(segment), {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: "footprint-map-arrow", html: "<span>➤</span>", iconSize: [14, 14], iconAnchor: [7, 7] }),
      }).addTo(this.map);
      this.arrowMarkers.push({ marker, segment });
    }

    for (const visit of model.visits) {
      const markerContent = createVisitMarkerContent(visit, options.resourceResolver, options.resourceBasePath, i18n);
      const marker = L.marker(toLatLng(visit), {
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
      if (model.visits.length === 1) this.map.setView(toLatLng(model.visits[0]!), 14);
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

  private readonly handleTileError = (): void => {
    this.tileErrorCount += 1;
    if (this.tileErrorCount < 3 || !this.tileLayer) return;
    this.tileLayer.off("tileerror", this.handleTileError);
    this.tileLayer.remove();
    this.tileLayer = undefined;
    this.issuesRegion.hidden = false;
    this.issuesRegion.append(element(
      "p",
      "footprint-map-basemap-warning",
      this.options.i18n.t("basemapUnavailable"),
    ));
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
    this.tileLayer?.off("tileerror", this.handleTileError);
    this.map.off("zoomend moveend", this.updateArrows);
    this.map.remove();
    this.root.remove();
  }
}

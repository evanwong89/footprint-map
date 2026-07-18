import type { FootprintViewModel } from "../core/domain";
import { createI18n, type I18n } from "../i18n";

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);

export const renderStaticSvg = (
  model: FootprintViewModel,
  width = 900,
  height = 520,
  i18n: I18n = createI18n("en", "en"),
): string => {
  const padding = 70;
  const longitudes = model.visits.map((visit) => visit.coordinates.longitude);
  const latitudes = model.visits.map((visit) => visit.coordinates.latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.001);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.001);
  const project = ({ longitude, latitude }: { longitude: number; latitude: number }): [number, number] => [
    minLongitude === maxLongitude
      ? width / 2
      : padding + ((longitude - minLongitude) / longitudeRange) * (width - padding * 2),
    minLatitude === maxLatitude
      ? height / 2
      : height - padding - ((latitude - minLatitude) / latitudeRange) * (height - padding * 2),
  ];
  const points = new Map(model.visits.map((visit) => [visit.id, project(visit.coordinates)]));
  const lines = model.segments.map((segment) => {
    const from = points.get(segment.fromId);
    const to = points.get(segment.toId);
    if (!from || !to) return "";
    return `<line x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}" class="sequence" marker-end="url(#arrow)"/>`;
  }).join("");
  const markers = model.visits.map((visit) => {
    const [x, y] = points.get(visit.id) ?? [padding, padding];
    const label = escapeXml(visit.label ?? i18n.t("visitNumber", { sequence: visit.sequence }));
    return `<g transform="translate(${x} ${y})"><circle r="20"/><text class="number" text-anchor="middle" dy="6">${visit.sequence}</text><text class="label" text-anchor="middle" y="38">${escapeXml(visit.displayTime)} · ${label}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(model.title)}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#e2673d"/></marker><style>.background{fill:#f7f3eb}.sequence{stroke:#e2673d;stroke-width:2;stroke-dasharray:9 8;fill:none}.number{font:700 16px system-ui;fill:white}.label{font:600 13px system-ui;fill:#292722;paint-order:stroke;stroke:#f7f3eb;stroke-width:5px;stroke-linejoin:round}circle{fill:#e2673d;stroke:white;stroke-width:4}.title{font:700 22px system-ui;fill:#292722}</style></defs><rect class="background" width="100%" height="100%" rx="18"/><text class="title" x="32" y="40">${escapeXml(model.title)}</text>${lines}${markers}</svg>`;
};

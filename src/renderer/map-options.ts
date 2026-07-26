import type { MapOptions } from "leaflet";

export const createLeafletMapOptions = (usesAMapStaticBasemap: boolean): MapOptions => ({
  zoomControl: true,
  attributionControl: true,
  scrollWheelZoom: true,
  touchZoom: true,
  zoomSnap: 0.25,
  minZoom: usesAMapStaticBasemap ? 2 : undefined,
  maxZoom: usesAMapStaticBasemap ? 18 : undefined,
});

export interface WheelZoomEvent {
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  stopImmediatePropagation(): void;
}

export const isIntentionalWheelZoom = (
  event: Pick<WheelZoomEvent, "ctrlKey" | "metaKey">,
): boolean => event.ctrlKey || event.metaKey;

export const gateWheelZoom = (event: WheelZoomEvent): void => {
  if (isIntentionalWheelZoom(event)) return;

  // Do not prevent the browser's default action: the surrounding document must
  // continue scrolling. Stop only JavaScript propagation before Leaflet sees it.
  event.stopImmediatePropagation();
};

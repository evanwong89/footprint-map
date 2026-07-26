import type { I18n } from "../i18n";
import { element } from "./dom";
import {
  IDENTITY_PHOTO_ZOOM,
  panPhotoBy,
  type PhotoZoomPoint,
  type PhotoZoomTransform,
  zoomPhotoAt,
} from "./photo-zoom";

export interface PhotoLightboxItem {
  src: string;
  alt: string;
  caption?: string;
}

export interface PhotoLightbox {
  open(item: PhotoLightboxItem): void;
  close(): void;
  destroy(): void;
}

export const createPhotoLightbox = (i18n: I18n): PhotoLightbox => {
  const overlay = element("div", "footprint-map-lightbox");
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", i18n.t("photoPreviewDialog"));

  const content = element("div", "footprint-map-lightbox-content");
  const closeButton = element("button", "footprint-map-lightbox-close", "×");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", i18n.t("closePhotoPreview"));
  const viewport = element("div", "footprint-map-lightbox-viewport");
  viewport.tabIndex = 0;
  viewport.setAttribute("aria-label", i18n.t("photoZoomHint"));
  const image = element("img");
  image.draggable = false;
  const caption = element("p", "footprint-map-lightbox-caption");
  const zoomHint = element("p", "footprint-map-lightbox-zoom-hint", i18n.t("photoZoomHint"));
  viewport.append(image);
  content.append(closeButton, viewport, caption, zoomHint);
  overlay.append(content);
  overlay.ownerDocument.body.append(overlay);

  let previousFocus: HTMLElement | null = null;
  let transform: PhotoZoomTransform = { ...IDENTITY_PHOTO_ZOOM };
  const pointers = new Map<number, PhotoZoomPoint>();
  let lastPanPoint: PhotoZoomPoint | undefined;
  let pinchStart:
    | {
      distance: number;
      midpoint: PhotoZoomPoint;
      transform: PhotoZoomTransform;
    }
    | undefined;

  const viewportSize = (): { width: number; height: number } => ({
    width: viewport.clientWidth,
    height: viewport.clientHeight,
  });
  const applyTransform = (): void => {
    image.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
    viewport.classList.toggle("is-zoomed", transform.scale > 1);
  };
  const resetTransform = (): void => {
    transform = { ...IDENTITY_PHOTO_ZOOM };
    pointers.clear();
    lastPanPoint = undefined;
    pinchStart = undefined;
    applyTransform();
  };
  const midpoint = (left: PhotoZoomPoint, right: PhotoZoomPoint): PhotoZoomPoint => ({
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  });
  const distance = (left: PhotoZoomPoint, right: PhotoZoomPoint): number => (
    Math.hypot(right.x - left.x, right.y - left.y)
  );
  const startPinch = (): void => {
    const [left, right] = [...pointers.values()];
    if (!left || !right) return;
    pinchStart = {
      distance: Math.max(1, distance(left, right)),
      midpoint: midpoint(left, right),
      transform: { ...transform },
    };
    lastPanPoint = undefined;
  };
  const localPoint = (event: PointerEvent | WheelEvent): PhotoZoomPoint => {
    const bounds = viewport.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const close = (): void => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.ownerDocument.removeEventListener("keydown", handleKeydown);
    resetTransform();
    previousFocus?.focus();
    previousFocus = null;
  };
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    const size = viewportSize();
    const center = { x: size.width / 2, y: size.height / 2 };
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      transform = zoomPhotoAt(transform, transform.scale * 1.25, center, size);
      applyTransform();
    } else if (event.key === "-") {
      event.preventDefault();
      transform = zoomPhotoAt(transform, transform.scale / 1.25, center, size);
      applyTransform();
    } else if (event.key === "0") {
      event.preventDefault();
      resetTransform();
    }
  };
  image.addEventListener("load", () => {
    window.requestAnimationFrame(resetTransform);
  });
  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? Math.max(1, viewport.clientHeight)
        : 1);
    transform = zoomPhotoAt(
      transform,
      transform.scale * Math.exp(-delta * 0.002),
      localPoint(event),
      viewportSize(),
    );
    applyTransform();
  }, { passive: false });
  viewport.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    viewport.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    pointers.set(event.pointerId, point);
    if (pointers.size >= 2) startPinch();
    else lastPanPoint = point;
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    const point = localPoint(event);
    pointers.set(event.pointerId, point);
    if (pointers.size >= 2) {
      if (!pinchStart) startPinch();
      const [left, right] = [...pointers.values()];
      if (!left || !right || !pinchStart) return;
      const currentMidpoint = midpoint(left, right);
      const nextScale = pinchStart.transform.scale
        * distance(left, right)
        / pinchStart.distance;
      transform = zoomPhotoAt(
        pinchStart.transform,
        nextScale,
        pinchStart.midpoint,
        viewportSize(),
      );
      transform = panPhotoBy(transform, {
        x: currentMidpoint.x - pinchStart.midpoint.x,
        y: currentMidpoint.y - pinchStart.midpoint.y,
      }, viewportSize());
      applyTransform();
      return;
    }
    if (lastPanPoint && transform.scale > 1) {
      transform = panPhotoBy(transform, {
        x: point.x - lastPanPoint.x,
        y: point.y - lastPanPoint.y,
      }, viewportSize());
      applyTransform();
    }
    lastPanPoint = point;
  });
  const releasePointer = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    pinchStart = undefined;
    const remaining = [...pointers.values()][0];
    lastPanPoint = remaining;
  };
  viewport.addEventListener("pointerup", releasePointer);
  viewport.addEventListener("pointercancel", releasePointer);
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  return {
    open(item): void {
      const activeElement = overlay.ownerDocument.activeElement;
      previousFocus = activeElement && "focus" in activeElement
        ? activeElement as HTMLElement
        : null;
      image.src = item.src;
      image.alt = item.alt;
      resetTransform();
      caption.textContent = item.caption ?? "";
      caption.hidden = !item.caption;
      overlay.hidden = false;
      overlay.ownerDocument.addEventListener("keydown", handleKeydown);
      closeButton.focus();
    },
    close,
    destroy(): void {
      close();
      overlay.remove();
    },
  };
};

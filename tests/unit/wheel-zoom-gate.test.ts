import { describe, expect, it, vi } from "vitest";
import { gateWheelZoom, isIntentionalWheelZoom } from "../../src/renderer/wheel-zoom-gate";

describe("wheel zoom intent gate", () => {
  it("leaves plain wheel events to the surrounding document", () => {
    const stopImmediatePropagation = vi.fn();

    gateWheelZoom({ ctrlKey: false, metaKey: false, stopImmediatePropagation });

    expect(stopImmediatePropagation).toHaveBeenCalledOnce();
  });

  it("allows trackpad pinch and Ctrl/Command wheel events to reach Leaflet", () => {
    expect(isIntentionalWheelZoom({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isIntentionalWheelZoom({ ctrlKey: false, metaKey: true })).toBe(true);

    const stopImmediatePropagation = vi.fn();
    gateWheelZoom({ ctrlKey: true, metaKey: false, stopImmediatePropagation });
    gateWheelZoom({ ctrlKey: false, metaKey: true, stopImmediatePropagation });

    expect(stopImmediatePropagation).not.toHaveBeenCalled();
  });
});

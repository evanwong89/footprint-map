import { describe, expect, it } from "vitest";
import { createI18n, resolveLocale } from "../../src/i18n";

describe("internationalization", () => {
  it("uses English as the automatic fallback", () => {
    expect(resolveLocale("auto", "fr")).toBe("en");
    expect(resolveLocale("auto", undefined)).toBe("en");
  });

  it("follows a Chinese Obsidian locale in automatic mode", () => {
    expect(resolveLocale("auto", "zh-cn")).toBe("zh-CN");
    expect(createI18n("auto", "zh-cn").t("fitAll")).toBe("适配全部点位");
  });

  it("allows an explicit language to override the host locale", () => {
    const i18n = createI18n("en", "zh-cn");
    expect(i18n.t("fitAll")).toBe("Fit all places");
    expect(i18n.period("afternoon")).toBe("Afternoon");
  });

  it("interpolates variables and preserves stable error codes", () => {
    const i18n = createI18n("en", "en");
    expect(i18n.t("visitNumber", { sequence: 3 })).toBe("Place 3");
    expect(i18n.error(new Error("FM_SOURCE_REQUIRED: source 是必填路径。")))
      .toBe("FM_SOURCE_REQUIRED: source is required.");
  });
});

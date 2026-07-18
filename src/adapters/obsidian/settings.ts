import { App, Notice, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import type { LanguagePreference } from "../../i18n";
import type { FootprintMapPlugin } from "./plugin";

export type TileProviderName = "osm" | "amap" | "custom";

export interface FootprintMapSettings {
  language: LanguagePreference;
  defaultTileProvider: TileProviderName;
  amapKeySecretId: string;
  amapSecurityJsCodeSecretId: string;
  customTileUrl: string;
  customTileAttribution: string;
  customTileMaxZoom: number;
}

export const DEFAULT_SETTINGS: FootprintMapSettings = {
  language: "auto",
  defaultTileProvider: "osm",
  amapKeySecretId: "",
  amapSecurityJsCodeSecretId: "",
  customTileUrl: "",
  customTileAttribution: "",
  customTileMaxZoom: 19,
};

export class FootprintMapSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: FootprintMapPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const i18n = this.plugin.getI18n();
    new Setting(containerEl)
      .setName(i18n.t("language"))
      .setDesc(i18n.t("languageDesc"))
      .addDropdown((dropdown) => dropdown
        .addOption("auto", i18n.t("languageAuto"))
        .addOption("en", i18n.t("languageEnglish"))
        .addOption("zh-CN", i18n.t("languageChinese"))
        .setValue(this.plugin.settings.language)
        .onChange(async (value) => {
          this.plugin.settings.language = value as LanguagePreference;
          await this.plugin.saveSettings();
          const nextI18n = this.plugin.getI18n();
          new Notice(`Footprint Map: ${nextI18n.t("languageChanged")}`, 8000);
          this.display();
        }));
    new Setting(containerEl)
      .setName(i18n.t("defaultBasemap"))
      .setDesc(i18n.t("defaultBasemapDesc"))
      .addDropdown((dropdown) => dropdown
        .addOption("osm", i18n.t("osmProvider"))
        .addOption("amap", i18n.t("amapProvider"))
        .addOption("custom", i18n.t("customProvider"))
        .setValue(this.plugin.settings.defaultTileProvider)
        .onChange(async (value) => {
          this.plugin.settings.defaultTileProvider = value as TileProviderName;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName(i18n.t("amapKey"))
      .setDesc(i18n.t("amapKeyDesc"))
      .addComponent((container) => new SecretComponent(this.app, container)
        .setValue(this.plugin.settings.amapKeySecretId)
        .onChange(async (value) => {
          this.plugin.settings.amapKeySecretId = value.trim();
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName(i18n.t("amapSecurityCode"))
      .setDesc(i18n.t("amapSecurityCodeDesc"))
      .addComponent((container) => new SecretComponent(this.app, container)
        .setValue(this.plugin.settings.amapSecurityJsCodeSecretId)
        .onChange(async (value) => {
          this.plugin.settings.amapSecurityJsCodeSecretId = value.trim();
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName(i18n.t("customTileUrl"))
      .setDesc(i18n.t("customTileUrlDesc"))
      .addText((text) => {
        text.setPlaceholder("https://example.com/{z}/{x}/{y}.png")
          .setValue(this.plugin.settings.customTileUrl)
          .onChange(async (value) => {
            this.plugin.settings.customTileUrl = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.autocomplete = "off";
      });
    new Setting(containerEl)
      .setName(i18n.t("customTileAttribution"))
      .setDesc(i18n.t("customTileAttributionDesc"))
      .addText((text) => text
        .setPlaceholder(i18n.t("customTileAttributionPlaceholder"))
        .setValue(this.plugin.settings.customTileAttribution)
        .onChange(async (value) => {
          this.plugin.settings.customTileAttribution = value.trim();
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName(i18n.t("customTileMaxZoom"))
      .setDesc(i18n.t("customTileMaxZoomDesc"))
      .addSlider((slider) => slider
        .setLimits(1, 24, 1)
        .setDynamicTooltip()
        .setValue(this.plugin.settings.customTileMaxZoom)
        .onChange(async (value) => {
          this.plugin.settings.customTileMaxZoom = value;
          await this.plugin.saveSettings();
        }));
  }
}

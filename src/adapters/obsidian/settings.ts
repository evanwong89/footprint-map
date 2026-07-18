import {
  App,
  Notice,
  PluginSettingTab,
  SecretComponent,
  Setting,
  type SettingDefinitionItem,
  type SettingDefinitionRender,
} from "obsidian";
import type { LanguagePreference } from "../../i18n";
import type { FootprintMapPlugin } from "./plugin";

export type TileProviderName = "osm" | "amap" | "custom";

export interface FootprintMapSettings {
  language: LanguagePreference;
  defaultTileProvider: TileProviderName;
  amapWebServiceKeySecretId: string;
  customTileUrl: string;
  customTileAttribution: string;
  customTileMaxZoom: number;
}

export const DEFAULT_SETTINGS: FootprintMapSettings = {
  language: "auto",
  defaultTileProvider: "osm",
  amapWebServiceKeySecretId: "",
  customTileUrl: "",
  customTileAttribution: "",
  customTileMaxZoom: 19,
};

export class FootprintMapSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: FootprintMapPlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const i18n = this.plugin.getI18n();
    return [
      {
        name: i18n.t("language"),
        desc: i18n.t("languageDesc"),
        render: (setting) => { setting.addDropdown((dropdown) => dropdown
          .addOption("auto", i18n.t("languageAuto"))
          .addOption("en", i18n.t("languageEnglish"))
          .addOption("zh-CN", i18n.t("languageChinese"))
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as LanguagePreference;
            await this.plugin.saveSettings();
            const nextI18n = this.plugin.getI18n();
            new Notice(`Footprint Map: ${nextI18n.t("languageChanged")}`, 8000);
            this.renderSettings();
          })); },
      },
      {
        name: i18n.t("defaultBasemap"),
        desc: i18n.t("defaultBasemapDesc"),
        render: (setting) => { setting.addDropdown((dropdown) => dropdown
          .addOption("osm", i18n.t("osmProvider"))
          .addOption("amap", i18n.t("amapProvider"))
          .addOption("custom", i18n.t("customProvider"))
          .setValue(this.plugin.settings.defaultTileProvider)
          .onChange(async (value) => {
            this.plugin.settings.defaultTileProvider = value as TileProviderName;
            await this.plugin.saveSettings();
          })); },
      },
      {
        name: i18n.t("amapKey"),
        desc: i18n.t("amapKeyDesc"),
        render: (setting) => { setting.addComponent((container) => new SecretComponent(this.app, container)
          .setValue(this.plugin.settings.amapWebServiceKeySecretId)
          .onChange(async (value) => {
            this.plugin.settings.amapWebServiceKeySecretId = value.trim();
            await this.plugin.saveSettings();
          })); },
      },
      {
        name: i18n.t("customTileUrl"),
        desc: i18n.t("customTileUrlDesc"),
        render: (setting) => { setting.addText((input) => {
          input.setPlaceholder("https://example.com/{z}/{x}/{y}.png")
            .setValue(this.plugin.settings.customTileUrl)
            .onChange(async (value) => {
              this.plugin.settings.customTileUrl = value.trim();
              await this.plugin.saveSettings();
            });
          input.inputEl.autocomplete = "off";
        }); },
      },
      {
        name: i18n.t("customTileAttribution"),
        desc: i18n.t("customTileAttributionDesc"),
        render: (setting) => { setting.addText((input) => input
          .setPlaceholder(i18n.t("customTileAttributionPlaceholder"))
          .setValue(this.plugin.settings.customTileAttribution)
          .onChange(async (value) => {
            this.plugin.settings.customTileAttribution = value.trim();
            await this.plugin.saveSettings();
          })); },
      },
      {
        name: i18n.t("customTileMaxZoom"),
        desc: i18n.t("customTileMaxZoomDesc"),
        render: (setting) => { setting.addSlider((slider) => slider
          .setLimits(1, 24, 1)
          .setValue(this.plugin.settings.customTileMaxZoom)
          .onChange(async (value) => {
            this.plugin.settings.customTileMaxZoom = value;
            await this.plugin.saveSettings();
          })); },
      },
    ];
  }

  /** Compatibility fallback for Obsidian versions before the declarative settings API. */
  display(): void {
    this.renderSettings();
  }

  private renderSettings(): void {
    this.containerEl.empty();
    for (const definition of this.getSettingDefinitions() as SettingDefinitionRender[]) {
      const setting = new Setting(this.containerEl).setName(definition.name);
      if (definition.desc) setting.setDesc(definition.desc);
      definition.render(setting, undefined as never);
    }
  }
}

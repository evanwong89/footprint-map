import { MarkdownRenderChild, type Vault } from "obsidian";
import { loadFootprint } from "../../application/load-footprint";
import {
  OPEN_STREET_MAP_TILES,
  resolveCustomTileProvider,
  type TileProviderConfig,
} from "../../platform/tile-provider";
import { element } from "../../renderer/dom";
import { FootprintMapController } from "../../renderer/map-controller";
import { AMapController } from "../../renderer/amap-map-controller";
import type { MapController } from "../../renderer/controller";
import type { ConfigWarning, FootprintMapBlockConfig } from "./code-block-config";
import { ObsidianFileStore } from "./obsidian-file-store";
import { ObsidianResourceResolver } from "./obsidian-resources";
import { resolveVaultPath } from "./vault-path";
import type { FootprintMapSettings } from "./settings";
import type { I18n } from "../../i18n";
import type { AMapCredentials } from "../../renderer/amap-loader";

export class FootprintRenderChild extends MarkdownRenderChild {
  private controller?: MapController;

  constructor(
    containerEl: HTMLElement,
    private readonly vault: Vault,
    private readonly config: FootprintMapBlockConfig,
    private readonly markdownSourcePath: string,
    private readonly settings: FootprintMapSettings,
    private readonly amapCredentials: AMapCredentials,
    private readonly i18n: I18n,
  ) {
    super(containerEl);
  }

  onload(): void {
    void this.render();
  }

  onunload(): void {
    this.controller?.destroy();
  }

  private async render(): Promise<void> {
    try {
      const geoJsonPath = resolveVaultPath(this.config.source, this.markdownSourcePath);
      const fileStore = new ObsidianFileStore(this.vault);
      const model = loadFootprint(await fileStore.readText(geoJsonPath));
      const renderModel = this.config.title ? { ...model, title: this.config.title } : model;
      const resourceResolver = new ObsidianResourceResolver(this.vault);
      const provider = this.config.tileProvider ?? this.settings.defaultTileProvider;
      const warnings: Array<string | ConfigWarning> = [...this.config.warnings];
      const renderWithoutAMap = (tileProvider: TileProviderConfig | null): void => {
        this.controller = new FootprintMapController({
          container: this.containerEl,
          model: renderModel,
          resourceResolver,
          resourceBasePath: geoJsonPath,
          tileProvider,
          height: this.config.height,
          i18n: this.i18n,
        });
      };
      if (!this.config.tiles) {
        renderWithoutAMap(null);
      } else if (provider === "amap") {
        try {
          this.controller = await AMapController.create({
            container: this.containerEl,
            model: renderModel,
            resourceResolver,
            resourceBasePath: geoJsonPath,
            credentials: this.amapCredentials,
            height: this.config.height,
            i18n: this.i18n,
          });
        } catch (error) {
          warnings.push(`${this.i18n.t("amapUnavailable")} ${this.i18n.error(error)}`);
          if (!this.amapCredentials.securityJsCode) {
            warnings.push(this.i18n.t("amapSecurityCodeMissing"));
          }
          renderWithoutAMap(null);
        }
      } else if (provider === "custom") {
        const resolution = resolveCustomTileProvider({
          urlTemplate: this.settings.customTileUrl,
          attribution: this.settings.customTileAttribution,
          maxZoom: this.settings.customTileMaxZoom,
        });
        if (resolution.warning) warnings.push(this.i18n.t(resolution.warning));
        renderWithoutAMap(resolution.provider);
      } else {
        renderWithoutAMap(OPEN_STREET_MAP_TILES);
      }
      if (warnings.length) {
        const warningRegion = element("aside", "footprint-map-issues");
        for (const warning of warnings) {
          const message = typeof warning === "string"
            ? warning
            : this.i18n.t("warningUnknownField", { field: warning.field });
          warningRegion.append(element("p", undefined, message));
        }
        this.containerEl.append(warningRegion);
      }
    } catch (error) {
      this.renderFallback(error);
    }
  }

  private renderFallback(error: unknown): void {
    this.containerEl.replaceChildren();
    const panel = element("section", "footprint-map-error");
    panel.append(
      element("h3", undefined, this.config.title ?? this.i18n.t("mapLoadFailed")),
      element("pre", undefined, this.i18n.error(error)),
    );
    if (this.config.fallback) {
      const image = element("img");
      image.alt = this.i18n.t("staticPreviewAlt", { title: this.config.title ?? this.i18n.t("mapName") });
      image.src = new ObsidianResourceResolver(this.vault).resolve(this.config.fallback, this.markdownSourcePath);
      panel.append(image);
    }
    this.containerEl.append(panel);
  }
}

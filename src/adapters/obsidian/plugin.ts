import { Notice, Plugin, TFile, moment, normalizePath, type Editor, type MarkdownFileInfo } from "obsidian";
import { extractEmbeddedPhotoLinks } from "../../application/extract-photo-links";
import { generateFromPhotos, mergeGeneratedVisits } from "../../application/generate-from-photos";
import type { FootprintDocument, FootprintVisit } from "../../core/domain";
import { serializeFootprintGeoJson } from "../../core/serialize-footprint";
import { validateFootprintGeoJson } from "../../core/validate-footprint";
import { ExifrPhotoMetadataReader } from "../../metadata/exifr-reader";
import { createI18n, type I18n } from "../../i18n";
import { parseCodeBlockConfig } from "./code-block-config";
import { FootprintRenderChild } from "./footprint-render-child";
import { basename, dirname, resolveVaultPath } from "./vault-path";
import { DEFAULT_SETTINGS, FootprintMapSettingTab, type FootprintMapSettings } from "./settings";

const isSupportedPhoto = (file: TFile): boolean => ["jpg", "jpeg", "heic", "png"].includes(file.extension.toLowerCase());

type LegacyFootprintMapSettings = Partial<FootprintMapSettings> & {
  amapKey?: unknown;
  amapSecurityJsCode?: unknown;
  amapKeySecretId?: unknown;
  amapSecurityJsCodeSecretId?: unknown;
};

export class FootprintMapPlugin extends Plugin {
  settings: FootprintMapSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();
    const i18n = this.getI18n();
    this.addSettingTab(new FootprintMapSettingTab(this.app, this));
    this.registerMarkdownCodeBlockProcessor("footprint-map", (source, element, context) => {
      try {
        const config = parseCodeBlockConfig(source);
        context.addChild(new FootprintRenderChild(
          element,
          this.app.vault,
          config,
          context.sourcePath,
          this.settings,
          this.getAMapWebServiceKey(),
          this.getI18n(),
        ));
      } catch (error) {
        element.createEl("pre", { text: this.getI18n().error(error) });
      }
    });

    this.addCommand({
      id: "generate-from-active-note-photos",
      name: i18n.t("commandGenerate"),
      editorCallback: (editor, view) => {
        void this.generateForActiveNote(editor, view).catch((error: unknown) => {
          console.error("Footprint Map generation failed", error);
          new Notice(`Footprint Map: ${this.getI18n().error(error)}`, 10000);
        });
      },
    });

  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  getAMapWebServiceKey(): string {
    return this.settings.amapWebServiceKeySecretId
      ? this.app.secretStorage.getSecret(this.settings.amapWebServiceKeySecretId)?.trim() ?? ""
      : "";
  }

  getI18n(): I18n {
    return createI18n(this.settings.language, moment.locale());
  }

  private async loadSettings(): Promise<void> {
    const stored = (await this.loadData() ?? {}) as LegacyFootprintMapSettings;
    const migrated = [
      "amapKey",
      "amapSecurityJsCode",
      "amapKeySecretId",
      "amapSecurityJsCodeSecretId",
    ].some((field) => Object.hasOwn(stored, field));
    const {
      amapKey: _legacyKey,
      amapSecurityJsCode: _legacySecurityCode,
      amapKeySecretId: _legacyKeySecretId,
      amapSecurityJsCodeSecretId: _legacySecurityCodeSecretId,
      ...current
    } = stored;
    this.settings = { ...DEFAULT_SETTINGS, ...current };
    if (migrated) await this.saveSettings();
  }

  private async generateForActiveNote(editor: Editor, view: MarkdownFileInfo): Promise<void> {
    const note = view.file;
    const i18n = this.getI18n();
    if (!note) {
      new Notice(`Footprint Map: ${i18n.t("noMarkdownFile")}`);
      return;
    }
    const markdown = editor.getValue();
    const linkTexts = extractEmbeddedPhotoLinks(markdown);
    const files = linkTexts.flatMap((link): TFile[] => {
      const file = this.app.metadataCache.getFirstLinkpathDest(link, note.path);
      return file instanceof TFile && isSupportedPhoto(file) ? [file] : [];
    });
    const uniqueFiles = [...new Map(files.map((file) => [file.path, file])).values()];
    if (!uniqueFiles.length) {
      new Notice(`Footprint Map: ${i18n.t("noEmbeddedPhotos")}`);
      return;
    }

    const inputs = await Promise.all(uniqueFiles.map(async (file) => ({
      path: file.path,
      bytes: await this.app.vault.readBinary(file),
    })));
    const generated = await generateFromPhotos(inputs, new ExifrPhotoMetadataReader());
    const noteDirectory = dirname(note.path);
    const outputPath = normalizePath(`${noteDirectory ? `${noteDirectory}/` : ""}${note.basename}.footprint.geojson`);
    const existing = await this.readExistingVisits(outputPath);
    if (!generated.visits.length && !existing.length) {
      throw new Error(i18n.t("noGeneratedVisits"));
    }
    const now = new Date().toISOString();
    const document: FootprintDocument = {
      schemaVersion: "1.0",
      title: i18n.t("generatedTitle", { name: note.basename }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      createdAt: now,
      visits: mergeGeneratedVisits(existing, generated.visits),
    };
    const serialized = `${JSON.stringify(serializeFootprintGeoJson(document), null, 2)}\n`;
    const current = this.app.vault.getAbstractFileByPath(outputPath);
    if (current instanceof TFile) await this.app.vault.process(current, () => serialized);
    else await this.app.vault.create(outputPath, serialized);

    const source = basename(outputPath);
    if (!markdown.includes("```footprint-map")) {
      editor.replaceRange(
        `\n\n\`\`\`footprint-map\nsource: ${source}\nheight: 420\ntitle: ${i18n.t("generatedTitle", { name: note.basename })}\n\`\`\`\n`,
        { line: editor.lastLine(), ch: editor.getLine(editor.lastLine()).length },
      );
    }
    new Notice(
      `Footprint Map: ${i18n.t("generatedSummary", { visits: generated.visits.length, issues: generated.issues.length })}`,
      8000,
    );
  }

  private async readExistingVisits(path: string): Promise<readonly FootprintVisit[]> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return [];
    try {
      const validation = validateFootprintGeoJson(JSON.parse(await this.app.vault.cachedRead(file)));
      if (!validation.document) throw new Error(validation.issues.map(({ message }) => message).join("；"));
      return validation.document.visits;
    } catch {
      throw new Error(`FM_EXISTING_DATA_INVALID: ${path} 无法解析，为避免覆盖已停止生成。`);
    }
  }

}

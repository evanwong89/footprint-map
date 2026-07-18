import { normalizePath, TFile, type Vault } from "obsidian";
import type { FileStore } from "../../platform/file-store";

export class ObsidianFileStore implements FileStore {
  constructor(private readonly vault: Vault) {}

  async readText(path: string): Promise<string> {
    return this.vault.cachedRead(this.requireFile(path));
  }

  async readBinary(path: string): Promise<ArrayBuffer> {
    return this.vault.readBinary(this.requireFile(path));
  }

  async writeText(path: string, content: string): Promise<void> {
    const normalized = normalizePath(path);
    const existing = this.vault.getAbstractFileByPath(normalized);
    if (existing instanceof TFile) await this.vault.process(existing, () => content);
    else await this.vault.create(normalized, content);
  }

  async exists(path: string): Promise<boolean> {
    return this.vault.getAbstractFileByPath(normalizePath(path)) instanceof TFile;
  }

  private requireFile(path: string): TFile {
    const file = this.vault.getAbstractFileByPath(normalizePath(path));
    if (!(file instanceof TFile)) throw new Error(`FM_SOURCE_NOT_FOUND: 找不到 ${path}`);
    return file;
  }
}

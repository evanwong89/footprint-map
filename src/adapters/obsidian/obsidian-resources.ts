import { normalizePath, TFile, type Vault } from "obsidian";
import type { ResourceResolver } from "../../platform/resource-resolver";
import { resolveVaultPath } from "./vault-path";

export class ObsidianResourceResolver implements ResourceResolver {
  constructor(private readonly vault: Vault) {}

  resolve(path: string, basePath: string): string {
    if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")) return "about:blank#remote-resources-disabled";
    const rootCandidate = normalizePath(path.replace(/^\//, ""));
    const relativeCandidate = normalizePath(resolveVaultPath(path, basePath));
    const file = this.vault.getAbstractFileByPath(rootCandidate) ?? this.vault.getAbstractFileByPath(relativeCandidate);
    return file instanceof TFile ? this.vault.getResourcePath(file) : "about:blank#footprint-photo-missing";
  }
}

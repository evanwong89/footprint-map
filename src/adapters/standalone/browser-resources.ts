import type { ResourceResolver } from "../../platform/resource-resolver";

export class BrowserResourceResolver implements ResourceResolver {
  resolve(path: string, basePath: string): string {
    return new URL(path, new URL(basePath, window.location.href)).href;
  }
}

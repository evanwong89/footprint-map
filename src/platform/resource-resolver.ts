export interface ResourceResolver {
  resolve(path: string, basePath: string): string;
}

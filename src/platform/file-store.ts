export interface FileStore {
  readText(path: string): Promise<string>;
  readBinary(path: string): Promise<ArrayBuffer>;
  writeText(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

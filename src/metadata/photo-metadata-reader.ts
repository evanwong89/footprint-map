export interface PhotoMetadata {
  latitude: number;
  longitude: number;
  capturedAt: string;
}

export interface PhotoMetadataReader {
  read(input: ArrayBuffer | Uint8Array): Promise<PhotoMetadata>;
}

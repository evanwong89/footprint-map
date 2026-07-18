import exifr from "exifr";
import type { PhotoMetadata, PhotoMetadataReader } from "./photo-metadata-reader";
import { normalizeCapturedAt } from "./normalize-captured-at";

interface ExifTimeData {
  DateTimeOriginal?: unknown;
  CreateDate?: unknown;
  OffsetTimeOriginal?: unknown;
  OffsetTimeDigitized?: unknown;
}

export class ExifrPhotoMetadataReader implements PhotoMetadataReader {
  async read(input: ArrayBuffer | Uint8Array): Promise<PhotoMetadata> {
    const [gps, time] = await Promise.all([
      exifr.gps(input),
      exifr.parse(input, {
        exif: { pick: ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal", "OffsetTimeDigitized"] },
        mergeOutput: true,
      }) as Promise<ExifTimeData | undefined>,
    ]);
    if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) {
      throw new Error("FM_EXIF_GPS_MISSING: 照片没有可用 GPS。");
    }
    const capturedAt = normalizeCapturedAt(
      time?.DateTimeOriginal ?? time?.CreateDate,
      time?.OffsetTimeOriginal ?? time?.OffsetTimeDigitized,
    );
    if (!capturedAt) {
      throw new Error("FM_EXIF_TIMEZONE_REQUIRED: 照片时间缺少明确 UTC 偏移，未进行猜测。");
    }
    return { latitude: gps.latitude, longitude: gps.longitude, capturedAt };
  }
}

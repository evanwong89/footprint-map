const ascii = (value: string): Uint8Array => new TextEncoder().encode(value);

const writeAscii = (target: Uint8Array, offset: number, value: string): void => {
  target.set(ascii(value), offset);
};

const writeEntry = (
  view: DataView,
  offset: number,
  tag: number,
  type: number,
  count: number,
  value: number,
): void => {
  view.setUint16(offset, tag, true);
  view.setUint16(offset + 2, type, true);
  view.setUint32(offset + 4, count, true);
  view.setUint32(offset + 8, value, true);
};

const writeRationalTriplet = (
  view: DataView,
  offset: number,
  values: readonly [number, number, number],
): void => {
  values.forEach((value, index) => {
    view.setUint32(offset + index * 8, Math.round(value * 100), true);
    view.setUint32(offset + index * 8 + 4, 100, true);
  });
};

export interface SyntheticExifOptions {
  latitudeRef?: "N" | "S";
  longitudeRef?: "E" | "W";
}

export const buildSyntheticTiff = (options: SyntheticExifOptions = {}): Uint8Array => {
  const latitudeRef = options.latitudeRef ?? "N";
  const longitudeRef = options.longitudeRef ?? "E";
  const tiff = new Uint8Array(198);
  const view = new DataView(tiff.buffer);
  writeAscii(tiff, 0, "II");
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);

  const ifd0 = 8;
  const exifIfd = 38;
  const gpsIfd = 68;
  view.setUint16(ifd0, 2, true);
  writeEntry(view, ifd0 + 2, 34665, 4, 1, exifIfd);
  writeEntry(view, ifd0 + 14, 34853, 4, 1, gpsIfd);
  view.setUint32(ifd0 + 26, 0, true);

  view.setUint16(exifIfd, 2, true);
  writeEntry(view, exifIfd + 2, 36867, 2, 20, 122);
  writeEntry(view, exifIfd + 14, 36881, 2, 7, 142);
  view.setUint32(exifIfd + 26, 0, true);

  view.setUint16(gpsIfd, 4, true);
  writeEntry(view, gpsIfd + 2, 1, 2, 2, latitudeRef.charCodeAt(0));
  writeEntry(view, gpsIfd + 14, 2, 5, 3, 150);
  writeEntry(view, gpsIfd + 26, 3, 2, 2, longitudeRef.charCodeAt(0));
  writeEntry(view, gpsIfd + 38, 4, 5, 3, 174);
  view.setUint32(gpsIfd + 50, 0, true);

  writeAscii(tiff, 122, "2026:07:17 09:20:30\0");
  writeAscii(tiff, 142, "+08:00\0");
  writeRationalTriplet(view, 150, [31, 13, 48]);
  writeRationalTriplet(view, 174, [121, 28, 12]);
  return tiff;
};

export const buildSyntheticJpeg = (options: SyntheticExifOptions = {}): Uint8Array => {
  const tiff = buildSyntheticTiff(options);
  const output = new Uint8Array(2 + 2 + 2 + 6 + tiff.length + 2);
  const view = new DataView(output.buffer);
  output.set([0xff, 0xd8, 0xff, 0xe1], 0);
  view.setUint16(4, 8 + tiff.length, false);
  writeAscii(output, 6, "Exif\0\0");
  output.set(tiff, 12);
  output.set([0xff, 0xd9], output.length - 2);
  return output;
};

const box = (type: string, payload: Uint8Array): Uint8Array => {
  const output = new Uint8Array(8 + payload.length);
  const view = new DataView(output.buffer);
  view.setUint32(0, output.length, false);
  writeAscii(output, 4, type);
  output.set(payload, 8);
  return output;
};

const concat = (...parts: readonly Uint8Array[]): Uint8Array => {
  const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};

const crc32 = (input: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type: string, payload: Uint8Array): Uint8Array => {
  const typeBytes = ascii(type);
  const output = new Uint8Array(12 + payload.length);
  const view = new DataView(output.buffer);
  view.setUint32(0, payload.length, false);
  output.set(typeBytes, 4);
  output.set(payload, 8);
  view.setUint32(8 + payload.length, crc32(concat(typeBytes, payload)), false);
  return output;
};

export const buildSyntheticPng = (options: SyntheticExifOptions = {}): Uint8Array => {
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, 1, false);
  ihdrView.setUint32(4, 1, false);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return concat(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("eXIf", buildSyntheticTiff(options)),
    pngChunk("IEND", new Uint8Array()),
  );
};

const fullBoxPayload = (version: number, rest: Uint8Array): Uint8Array =>
  concat(new Uint8Array([version, 0, 0, 0]), rest);

const buildIloc = (extentOffset: number, extentLength: number): Uint8Array => {
  const rest = new Uint8Array(18);
  const view = new DataView(rest.buffer);
  rest[0] = 0x44;
  rest[1] = 0;
  view.setUint16(2, 1, false);
  view.setUint16(4, 2, false);
  view.setUint16(6, 0, false);
  view.setUint16(8, 1, false);
  view.setUint32(10, extentOffset, false);
  view.setUint32(14, extentLength, false);
  return box("iloc", fullBoxPayload(0, rest));
};

export const buildSyntheticHeic = (options: SyntheticExifOptions = {}): Uint8Array => {
  const ftyp = box("ftyp", concat(ascii("heic"), new Uint8Array(4), ascii("heic")));
  const infeRest = new Uint8Array(9);
  const infeView = new DataView(infeRest.buffer);
  infeView.setUint16(0, 2, false);
  infeView.setUint16(2, 0, false);
  writeAscii(infeRest, 4, "Exif");
  infeRest[8] = 0;
  const infe = box("infe", fullBoxPayload(2, infeRest));
  const iinfRest = new Uint8Array(2);
  new DataView(iinfRest.buffer).setUint16(0, 1, false);
  const iinf = box("iinf", fullBoxPayload(0, concat(iinfRest, infe)));
  const placeholderIloc = buildIloc(0, 0);
  const placeholderMeta = box("meta", fullBoxPayload(0, concat(iinf, placeholderIloc)));
  const tiff = buildSyntheticTiff(options);
  const extent = concat(new Uint8Array(4), tiff);
  const extentOffset = ftyp.length + placeholderMeta.length + 8;
  const iloc = buildIloc(extentOffset, extent.length);
  const meta = box("meta", fullBoxPayload(0, concat(iinf, iloc)));
  const mdat = box("mdat", extent);
  return concat(ftyp, meta, mdat);
};

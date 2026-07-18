import type { FootprintViewModel } from "../core/domain";

export type AMapPosition = readonly [longitude: number, latitude: number];

const EARTH_SEMI_MAJOR_AXIS = 6_378_245;
const ECCENTRICITY_SQUARED = 0.006693421622965943;

const isOutsideMainlandChina = (longitude: number, latitude: number): boolean => (
  longitude < 72.004
  || longitude > 137.8347
  || latitude < 0.8293
  || latitude > 55.8271
);

const transformLatitude = (longitudeOffset: number, latitudeOffset: number): number => {
  let output = -100
    + 2 * longitudeOffset
    + 3 * latitudeOffset
    + 0.2 * latitudeOffset * latitudeOffset
    + 0.1 * longitudeOffset * latitudeOffset
    + 0.2 * Math.sqrt(Math.abs(longitudeOffset));
  output += (20 * Math.sin(6 * longitudeOffset * Math.PI) + 20 * Math.sin(2 * longitudeOffset * Math.PI)) * 2 / 3;
  output += (20 * Math.sin(latitudeOffset * Math.PI) + 40 * Math.sin(latitudeOffset / 3 * Math.PI)) * 2 / 3;
  output += (160 * Math.sin(latitudeOffset / 12 * Math.PI) + 320 * Math.sin(latitudeOffset * Math.PI / 30)) * 2 / 3;
  return output;
};

const transformLongitude = (longitudeOffset: number, latitudeOffset: number): number => {
  let output = 300
    + longitudeOffset
    + 2 * latitudeOffset
    + 0.1 * longitudeOffset * longitudeOffset
    + 0.1 * longitudeOffset * latitudeOffset
    + 0.1 * Math.sqrt(Math.abs(longitudeOffset));
  output += (20 * Math.sin(6 * longitudeOffset * Math.PI) + 20 * Math.sin(2 * longitudeOffset * Math.PI)) * 2 / 3;
  output += (20 * Math.sin(longitudeOffset * Math.PI) + 40 * Math.sin(longitudeOffset / 3 * Math.PI)) * 2 / 3;
  output += (150 * Math.sin(longitudeOffset / 12 * Math.PI) + 300 * Math.sin(longitudeOffset / 30 * Math.PI)) * 2 / 3;
  return output;
};

/** Convert photo GPS coordinates (WGS84) to the GCJ-02 coordinates used by AMap. */
export const wgs84ToGcj02 = (longitude: number, latitude: number): AMapPosition => {
  if (isOutsideMainlandChina(longitude, latitude)) return [longitude, latitude];
  let latitudeDelta = transformLatitude(longitude - 105, latitude - 35);
  let longitudeDelta = transformLongitude(longitude - 105, latitude - 35);
  const latitudeRadians = latitude / 180 * Math.PI;
  const sine = Math.sin(latitudeRadians);
  const magic = 1 - ECCENTRICITY_SQUARED * sine * sine;
  const squareRootMagic = Math.sqrt(magic);
  latitudeDelta = latitudeDelta * 180
    / ((EARTH_SEMI_MAJOR_AXIS * (1 - ECCENTRICITY_SQUARED)) / (magic * squareRootMagic) * Math.PI);
  longitudeDelta = longitudeDelta * 180
    / (EARTH_SEMI_MAJOR_AXIS / squareRootMagic * Math.cos(latitudeRadians) * Math.PI);
  return [longitude + longitudeDelta, latitude + latitudeDelta];
};

export const convertCoordinates = (model: FootprintViewModel): Map<string, AMapPosition> => {
  const output = new Map<string, AMapPosition>();
  for (const visit of model.visits) {
    output.set(
      visit.id,
      wgs84ToGcj02(visit.coordinates.longitude, visit.coordinates.latitude),
    );
  }
  return output;
};

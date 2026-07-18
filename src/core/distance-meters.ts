import type { FootprintVisit } from "./domain";

const EARTH_RADIUS_METERS = 6_371_008.8;
const radians = (degrees: number): number => degrees * (Math.PI / 180);

export const distanceMeters = (
  left: FootprintVisit["coordinates"],
  right: FootprintVisit["coordinates"],
): number => {
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const leftLatitude = radians(left.latitude);
  const rightLatitude = radians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
};

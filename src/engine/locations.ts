export type Place = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  id?: number;
};
export function parseCoordinates(text: string): Place | null {
  const m = text
    .trim()
    .match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const latitude = Number(m[1]),
    longitude = Number(m[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
    return null;
  return { name: `${latitude}°, ${longitude}°`, latitude, longitude };
}
export function parsePlaces(value: unknown): Place[] {
  if (
    !value ||
    typeof value !== "object" ||
    !("results" in value) ||
    !Array.isArray(value.results)
  )
    return [];
  return value.results
    .filter(
      (v): v is Place =>
        !!v &&
        typeof v.name === "string" &&
        typeof v.latitude === "number" &&
        typeof v.longitude === "number" &&
        Number.isFinite(v.latitude) &&
        Number.isFinite(v.longitude) &&
        Math.abs(v.latitude) <= 90 &&
        Math.abs(v.longitude) <= 180,
    )
    .slice(0, 8);
}

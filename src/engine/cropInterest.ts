import { ATLAS_CROPS, type AtlasCropId } from "../data/atlas";
import type { Farm } from "./types";

export function isCropInterest(value: unknown): value is AtlasCropId {
  return typeof value === "string" && ATLAS_CROPS.some(crop => crop.id === value);
}

/** A reference choice is a preference, never an edit to the farmer's baseline. */
export function withCropInterest(farm: Farm, value: string): Farm {
  if (value !== "" && !isCropInterest(value)) throw Error("Unknown crop reference");
  return { ...farm, cropInterest: value || undefined };
}

export function cropInterestScope(value: string) {
  if (["maize", "wheat", "mung"].includes(value)) return "annual";
  if (["citrus", "mango"].includes(value)) return "perennial";
  return "reference";
}

import "server-only";
import type { Vehicle } from "../domain/models";
import {
  profileImageEntries,
  profileVehicles,
} from "../domain/profile-fixtures";

export interface VehicleImage {
  url: string;
  alt: string;
  attribution?: string;
  licence?: string;
  sourceUrl?: string;
  isIllustrative: boolean;
}
export interface VehicleImageProvider {
  findImage(
    vehicle: Vehicle,
    size?: "thumb" | "medium",
  ): Promise<VehicleImage | null>;
}
interface CatalogueEntry {
  brand: string;
  brand_name: string;
  model: string;
  name: string;
  sizes: string[];
  formats: string[];
}
interface Catalogue {
  base: string;
  template: string;
  models: CatalogueEntry[];
}
const CATALOGUE_URL = "https://dobbygl.github.io/allbrands-api/v1/catalog.json";
let cache: { value: Catalogue | null; until: number } | null = null;
export async function retrieveCatalogue(
  fetcher: typeof fetch = fetch,
): Promise<Catalogue | null> {
  if (cache && cache.until > Date.now()) return cache.value;
  try {
    const response = await fetcher(CATALOGUE_URL, {
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) throw new Error("Catalogue unavailable");
    const value: Catalogue = await response.json();
    if (
      !Array.isArray(value.models) ||
      !value.template?.startsWith("https://dobbygl.github.io/allbrands-api/")
    )
      throw new Error("Invalid catalogue");
    cache = { value, until: Date.now() + 60 * 60 * 1000 };
    return value;
  } catch {
    cache = { value: null, until: Date.now() + 60 * 1000 };
    return null;
  }
}
export function resetCatalogueCacheForTests() {
  cache = null;
}
const normalized = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
export function resolveEntry(
  catalogue: Catalogue,
  vehicle: Pick<Vehicle, "make" | "model">,
): CatalogueEntry | undefined {
  return catalogue.models.find(
    (entry) =>
      normalized(entry.brand_name) === normalized(vehicle.make) &&
      normalized(entry.name) === normalized(vehicle.model),
  );
}
function metadata(vehicle: Vehicle, url: string): VehicleImage {
  return {
    url,
    alt: `Representative illustration of ${vehicle.make} ${vehicle.model}`,
    attribution: "AllBrands",
    licence: "CC BY 4.0",
    sourceUrl: "https://github.com/dobbygl/allbrands-api",
    isIllustrative: true,
  };
}
export const allBrandsImages: VehicleImageProvider = {
  async findImage(vehicle, size = "medium") {
    // A verified local copy makes the three fixed profile fixtures work offline.
    const fixtureIndex = profileVehicles.findIndex(
      (item) =>
        item.id === vehicle.id &&
        item.make === vehicle.make &&
        item.model === vehicle.model,
    );
    if (fixtureIndex >= 0)
      return metadata(vehicle, profileImageEntries[fixtureIndex].path);
    const catalogue = await retrieveCatalogue();
    if (!catalogue) return null;
    const entry = resolveEntry(catalogue, vehicle);
    if (
      !entry ||
      !entry.sizes.includes(size) ||
      !entry.formats.includes("webp")
    )
      return null;
    return metadata(
      vehicle,
      catalogue.template
        .replace("{base}", catalogue.base)
        .replace("{brand}", entry.brand)
        .replace("{model}", entry.model)
        .replace("{size}", size)
        .replace("{format}", "webp"),
    );
  },
};

import type { Vehicle } from "./models";

// Verified against the published AllBrands v1 catalogue on 2026-09-21.
// These are illustrative profiles, not AutoQuotes vehicles.
export const profileVehicles: readonly Vehicle[] = [
  {
    id: "illustrative-toyota-rav4",
    make: "Toyota",
    model: "RAV4",
    fuel: "unknown",
    demonstration: true,
    source: "illustrative-profile",
  },
  {
    id: "illustrative-toyota-camry",
    make: "Toyota",
    model: "Camry",
    fuel: "unknown",
    demonstration: true,
    source: "illustrative-profile",
  },
  {
    id: "illustrative-tesla-model-3",
    make: "Tesla",
    model: "Model 3",
    fuel: "electric",
    demonstration: true,
    source: "illustrative-profile",
  },
];
export const profileImageEntries = [
  { brand: "toyota", model: "rav4", path: "/vehicles/toyota-rav4.webp" },
  { brand: "toyota", model: "camry", path: "/vehicles/toyota-camry.webp" },
  { brand: "tesla", model: "model-3", path: "/vehicles/tesla-model-3.webp" },
] as const;

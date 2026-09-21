import type { Vehicle } from "./models";

// Verified against the published AllBrands v1 catalogue on 2026-09-21.
// These are synthetic demo registry vehicles used only to seed a new profile.
// Existing garages are never reseeded or overwritten.
export const profileVehicles: readonly Vehicle[] = [
  {
    id: "DEMO3",
    vehicleId: "DEMO3",
    year: 2022,
    make: "Toyota",
    model: "RAV4",
    fuel: "petrol-diesel",
    energyType: "hybrid",
    demonstration: true,
    source: "synthetic-lookup",
    dataProvenance: { identity: "synthetic-demo", technical: "unavailable" },
  },
  {
    id: "DEMO4",
    vehicleId: "DEMO4",
    year: 2021,
    make: "Toyota",
    model: "Camry",
    fuel: "petrol-diesel",
    energyType: "petrol",
    demonstration: true,
    source: "synthetic-lookup",
    dataProvenance: { identity: "synthetic-demo", technical: "unavailable" },
  },
  {
    id: "DEMO5",
    vehicleId: "DEMO5",
    year: 2023,
    make: "Tesla",
    model: "Model 3",
    fuel: "electric",
    energyType: "electric",
    demonstration: true,
    source: "synthetic-lookup",
    dataProvenance: { identity: "synthetic-demo", technical: "unavailable" },
  },
];
export const profileImageEntries = [
  { brand: "toyota", model: "rav4", path: "/vehicles/toyota-rav4.webp" },
  { brand: "toyota", model: "camry", path: "/vehicles/toyota-camry.webp" },
  { brand: "tesla", model: "model-3", path: "/vehicles/tesla-model-3.webp" },
] as const;

import { z } from "zod";
import type { Vehicle } from "../../domain/models";

export const autoQuotesVehicleSchema = z.object({
  VehicleID: z.string().min(1),
  Make: z.string().min(1),
  Model: z.string().min(1),
  Series: z.string(),
  Engine: z.string(),
  StartYear: z.string(),
  EndYear: z.string(),
  YearRange: z.string(),
  Year: z.string(),
  Details: z.string(),
  Chassis: z.string(),
  CountryOfOrigin: z.string(),
  VIN: z.string(),
  MID: z.string(),
  VehicleTypeText: z.string(),
});
export const vehicleEnvelopeSchema = z.object({
  Result: z.array(autoQuotesVehicleSchema),
  IsSuccess: z.boolean(),
  ErrorCode: z.string().nullable(),
  ErrorMessage: z.string().nullable(),
});
export type AutoQuotesVehicleDto = z.infer<typeof autoQuotesVehicleSchema>;

// The supplied BYD examples use a selection-result shape, not the
// GetVehicleByRego transport above. Keep the contracts separate and normalize
// only at the application boundary.
export const autoQuotesVehicleSelectionSchema = z.object({
  Make: z.object({ Id: z.string(), Name: z.string() }),
  Model: z.object({
    Id: z.union([z.string(), z.number()]),
    Name: z.string(),
    SubBody: z.string(),
    Year: z.number(),
  }),
  Litres: z.number(),
  FuelType: z.string(),
  ExtraInfo: z.string(),
  EngineCode: z.string(),
  Kw: z.string(),
  Tuning: z.string(),
  Rpm: z.string(),
  DinHp: z.string(),
  StartYear: z.string(),
  EndYear: z.string(),
  Mid: z.string(),
  VehicleType: z.string(),
  TypeAbreviation: z.string(),
  IsNonStandard: z.boolean(),
  IsUnserviceable: z.boolean(),
  VehicleTypeDescription: z.string(),
  VehicleTypeText: z.string(),
  SortOrder: z.number(),
});
export type AutoQuotesVehicleSelectionDto = z.infer<
  typeof autoQuotesVehicleSelectionSchema
>;

export function normalizeVehicle(
  dto: AutoQuotesVehicleDto,
  registration?: string,
  source: Vehicle["source"] = "autoquotes-mock",
): Vehicle {
  const year = Number(dto.Year);
  const titleCase = (value: string) =>
    value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    id: dto.VehicleID,
    vehicleId: dto.VehicleID,
    mid: dto.MID || undefined,
    year:
      Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : undefined,
    make: titleCase(dto.Make),
    model: titleCase(dto.Model),
    registration,
    fuel: /diesel|petrol/i.test(dto.VehicleTypeText)
      ? "petrol-diesel"
      : /electric/i.test(dto.VehicleTypeText)
        ? "electric"
        : "unknown",
    energyType: /diesel/i.test(dto.VehicleTypeText)
      ? "diesel"
      : /petrol/i.test(dto.VehicleTypeText)
        ? "petrol"
        : /electric/i.test(dto.VehicleTypeText)
          ? "electric"
          : /hybrid/i.test(dto.VehicleTypeText)
            ? "hybrid"
            : "unknown",
    details: dto.Details.trim() || undefined,
    technicalDetails: { engine: dto.Engine || undefined },
    dataProvenance: {
      identity: "supplied-sample",
      technical: "supplied-sample",
    },
    demonstration: source !== "asq",
    source,
  };
}

export function normalizeVehicleSelection(
  dto: AutoQuotesVehicleSelectionDto,
  registration: string,
  selectedYear: number,
  variant: string,
): Vehicle {
  return {
    id: registration,
    vehicleId: registration,
    mid: dto.Mid,
    year: selectedYear,
    make: dto.Make.Name,
    model: dto.Model.Name,
    variant,
    registration,
    fuel: "electric",
    energyType: "electric",
    details: `${variant} · ${dto.ExtraInfo}`,
    technicalDetails: {
      engine: dto.EngineCode || undefined,
      capacity: dto.ExtraInfo || undefined,
      powerKw: dto.Kw || undefined,
    },
    dataProvenance: {
      identity: "supplied-sample",
      technical: "supplied-sample",
    },
    demonstration: true,
    source: "autoquotes-mock",
  };
}

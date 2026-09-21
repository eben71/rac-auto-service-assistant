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
    details: dto.Details.trim() || undefined,
    demonstration: source !== "asq",
    source,
  };
}

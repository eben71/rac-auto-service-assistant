import { z } from "zod";

export const customerSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(80),
  lastName: z.string().trim().min(1, "Enter your last name").max(80),
  email: z.email("Enter a valid email address"),
});
export const registrationSchema = z
  .string()
  .trim()
  .min(2)
  .max(12)
  .regex(/^[a-zA-Z0-9 -]+$/);
export const vehicleSchema = z.object({
  id: z.string().min(1),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().min(1),
  model: z.string().min(1),
  registration: z.string().optional(),
  fuel: z.enum(["petrol-diesel", "electric", "unknown"]),
  demonstration: z.boolean(),
  vehicleId: z.string().optional(),
  mid: z.string().optional(),
  details: z.string().optional(),
  source: z
    .enum([
      "autoquotes-live",
      "autoquotes-mock",
      "illustrative-profile",
      "synthetic-lookup",
    ])
    .optional(),
  customerDetails: z
    .object({
      year: z.number().int().min(1900).max(2100).optional(),
      colour: z.string().trim().max(40).optional(),
      odometerKm: z.number().int().min(0).max(2_000_000).optional(),
      nickname: z.string().trim().max(40).optional(),
    })
    .optional(),
});
export const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(["main", "additional"]),
  evOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
  availableOnline: z.boolean().optional(),
  demonstration: z.boolean(),
});
export const vehicleResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("found"), vehicle: vehicleSchema }),
  z.object({
    status: z.literal("multiple"),
    vehicles: z.array(vehicleSchema).min(2),
  }),
  z.object({ status: z.literal("not-found") }),
  z.object({ status: z.literal("unavailable"), message: z.string() }),
]);
export const vehicleDetailsInputSchema = z.object({
  year: z.union([
    z.literal(""),
    z.coerce
      .number()
      .int()
      .min(1900, "Enter a year from 1900")
      .max(2100, "Enter a year up to 2100"),
  ]),
  colour: z.string().trim().max(40, "Colour must be 40 characters or fewer"),
  odometerKm: z.union([
    z.literal(""),
    z.coerce
      .number()
      .int("Enter a whole number")
      .min(0, "Odometer cannot be negative")
      .max(2_000_000, "Odometer must be 2,000,000 km or less"),
  ]),
  nickname: z
    .string()
    .trim()
    .max(40, "Nickname must be 40 characters or fewer"),
});
export const catalogueResponseSchema = z.object({
  items: z.array(serviceSchema),
  demonstration: z.boolean(),
});

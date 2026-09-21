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
    .enum(["autoquotes-mock", "illustrative-profile", "synthetic-lookup"])
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
  z.object({ status: z.literal("not-found") }),
  z.object({ status: z.literal("unavailable"), message: z.string() }),
]);
export const catalogueResponseSchema = z.object({
  items: z.array(serviceSchema),
  demonstration: z.boolean(),
});

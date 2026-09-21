import "server-only";
import type { AutoQuotesAdapter } from "./contracts";
import { mockAutoQuotes } from "./mock";
import { realAutoQuotes } from "./real";

export function getVehicleLookupAdapter(): AutoQuotesAdapter {
  const provider = process.env.AUTOQUOTES_VEHICLE_PROVIDER ?? "mock";
  if (provider === "mock") return mockAutoQuotes;
  if (provider === "live") return realAutoQuotes;
  throw new Error("Unknown AutoQuotes vehicle provider configuration.");
}
export function getMockServiceAdapter(): AutoQuotesAdapter {
  return mockAutoQuotes;
}

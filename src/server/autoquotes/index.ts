import "server-only";
import type { AutoQuotesAdapter } from "./contracts";
import { mockAutoQuotes } from "./mock";
import { realAutoQuotes } from "./real";
export function getAutoQuotesAdapter(): AutoQuotesAdapter {
  const provider = process.env.AUTOQUOTES_PROVIDER ?? "mock";
  if (provider === "mock") return mockAutoQuotes;
  if (provider === "real") return realAutoQuotes;
  throw new Error("Unknown AutoQuotes provider configuration.");
}
export function getVehicleLookupAdapter(): AutoQuotesAdapter {
  const provider =
    process.env.AUTOQUOTES_VEHICLE_PROVIDER ??
    process.env.AUTOQUOTES_PROVIDER ??
    "mock";
  if (provider === "mock") return mockAutoQuotes;
  if (provider === "live") return realAutoQuotes;
  throw new Error("Unknown AutoQuotes vehicle provider configuration.");
}
export function getMockServiceAdapter(): AutoQuotesAdapter {
  const provider = process.env.AUTOQUOTES_SERVICE_PROVIDER ?? "mock";
  if (provider !== "mock")
    throw new Error("Only the mock service provider is available.");
  return mockAutoQuotes;
}

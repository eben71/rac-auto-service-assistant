import "server-only";
import type { AutoQuotesAdapter } from "./contracts";
import { mockAutoQuotes } from "./mock";

export function getVehicleLookupAdapter(): AutoQuotesAdapter {
  return mockAutoQuotes;
}

export function getMockServiceAdapter(): AutoQuotesAdapter {
  return mockAutoQuotes;
}

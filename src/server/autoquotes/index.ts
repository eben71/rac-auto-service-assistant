import "server-only";
import { getVehicleByRegistration } from "@/server/asq/vehicle";
import type { AutoQuotesAdapter } from "./contracts";
import { mockAutoQuotes } from "./mock";

/** @deprecated Registration lookup now calls ASQ directly. */
export function getVehicleLookupAdapter(): AutoQuotesAdapter {
  return {
    ...mockAutoQuotes,
    async lookupRegistration(registration) {
      try {
        const vehicle = await getVehicleByRegistration(registration);
        return vehicle ? { status: "found", vehicle } : { status: "not-found" };
      } catch {
        return {
          status: "unavailable",
          message: "Vehicle lookup is temporarily unavailable.",
        };
      }
    },
  };
}

export function getMockServiceAdapter(): AutoQuotesAdapter {
  return mockAutoQuotes;
}

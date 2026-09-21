import "server-only";
import type { AutoQuotesAdapter } from "./contracts";

function unavailable(): never {
  throw new Error(
    "AutoQuotes is not configured: approved endpoint, authentication and OpenAPI contract mapping are required.",
  );
}
export const realAutoQuotes: AutoQuotesAdapter = {
  async lookupRegistration() {
    return unavailable();
  },
  async selectMakeModel() {
    return unavailable();
  },
  async getCatalogue() {
    return unavailable();
  },
  async getSchedules() {
    return unavailable();
  },
};
// TODO: map approved OpenAPI DTOs to domain models and validate at this boundary.

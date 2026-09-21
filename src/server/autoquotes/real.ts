import "server-only";
import type { AutoQuotesAdapter, VehicleLookupResult } from "./contracts";
import { normalizeVehicle, vehicleEnvelopeSchema } from "./vehicle-transport";

const allowedHosts = new Set(["ractest.com.au"]);
type LiveEnvironment = Record<string, string | undefined>;

export function liveVehicleConfiguration(
  environment: LiveEnvironment = process.env,
) {
  const rawBaseUrl = environment.AUTOQUOTES_BASE_URL?.trim();
  const key = environment.AUTOQUOTES_SUBSCRIPTION_KEY?.trim();
  const header = environment.AUTOQUOTES_SUBSCRIPTION_KEY_HEADER?.trim();
  if (!rawBaseUrl || !key || !header) return null;
  let baseUrl: URL;
  try {
    baseUrl = new URL(rawBaseUrl);
  } catch {
    return null;
  }
  if (
    baseUrl.protocol !== "https:" ||
    !allowedHosts.has(baseUrl.hostname.toLowerCase()) ||
    baseUrl.username ||
    baseUrl.password ||
    !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(header)
  )
    return null;
  const configuredTimeout = Number(environment.AUTOQUOTES_TIMEOUT_MS ?? 5000);
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(15_000, Math.max(1_000, configuredTimeout))
    : 5_000;
  return { baseUrl, key, header, timeoutMs };
}

export function createLiveRegistrationLookup(
  fetcher: typeof fetch = fetch,
  environment: LiveEnvironment = process.env,
) {
  return async (registration: string): Promise<VehicleLookupResult> => {
    const configuration = liveVehicleConfiguration(environment);
    if (!configuration)
      return {
        status: "unavailable",
        message: "Live vehicle lookup is not configured.",
      };
    const normalizedRegistration = registration
      .trim()
      .replace(/[\s-]/g, "")
      .toUpperCase();
    try {
      const url = new URL(
        "/api/autoservicesbooking/GetVehicleByRego",
        configuration.baseUrl,
      );
      url.searchParams.set("registrationNumber", normalizedRegistration);
      const response = await fetcher(url, {
        method: "GET",
        headers: {
          [configuration.header]: configuration.key,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(configuration.timeoutMs),
      });
      if (!response.ok)
        return {
          status: "unavailable",
          message: "Vehicle lookup is temporarily unavailable.",
        };
      const parsed = vehicleEnvelopeSchema.safeParse(await response.json());
      if (!parsed.success || !parsed.data.IsSuccess)
        return {
          status: "unavailable",
          message: "Vehicle lookup is temporarily unavailable.",
        };
      if (parsed.data.Result.length === 0) return { status: "not-found" };
      const vehicles = parsed.data.Result.map((item) =>
        normalizeVehicle(item, normalizedRegistration, "autoquotes-live"),
      );
      return vehicles.length === 1
        ? { status: "found", vehicle: vehicles[0] }
        : { status: "multiple", vehicles };
    } catch (error) {
      return {
        status: "unavailable",
        message:
          error instanceof DOMException && error.name === "TimeoutError"
            ? "Vehicle lookup timed out. Please try again."
            : "Vehicle lookup is temporarily unavailable.",
      };
    }
  };
}

function unavailable(): never {
  throw new Error("Only live registration lookup is implemented.");
}
export const realAutoQuotes: AutoQuotesAdapter = {
  lookupRegistration: createLiveRegistrationLookup(),
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

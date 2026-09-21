import "server-only";

import { randomUUID } from "node:crypto";
import { registrationSchema } from "@/domain/schemas";
import {
  type AutoQuotesVehicleDto,
  vehicleEnvelopeSchema,
} from "@/server/autoquotes/vehicle-transport";
import { getAsqAccessToken } from "./token";

const ASQ_HOST_ALLOWLIST = new Set(["api-sit.ractest.com.au"]);
const DEFAULT_TIMEOUT_MS = 10_000;

export interface AsqVehicleDetails {
  id: string;
  vehicleId: string;
  registration: string;
  registrationNumber: string;
  make: string;
  model: string;
  series: string;
  engine: string;
  startYear: string;
  endYear: string;
  yearRange: string;
  year?: number;
  details: string;
  chassis: string;
  countryOfOrigin: string;
  vin: string;
  mid: string;
  vehicleType: string;
  fuel: "petrol-diesel" | "electric" | "unknown";
  demonstration: false;
  source: "asq";
}

export type AsqVehicleLookupErrorCode =
  | "ASQ_NOT_CONFIGURED"
  | "ASQ_AUTHENTICATION_FAILED"
  | "ASQ_REQUEST_FAILED"
  | "ASQ_REQUEST_TIMEOUT"
  | "ASQ_RESPONSE_INVALID"
  | "ASQ_RESPONSE_REJECTED"
  | "ASQ_AMBIGUOUS_RESULT";

export class AsqVehicleLookupError extends Error {
  constructor(
    message: string,
    readonly code: AsqVehicleLookupErrorCode,
    readonly status: number,
    readonly correlationId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AsqVehicleLookupError";
  }
}

interface AsqConfiguration {
  baseUrl: URL;
  vehicleEndpoint: string;
  apiKey: string;
  authScope: string;
  managedIdentityClientId: string;
  correlationIdHeader: string;
}

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function getAsqConfiguration(): AsqConfiguration {
  const baseUrl = new URL(requiredEnvironmentValue("NEXT_PUBLIC_ASQ_BASE_URL"));
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username ||
    baseUrl.password ||
    !ASQ_HOST_ALLOWLIST.has(baseUrl.hostname.toLowerCase())
  ) {
    throw new Error("NEXT_PUBLIC_ASQ_BASE_URL is not an approved ASQ URL.");
  }

  const vehicleEndpoint = requiredEnvironmentValue(
    "NEXT_PUBLIC_ASQ_VEHICLE_ENDPOINT",
  ).replace(/^\/+|\/+$/g, "");
  if (
    !/^[A-Za-z0-9/_-]+$/.test(vehicleEndpoint) ||
    vehicleEndpoint.split("/").some((segment) => segment === "..")
  ) {
    throw new Error("NEXT_PUBLIC_ASQ_VEHICLE_ENDPOINT is invalid.");
  }

  const correlationIdHeader = requiredEnvironmentValue(
    "NEXT_PUBLIC_CORRELATION_ID_HEADER",
  );
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(correlationIdHeader)) {
    throw new Error("NEXT_PUBLIC_CORRELATION_ID_HEADER is invalid.");
  }

  return {
    baseUrl,
    vehicleEndpoint,
    apiKey: requiredEnvironmentValue("ASQ_API_KEY"),
    authScope: requiredEnvironmentValue("ASQ_AUTH_SCOPE"),
    managedIdentityClientId: requiredEnvironmentValue(
      "ASQ_MANAGED_IDENTITY_CLIENT_ID",
    ),
    correlationIdHeader,
  };
}

function normalizeVehicle(
  vehicle: AutoQuotesVehicleDto,
  registrationNumber: string,
): AsqVehicleDetails {
  const year = Number(vehicle.Year);
  const titleCase = (value: string) =>
    value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    id: vehicle.VehicleID,
    vehicleId: vehicle.VehicleID,
    registration: registrationNumber,
    registrationNumber,
    make: titleCase(vehicle.Make),
    model: titleCase(vehicle.Model),
    series: vehicle.Series,
    engine: vehicle.Engine,
    startYear: vehicle.StartYear,
    endYear: vehicle.EndYear,
    yearRange: vehicle.YearRange,
    year:
      Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : undefined,
    details: vehicle.Details,
    chassis: vehicle.Chassis,
    countryOfOrigin: vehicle.CountryOfOrigin,
    vin: vehicle.VIN,
    mid: vehicle.MID,
    vehicleType: vehicle.VehicleTypeText,
    fuel: /diesel|petrol/i.test(vehicle.VehicleTypeText)
      ? "petrol-diesel"
      : /electric/i.test(vehicle.VehicleTypeText)
        ? "electric"
        : "unknown",
    demonstration: false,
    source: "asq",
  };
}

export async function getVehicleByRegistration(
  registrationNumber: string,
): Promise<AsqVehicleDetails | null> {
  const correlationId = randomUUID();
  const registration = registrationSchema.safeParse(registrationNumber);
  if (!registration.success) {
    throw new AsqVehicleLookupError(
      "Enter a valid registration number.",
      "ASQ_REQUEST_FAILED",
      400,
      correlationId,
    );
  }

  let configuration: AsqConfiguration;
  try {
    configuration = getAsqConfiguration();
  } catch (error) {
    throw new AsqVehicleLookupError(
      "ASQ vehicle lookup is not configured correctly.",
      "ASQ_NOT_CONFIGURED",
      503,
      correlationId,
      { cause: error },
    );
  }

  let accessToken: string;
  try {
    accessToken = await getAsqAccessToken(
      configuration.authScope,
      configuration.managedIdentityClientId,
    );
  } catch (error) {
    throw new AsqVehicleLookupError(
      "Unable to authenticate with the ASQ service.",
      "ASQ_AUTHENTICATION_FAILED",
      503,
      correlationId,
      { cause: error },
    );
  }

  const url = new URL(
    `${configuration.vehicleEndpoint}/GetVehicleByRego`,
    `${configuration.baseUrl.origin}/`,
  );
  url.searchParams.set("registrationNumber", registration.data.trim());
  url.searchParams.set("correlationId", correlationId);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-API-Key": configuration.apiKey,
        [configuration.correlationIdHeader]: correlationId,
        "Source-System": "NextJS-ASB",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    throw new AsqVehicleLookupError(
      timedOut
        ? "The ASQ vehicle lookup timed out."
        : "The ASQ vehicle lookup request failed.",
      timedOut ? "ASQ_REQUEST_TIMEOUT" : "ASQ_REQUEST_FAILED",
      503,
      correlationId,
      { cause: error },
    );
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new AsqVehicleLookupError(
      `ASQ vehicle lookup failed with HTTP status ${response.status}.`,
      "ASQ_REQUEST_FAILED",
      502,
      correlationId,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new AsqVehicleLookupError(
      "ASQ returned an unreadable response.",
      "ASQ_RESPONSE_INVALID",
      502,
      correlationId,
      { cause: error },
    );
  }

  const parsed = vehicleEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    throw new AsqVehicleLookupError(
      "ASQ returned an unexpected vehicle response.",
      "ASQ_RESPONSE_INVALID",
      502,
      correlationId,
    );
  }
  if (!parsed.data.IsSuccess) {
    throw new AsqVehicleLookupError(
      "ASQ could not complete the vehicle lookup.",
      "ASQ_RESPONSE_REJECTED",
      502,
      correlationId,
    );
  }
  if (parsed.data.Result.length === 0) return null;
  if (parsed.data.Result.length > 1) {
    throw new AsqVehicleLookupError(
      "ASQ returned more than one vehicle for this registration.",
      "ASQ_AMBIGUOUS_RESULT",
      409,
      correlationId,
    );
  }
  return normalizeVehicle(parsed.data.Result[0], registration.data.trim());
}

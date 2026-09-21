import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getMockServiceAdapter, getVehicleLookupAdapter } from "./index";
import { demoVehicle, vehicleLookupDto } from "./mock";
import { createLiveRegistrationLookup, liveVehicleConfiguration } from "./real";

const liveEnvironment = {
  AUTOQUOTES_BASE_URL: "https://ractest.com.au",
  AUTOQUOTES_SUBSCRIPTION_KEY: "test-secret",
  AUTOQUOTES_SUBSCRIPTION_KEY_HEADER: "X-Test-Subscription-Key",
  AUTOQUOTES_TIMEOUT_MS: "2500",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  delete process.env.AUTOQUOTES_PROVIDER;
  delete process.env.AUTOQUOTES_VEHICLE_PROVIDER;
  delete process.env.AUTOQUOTES_SERVICE_PROVIDER;
});

describe("live AutoQuotes registration lookup", () => {
  it("calls the approved endpoint server-side and normalizes the supplied response contract", async () => {
    const fetcher = vi.fn(
      async (input: URL | RequestInfo, init?: RequestInit) => {
        void input;
        void init;
        return response(vehicleLookupDto);
      },
    );
    const result = await createLiveRegistrationLookup(
      fetcher as typeof fetch,
      liveEnvironment,
    )(" 1gdu-034 ");

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe(
      "https://ractest.com.au/api/autoservicesbooking/GetVehicleByRego?registrationNumber=1GDU034",
    );
    expect(init?.headers).toEqual({
      "X-Test-Subscription-Key": "test-secret",
      Accept: "application/json",
    });
    expect(result).toEqual({
      status: "found",
      vehicle: expect.objectContaining({
        id: "53275",
        vehicleId: "53275",
        mid: "MIT39408",
        make: "Mitsubishi",
        model: "Pajero Sport",
        year: 2016,
        registration: "1GDU034",
        source: "autoquotes-live",
        demonstration: false,
      }),
    });
  });

  it("returns all matching candidates instead of selecting the first", async () => {
    const second = {
      ...vehicleLookupDto.Result[0],
      VehicleID: "53276",
      Year: "2017",
    };
    const lookup = createLiveRegistrationLookup(
      vi.fn(async () =>
        response({
          ...vehicleLookupDto,
          Result: [...vehicleLookupDto.Result, second],
        }),
      ) as typeof fetch,
      liveEnvironment,
    );
    const result = await lookup("1GDU034");
    expect(result.status).toBe("multiple");
    if (result.status === "multiple")
      expect(result.vehicles.map((vehicle) => vehicle.id)).toEqual([
        "53275",
        "53276",
      ]);
  });

  it("handles unsuccessful, empty, malformed, and non-OK responses", async () => {
    const cases = [
      {
        body: { ...vehicleLookupDto, IsSuccess: false },
        expected: "unavailable",
      },
      { body: { ...vehicleLookupDto, Result: [] }, expected: "not-found" },
      { body: { unexpected: true }, expected: "unavailable" },
    ];
    for (const testCase of cases) {
      const result = await createLiveRegistrationLookup(
        vi.fn(async () => response(testCase.body)) as typeof fetch,
        liveEnvironment,
      )("1GDU034");
      expect(result.status).toBe(testCase.expected);
    }
    const unavailable = await createLiveRegistrationLookup(
      vi.fn(async () => response({}, 503)) as typeof fetch,
      liveEnvironment,
    )("1GDU034");
    expect(unavailable).toEqual({
      status: "unavailable",
      message: "Vehicle lookup is temporarily unavailable.",
    });
  });

  it("uses generic network errors and a distinct timeout message", async () => {
    const network = await createLiveRegistrationLookup(
      vi.fn(async () => {
        throw new Error("private upstream detail");
      }) as typeof fetch,
      liveEnvironment,
    )("1GDU034");
    expect(network).toEqual({
      status: "unavailable",
      message: "Vehicle lookup is temporarily unavailable.",
    });

    const timeout = await createLiveRegistrationLookup(
      vi.fn(async () => {
        throw new DOMException("timed out", "TimeoutError");
      }) as typeof fetch,
      liveEnvironment,
    )("1GDU034");
    expect(timeout).toEqual({
      status: "unavailable",
      message: "Vehicle lookup timed out. Please try again.",
    });
  });

  it("rejects missing credentials and unapproved base URLs without making a request", async () => {
    expect(liveVehicleConfiguration({})).toBeNull();
    expect(
      liveVehicleConfiguration({
        ...liveEnvironment,
        AUTOQUOTES_BASE_URL: "https://example.com",
      }),
    ).toBeNull();
    const fetcher = vi.fn();
    const result = await createLiveRegistrationLookup(fetcher, {
      AUTOQUOTES_BASE_URL: "https://ractest.com.au",
    })("1GDU034");
    expect(result).toEqual({
      status: "unavailable",
      message: "Live vehicle lookup is not configured.",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("selects vehicle and service providers independently with no live-to-mock fallback", async () => {
    process.env.AUTOQUOTES_VEHICLE_PROVIDER = "live";
    process.env.AUTOQUOTES_SERVICE_PROVIDER = "mock";
    const liveFailure =
      await getVehicleLookupAdapter().lookupRegistration("1GDU034");
    expect(liveFailure.status).toBe("unavailable");
    expect(
      await getMockServiceAdapter().getCatalogue(demoVehicle),
    ).toHaveLength(13);

    process.env.AUTOQUOTES_VEHICLE_PROVIDER = "mock";
    expect(
      (await getVehicleLookupAdapter().lookupRegistration("1GDU034")).status,
    ).toBe("found");
  });
});

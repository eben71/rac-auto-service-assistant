import { describe, expect, it } from "vitest";
import {
  mockAutoQuotes,
  demoVehicle,
  vehicleLookupDto,
  mainServiceDto,
  additionalServiceDto,
  serviceScheduleDto,
  normalizeService,
} from "./mock";
import {
  catalogueResponseSchema,
  vehicleResponseSchema,
} from "../../domain/schemas";

describe("synthetic AutoQuotes adapter", () => {
  it("finds only the documented registration fixture", async () => {
    expect(
      vehicleResponseSchema.parse(
        await mockAutoQuotes.lookupRegistration("1gdu034"),
      ).status,
    ).toBe("found");
    expect((await mockAutoQuotes.lookupRegistration("UNKNOWN")).status).toBe(
      "not-found",
    );
    expect(vehicleLookupDto.Result[0]).toMatchObject({
      VehicleID: "53275",
      MID: "MIT39408",
      Year: "2016",
    });
    expect(demoVehicle).toMatchObject({
      vehicleId: "53275",
      mid: "MIT39408",
      registration: "1GDU034",
    });
  });
  it("selects a vehicle by make and model", async () => {
    expect(
      (await mockAutoQuotes.selectMakeModel("Mitsubishi", "Pajero Sport"))
        .status,
    ).toBe("found");
  });
  it("returns a valid, explicitly synthetic catalogue", async () => {
    const items = await mockAutoQuotes.getCatalogue(demoVehicle);
    expect(
      catalogueResponseSchema.parse({ items, demonstration: true }).items,
    ).toHaveLength(13);
    expect(mainServiceDto.Result.map((item) => item.ServiceTypeId)).toEqual([
      1, 9, 2, 4, 100,
    ]);
    expect(
      additionalServiceDto.Result.map((item) => item.ServiceTypeId),
    ).toEqual([111, 69, 58, 49, 52, 101, 109, 42]);
    expect(items.every((item) => item.isActive && item.availableOnline)).toBe(
      true,
    );
    expect(
      normalizeService({ ...mainServiceDto.Result[0], IsActive: false }),
    ).toMatchObject({ isActive: false });
  });
  it("retrieves the four preserved schedule identifiers only for the selected MID", async () => {
    expect(
      (await mockAutoQuotes.getSchedules("MIT39408")).map((item) => item.id),
    ).toEqual(serviceScheduleDto.Result.map((item) => item.ServiceScheduleId));
    expect(serviceScheduleDto.Result[0]).toHaveProperty(
      "SelectedServiceInteralId",
    );
    expect(await mockAutoQuotes.getSchedules("UNVERIFIED")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { mockAutoQuotes, demoVehicle } from "./mock";
import {
  catalogueResponseSchema,
  vehicleResponseSchema,
} from "../../domain/schemas";

describe("synthetic AutoQuotes adapter", () => {
  it("finds only the documented registration fixture", async () => {
    expect(
      vehicleResponseSchema.parse(
        await mockAutoQuotes.lookupRegistration("DEMO16"),
      ).status,
    ).toBe("found");
    expect((await mockAutoQuotes.lookupRegistration("UNKNOWN")).status).toBe(
      "not-found",
    );
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
    ).toHaveLength(12);
  });
});

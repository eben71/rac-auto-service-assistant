import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
vi.mock("server-only", () => ({}));
import {
  configuredDevelopers,
  profileForToken,
  signIn,
  signOut,
  updateGarage,
} from "./profiles";
import { demoVehicle } from "./autoquotes/mock";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "rac-profiles-test-"));
  process.env.DEMO_PROFILE_DATA_PATH = path.join(directory, "profiles.json");
  for (let index = 1; index <= 3; index++) {
    process.env[`DEMO_DEVELOPER_${index}_EMAIL`] =
      `person${index}.demo@rac.com.au`;
    process.env[`DEMO_DEVELOPER_${index}_NAME`] = `Demo ${index}`;
  }
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
  delete process.env.DEMO_PROFILE_DATA_PATH;
  for (let index = 1; index <= 3; index++) {
    delete process.env[`DEMO_DEVELOPER_${index}_EMAIL`];
    delete process.env[`DEMO_DEVELOPER_${index}_NAME`];
  }
});
describe("local demo profiles", () => {
  it("requires a configured email, accepts whitespace and case, and gives three distinct fixtures", async () => {
    expect(
      configuredDevelopers().map((item) => item.initialVehicle.id),
    ).toEqual([
      "illustrative-toyota-rav4",
      "illustrative-toyota-camry",
      "illustrative-tesla-model-3",
    ]);
    expect(await signIn("unknown@rac.com.au")).toBeNull();
    const token = await signIn("  PERSON1.DEMO@RAC.COM.AU  ");
    expect((await profileForToken(token!))?.savedVehicles[0].model).toBe(
      "RAV4",
    );
  });
  it("persists garages across sessions, isolates profiles, prevents duplicate saves, and signs out", async () => {
    const first = (await signIn("person1.demo@rac.com.au"))!;
    const second = (await signIn("person2.demo@rac.com.au"))!;
    await updateGarage(first, "add", demoVehicle);
    await updateGarage(first, "add", demoVehicle);
    expect((await profileForToken(first))?.savedVehicles).toHaveLength(2);
    expect((await profileForToken(second))?.savedVehicles).toHaveLength(1);
    const refreshed = (await signIn("person1.demo@rac.com.au"))!;
    expect((await profileForToken(refreshed))?.savedVehicles).toHaveLength(2);
    await updateGarage(first, "remove", demoVehicle);
    expect((await profileForToken(refreshed))?.savedVehicles).toHaveLength(1);
    expect(await updateGarage(undefined, "add", demoVehicle)).toBeNull();
    await signOut(first);
    expect(await profileForToken(first)).toBeNull();
  });
});

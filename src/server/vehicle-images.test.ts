import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  allBrandsImages,
  resetCatalogueCacheForTests,
  resolveEntry,
  retrieveCatalogue,
} from "./vehicle-images";
import { profileVehicles } from "../domain/profile-fixtures";

const catalogue = {
  base: "https://dobbygl.github.io/allbrands-api/v1/images",
  template:
    "https://dobbygl.github.io/allbrands-api/v1/images/{brand}/{model}/{size}.{format}",
  models: [
    {
      brand: "toyota",
      brand_name: "Toyota",
      model: "corolla",
      name: "Corolla",
      sizes: ["thumb", "medium"],
      formats: ["webp"],
    },
  ],
};
beforeEach(() => {
  resetCatalogueCacheForTests();
  vi.unstubAllGlobals();
});
describe("AllBrands illustrations", () => {
  it("retrieves the catalogue and matches exact make/model metadata", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => catalogue,
    })) as unknown as typeof fetch;
    expect(await retrieveCatalogue(fetcher)).toEqual(catalogue);
    expect(
      resolveEntry(catalogue, { make: "Toyota", model: "Corolla" })?.model,
    ).toBe("corolla");
    expect(
      resolveEntry(catalogue, { make: "Toyota", model: "Corolla Cross" }),
    ).toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith(
      "https://dobbygl.github.io/allbrands-api/v1/catalog.json",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
  it("builds a supported URL without sending registration or VIN to AllBrands", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => catalogue,
    }));
    vi.stubGlobal("fetch", fetcher);
    const image = await allBrandsImages.findImage(
      {
        id: "x",
        make: "Toyota",
        model: "Corolla",
        registration: "PRIVATE",
        fuel: "unknown",
        demonstration: true,
      },
      "thumb",
    );
    expect(image).toMatchObject({
      url: "https://dobbygl.github.io/allbrands-api/v1/images/toyota/corolla/thumb.webp",
      attribution: "AllBrands",
      licence: "CC BY 4.0",
      isIllustrative: true,
    });
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("PRIVATE");
  });
  it("serves three verified local fixtures and falls back safely on failure or unsupported models", async () => {
    const paths = await Promise.all(
      profileVehicles.map((vehicle) => allBrandsImages.findImage(vehicle)),
    );
    expect(new Set(paths.map((image) => image?.url)).size).toBe(3);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    expect(
      await allBrandsImages.findImage({
        id: "53275",
        make: "Mitsubishi",
        model: "Pajero Sport",
        fuel: "petrol-diesel",
        demonstration: true,
      }),
    ).toBeNull();
    resetCatalogueCacheForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => catalogue })),
    );
    expect(
      await allBrandsImages.findImage({
        id: "x",
        make: "Toyota",
        model: "Unknown",
        fuel: "unknown",
        demonstration: true,
      }),
    ).toBeNull();
  });
});

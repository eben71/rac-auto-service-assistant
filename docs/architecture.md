# Task 003 architecture and limitations

## Demo identity and garage

The landing screen offers guest continuation and a local developer selector. The server accepts a configured email irrespective of password; the password input never leaves the browser, is not validated, and is cleared on success. This **does not verify identity** and must never protect real RAC customer data. Three email/name pairs are read from `.env.local`; the server never publishes the allowlist. Email comparison trims whitespace and ignores case. Unknown emails get one generic error.

An unpredictable, HTTP-only, same-site session token selects a profile on the server. `.local-data/profiles.json` stores token-to-profile mappings and separate garage arrays, seeded once on first sign-in. The path and `.env.local` are Git-ignored. A refresh restores the selected profile and saved vehicles; sign-out invalidates that token. This JSON store is for one local process, without expiry, cross-instance coordination, backups, production authentication, or customer records. Guest selection never writes a garage. Active booking state stays in memory and is separate from the saved garage.

Fixture assignments, verified against the [AllBrands v1 catalogue](https://dobbygl.github.io/allbrands-api/v1/catalog.json) on 2026-09-21:

| Slot | Illustrative vehicle       | AllBrands brand/model | Local image                          |
| ---- | -------------------------- | --------------------- | ------------------------------------ |
| 1    | Toyota RAV4 SUV            | `toyota/rav4`         | `public/vehicles/toyota-rav4.webp`   |
| 2    | Toyota Camry sedan         | `toyota/camry`        | `public/vehicles/toyota-camry.webp`  |
| 3    | Tesla Model 3 electric car | `tesla/model-3`       | `public/vehicles/tesla-model-3.webp` |

These lack invented year, registration, VIN, VehicleID and MID. Their type is illustrative, so vehicle-specific service eligibility and logbook schedules are unavailable. The supplied Pajero Sport mock is found only by registration `1GDU034` and is not preloaded. Selecting it can be followed by an explicit save. Changing vehicle clears prior service choices and schedule. Duplicate saves are suppressed by AutoQuotes VehicleID where available, otherwise make/model/year.

## Images and attribution

`src/server/vehicle-images.ts` implements a typed AllBrands provider. It fetches only the public catalogue URL with a 2.5-second timeout and one-hour success / one-minute failure cache. Exact normalized make and model are matched to catalogue entries; image URLs come from its template. The three verified illustrations are copied locally for offline use. The provider receives make/model only from the UI, never registration, VIN, name or email. Missing entries and failed fetches return null; the UI displays `public/vehicles/generic.svg`. The Pajero Sport has no verified catalogue match, so it uses this generic illustration. Remote image load errors also fall back.

AllBrands images and catalogue are [CC BY 4.0](https://github.com/dobbygl/allbrands-api/blob/main/LICENSE); the UI links attribution to [AllBrands](https://github.com/dobbygl/allbrands-api). Images are representative illustrations, not the exact year, variant, colour or trim.

## AutoQuotes mock and shared boundaries

`src/server/autoquotes/mock.ts` contains PascalCase transport DTOs, including `VehicleID`, `MID`, `ServiceTypeId`, `InformationText`, `IsMasterServiceType`, and the upstream spelling `SelectedServiceInteralId`. The adapter maps these to normalized `Vehicle`, `ServiceItem` and `ServiceSchedule` values. IDs are `1,9,2,4,100` for main and `111,69,58,49,52,101,109,42` for additional items. Only active, online items reach the UI and can be selected or recommended. MID `MIT39408` maps to four schedule IDs; no other MID reuses them. The task text omitted the actual service `InformationText` samples and the complete schedule response structure. Current descriptive text and nullable schedule field are provisional; replace them when sanitized samples arrive.

Additive optional fields on `Vehicle` and `ServiceItem` carry AutoQuotes metadata without altering assistant state/response contracts. The assistant remains deterministic and validates a recommendation against the current normalized catalogue. The existing Foundry provider and orchestration were not changed. The real AutoQuotes adapter still fails clearly until approved connectivity is configured.

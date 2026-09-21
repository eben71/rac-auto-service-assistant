# Task 005 architecture and limitations

## Mock-only AutoQuotes boundary

Registration lookup remains server-side through `POST /api/vehicles/lookup-by-rego`, but the active adapter is always `mockAutoQuotes`. There is no environment switch, credential configuration, live fallback or request to an AutoQuotes/ASQ host. The adapter interface remains so a separately reviewed real implementation can be added later.

The deterministic registry contains DEMO1 through DEMO9. Matching is case-insensitive after trimming surrounding whitespace; unknown values return `not-found`. The historic `1GDU034` value aliases the single DEMO9 fixture for compatibility and does not duplicate its underlying record.

The supplied Mitsubishi `GetVehicleByRego` DTO and nested BYD vehicle-selection DTO are distinct Zod transport contracts. Both normalize into `Vehicle`. BYD `Model.Year = 0` is not used as a vehicle year. Supplied sample fields, synthetic identities and unavailable technical values are identified with `dataProvenance`. DEMO3–DEMO8 assert only the requested year, make, model and energy type; no AutoQuotes IDs, VINs, schedules or unsupported specifications are invented.

Main services, additional services and the DEMO9 schedule remain deterministic mock data. A missing MID results in an explicit schedule-unavailable state.

## Active booking and identity isolation

The active booking is independent from a developer garage. Login and logout clear temporary registration/make-model input, candidates and lookup messages, but retain a confirmed vehicle and compatible vehicle-specific selections. The garage is loaded from the new identity only. Matching uses stable vehicle IDs first and a conservative make/model/year compatibility fallback for legacy illustrative garage records.

A retained active vehicle is never automatically saved or transferred. If it already matches the current garage the UI reports it as saved; otherwise **Add to my vehicles** is explicit. Existing garage JSON is never reseeded merely because registry fixtures changed.

Selecting a different vehicle clears main/additional services, schedule choice, workshop notes, assistant conversation and restores assistant-first mode. Editing customer metadata such as colour, odometer or nickname updates the selected vehicle without clearing compatible booking state. **Start a new booking** clears all active/transient booking state while preserving the authenticated profile and its garage.

Switching between registration and make/model lookup is treated as an explicit vehicle change: the active vehicle and vehicle-specific context are cleared before the newly selected lookup form is shown. Vehicle and service prompts use the guest first name with an initial capital when available, otherwise the similarly normalized first segment of the signed-in profile display name.

The active draft, step, assistant state and service-selection mode are validated and stored in tab-scoped `sessionStorage`. Refresh restores the active booking, leaves lookup results idle, reloads catalogue/image context and reconciles DEMO registrations against the current mock registry. The server session cookie independently restores the current developer. This is prototype persistence, not a durable or cross-device customer record.

## Developer profiles

The three configured developer identities remain environment-driven. Password input is illustrative and is neither sent nor stored. An unpredictable HTTP-only same-site token selects one isolated garage in ignored local JSON storage. New garages are seeded with the Toyota RAV4, Toyota Camry or Tesla Model 3 demo fixture; existing garages are returned unchanged until the developer explicitly adds, edits or removes a vehicle.

No profile contact data is copied into the booking draft, so sign-out does not leave account-owned contact details behind. Production authentication, expiry, concurrency and customer-profile APIs remain outside scope.

## Images

The AllBrands provider receives only fixture ID, make and model—never registration, VIN or customer data. It resolves any supported make/model rather than containing a nine-vehicle switch. Verified bundled illustrations cover the three seeded profile models. Catalogue misses, fetch failures and image-load failures use `public/vehicles/generic.svg` and never block progress. The UI retains AllBrands CC BY 4.0 attribution for representative artwork.

## Assistant and Foundry

Assistant-first service selection remains the default, with manual selection available through the existing tabs. Safety escalation and human-assistance fallback remain in place. This task does not modify the Microsoft Foundry provider, configuration, prompts, route or shared response contracts. Foundry availability is independent from mock AutoQuotes operation.

## Known limitations

- No real registration, profile, catalogue, eligibility, pricing, availability or booking API is called.
- DEMO1–DEMO8 have no manufacturer maintenance schedules; only the supplied DEMO9 mock schedule is exposed.
- Session storage is tab-local and is not production persistence.
- Vehicle artwork depends on AllBrands catalogue coverage and availability.
- Quote calculation and booking submission are intentionally not implemented.

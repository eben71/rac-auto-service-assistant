# Task 004 architecture and limitations

## Identity, isolation, and local garage

Unauthenticated customers are guests automatically. The initial screen still offers optional demonstration login, while the header presents only the Guest indicator and Sign in. Guest booking data stays in React memory and never writes to a developer garage.

The server accepts one of three configured developer emails irrespective of password. The password input is not sent or stored. An unpredictable HTTP-only, same-site token selects an isolated profile. `.local-data/profiles.json` stores local demonstration sessions and garages and is ignored by Git. This store has no expiry, production authentication, concurrency guarantees, or real customer data.

Every successful login and sign-out resets the active booking boundary: customer draft, registration and make/model input, lookup candidates and errors, selected vehicle, services, schedule, workshop notes, image state, and assistant conversation. The new profile's saved garage is then loaded without modification. This also covers switching developers by signing out and signing in again.

Garage removal is keyed to the chosen vehicle, requires a native accessible dialog, focuses Cancel on open, supports Escape, and keeps the dialog open after an update failure. Successful feedback uses an `aria-live` status and a component-owned four-second timer that is cleared on replacement, identity change, and unmount.

## Vehicle model and customer additions

`Vehicle.year` remains the authoritative transport/profile value. `Vehicle.customerDetails` holds optional customer-provided `year`, `colour`, `odometerKm`, and `nickname`. The displayed effective year prefers the customer correction, while review retains and displays an AutoQuotes discrepancy. Odometer validation accepts whole numbers from 0 through 2,000,000 km; it does not infer service requirements.

AutoQuotes records retain `VehicleID`, `MID`, make, model, year, type-derived fuel class, details, and source. Live records use `source: autoquotes-live` and `demonstration: false`; the existing fixture uses `autoquotes-mock`; profile fixtures retain `illustrative-profile`. Saving replaces the same garage record so additions can be updated without a duplicate. Guest additions stay in the booking draft only.

## Assistant-first service selection

The service screen renders one accessible tab panel at a time. Auto Services Assistant is the default for every newly selected vehicle. It preserves the deterministic clarification, recommendation, cannot-match, workshop-note, and safety states. A prototype badge states that responses are demonstrations. Manual mode contains the normalized mock catalogue, additional-services path, and MID schedule selector. Switching panels preserves both conversation state and confirmed manual choices. Assistant recommendations remain separate until the customer explicitly adds a valid current-catalogue ID.

Changing vehicle clears all vehicle-specific service and assistant context but leaves saved profile vehicles untouched.

## AutoQuotes boundaries

`src/server/autoquotes/vehicle-transport.ts` defines the supplied PascalCase vehicle DTO and envelope schema. Both mock and live registration providers normalize through this boundary.

`AUTOQUOTES_VEHICLE_PROVIDER` independently selects `mock` or `live`. `AUTOQUOTES_SERVICE_PROVIDER` is constrained to `mock`; catalogue and schedule routes never use the live adapter. Make/model selection also uses the mock adapter. The legacy `AUTOQUOTES_PROVIDER` remains as a fallback for vehicle selection compatibility.

The live adapter:

- requires a server-only base URL, key, configurable key-header name, and timeout;
- accepts only HTTPS on the exact `ractest.com.au` allowlist entry and rejects URL credentials;
- constructs the fixed registration endpoint and encoded query server-side;
- clamps timeouts to 1–15 seconds;
- checks HTTP status and validates the complete envelope and each vehicle result;
- distinguishes empty results, multiple candidates, unavailable responses, and timeouts;
- returns generic customer messages without upstream details or secrets;
- never falls back to mock data after a live failure.

No live request occurs at startup or in tests. Enabling it requires `AUTOQUOTES_VEHICLE_PROVIDER=live`, `AUTOQUOTES_BASE_URL=https://ractest.com.au`, `AUTOQUOTES_SUBSCRIPTION_KEY`, and the verified `AUTOQUOTES_SUBSCRIPTION_KEY_HEADER`. Live connectivity remains unverified until approved credentials are placed in ignored `.env.local` and an explicit end-to-end test is run.

## Images and attribution

The approved logo is `public/brand/rac-for-the-better.png`. The AllBrands integration receives make and model only, never registration, VIN, name, or email. Three bundled profile illustrations are representative; unresolved vehicles use `public/vehicles/generic.svg`. The UI links CC BY 4.0 attribution.

## Foundry and remaining integrations

Task 004 does not modify Foundry prompts, configuration, orchestration, or shared AI response contracts. The current assistant remains deterministic. Main/additional catalogue and schedules are mocks. Production identity, real profiles, vehicle eligibility, pricing, workshop availability, quote calculation, and booking submission are outside scope.

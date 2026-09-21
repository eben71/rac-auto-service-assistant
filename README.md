# RAC Auto Services Assistant prototype

Single-repository Next.js prototype for the opening RAC auto service booking journey. It supports guest use, local demonstration developer profiles, server-side mock vehicle lookup, an assistant-first service-selection experience, and mock service catalogues. No quote, appointment, payment, or booking is created.

## Run on Windows / PowerShell

Use Node.js 20.9 or newer and npm. From `C:\DevProjects\rac-auto-service-assistant`:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Fill the three `DEMO_DEVELOPER_1/2/3_EMAIL` and `DEMO_DEVELOPER_1/2/3_NAME` pairs in `.env.local` with authorised `@rac.com.au` demonstration identities. Missing slots cannot sign in. Password input is illustrative and never leaves the browser. Open `http://localhost:3000`.

Restart the development server after changing `.env.local`; Next.js reads these profile values when the server process starts.

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run build
```

Automated tests are intentionally outside the hackathon acceptance workflow; preserve the existing test suite but do not run it unless specifically requested.

## Journey

1. **Begin quote:** an unauthenticated customer is automatically a guest and can continue with the required name and email fields. The header offers Sign in without a redundant guest action.
2. **Vehicle:** a guest can search immediately. Vehicle prompts use the guest first name or signed-in profile name. A signed-in developer sees only their isolated saved-vehicle garage. Identity changes clear temporary lookup state but preserve a confirmed active booking vehicle and compatible vehicle-specific selections. Switching between registration and make/model lookup explicitly clears the selected vehicle and its vehicle-specific booking context.
3. **Vehicle details:** the selected summary contains the image, identity, registration, source details, optional customer year correction, colour, odometer, nickname, save state, and Continue action. A fixture year remains separate from a customer correction. Active booking state uses tab-scoped `sessionStorage` so refresh does not present an old lookup as a fresh result.
4. **Garage:** Add to my vehicles sits inside the selected vehicle card. Existing records can be updated without creating a duplicate. Removal uses an accessible confirmation dialog and a status message that clears after about four seconds.
5. **Service selection:** Auto Services Assistant is the default mode. It retains the existing deterministic clarification, recommendation, cannot-match, and safety flows. The label “Prototype assistant — demonstration responses” makes its status clear. The mutually exclusive manual mode contains the existing main cards, additional-services route, and mock schedule options. Conversation and valid selections survive mode changes; recommendations require explicit confirmation.
6. **Review:** selected mock services, schedule, workshop notes, effective vehicle details, and any year discrepancy are displayed. Submission remains outside scope.

## Mock-only AutoQuotes vehicle lookup

The booking journey uses the server-side `POST /api/vehicles/lookup-by-rego` route. It never calls a live AutoQuotes/ASQ host and requires no AutoQuotes credentials. Lookup trims surrounding whitespace and is case-insensitive.

```json
{ "registrationNumber": "DEMO3" }
```

| Registration | Demonstration vehicle        | Energy type |
| ------------ | ---------------------------- | ----------- |
| DEMO1        | 2024 BYD Dolphin Dynamic     | Electric    |
| DEMO2        | 2024 BYD Dolphin Premium     | Electric    |
| DEMO3        | 2022 Toyota RAV4             | Hybrid      |
| DEMO4        | 2021 Toyota Camry            | Petrol      |
| DEMO5        | 2023 Tesla Model 3           | Electric    |
| DEMO6        | 2019 Ford Ranger             | Diesel      |
| DEMO7        | 2020 Hyundai i30             | Petrol      |
| DEMO8        | 2022 Mazda CX-5              | Petrol      |
| DEMO9        | 2016 Mitsubishi Pajero Sport | Diesel      |

These registrations are synthetic and are not real registered vehicle identities. DEMO1 and DEMO2 retain the supplied BYD selection-result fields, including their supplied MIDs, battery capacities, motor codes and power values. DEMO9 retains the supplied `GetVehicleByRego` sample and identifiers. Those two upstream payload shapes are modelled separately before normalization. DEMO3–DEMO8 use synthetic `DEMO` identifiers; only the requested year, make, model and energy type are asserted, and unavailable technical data remains unavailable rather than being fabricated. The historic `1GDU034` input remains an alias to the single DEMO9 record for older demonstrations.

## Architecture and data boundaries

`src/domain` owns booking, vehicle, service, assistant models and schemas. `src/components/booking-journey.tsx` owns active-booking persistence and identity transitions. `src/server/autoquotes` preserves the adapter abstraction, distinct transport DTOs, normalization and deterministic registry. `src/app/api` keeps lookup operations server-side.

Developer garages use an ignored local JSON file and an HTTP-only demonstration session token. This is local prototype storage, not production authentication or a customer profile integration. A booking vehicle is not automatically saved: signed-in customers must use **Add to my vehicles**. Stable identity matching reconciles an already-saved vehicle without duplicating or transferring ownership. Vehicle images use make/model only with the AllBrands catalogue or bundled representative fixtures and fall back to the generic silhouette without blocking the journey. See [docs/architecture.md](docs/architecture.md) for boundaries and limitations.

The Microsoft Foundry provider, configuration, prompts and response contracts are unchanged by this task. AutoQuotes mock-only operation is independent of whether Foundry is configured. Customer name and email are not sent to the provider.

## Known limitations and next work

- Service eligibility, inclusions, pricing, availability, booking submission, production identity, and real customer/profile APIs are not implemented.
- Main/additional catalogues and the DEMO9 schedule are mocked; no schedule is claimed for DEMO1–DEMO8.
- Profile storage and booking persistence are local prototype mechanisms without expiry, cross-device sync or production security guarantees.
- AllBrands coverage varies by make/model and network availability; the generic silhouette is expected for unsupported entries.
- A future task can add explicit contact-detail confirmation before later booking steps, without coupling booking state to saved-vehicle ownership.

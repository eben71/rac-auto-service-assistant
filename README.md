# RAC Auto Services Assistant prototype

Single-repository Next.js prototype for the opening RAC auto service booking journey. It supports guest use, local demonstration developer profiles, server-side vehicle lookup, an assistant-first service-selection experience, and deterministic mock service catalogues. No quote, appointment, payment, or booking is created.

## Run on Windows / PowerShell

Use Node.js 20.9 or newer and npm. From `C:\DevProjects\rac-auto-service-assistant`:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Fill the three `DEMO_DEVELOPER_1/2/3_EMAIL` and `DEMO_DEVELOPER_1/2/3_NAME` pairs in `.env.local` with authorised `@rac.com.au` demonstration identities. Missing slots cannot sign in. Password input is illustrative and never leaves the browser. Open `http://localhost:3000`.

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Journey

1. **Begin quote:** an unauthenticated customer is automatically a guest and can continue with the required name and email fields. The header offers Sign in without a redundant guest action.
2. **Vehicle:** a guest can search immediately. A signed-in developer sees their isolated saved-vehicle garage. Signing in, signing out, or changing profiles clears registration input, active vehicle, lookup errors, service choices, schedule, workshop notes, and assistant context. Saved profile vehicles remain intact.
3. **Vehicle details:** the selected summary contains the image, identity, registration, source details, optional customer year correction, colour, odometer, nickname, save state, and Continue action. An AutoQuotes year remains authoritative; a different customer year is stored separately and both are shown for review. Guest additions last only for the current in-memory booking.
4. **Garage:** Add to my vehicles sits inside the selected vehicle card. Existing records can be updated without creating a duplicate. Removal uses an accessible confirmation dialog and a status message that clears after about four seconds.
5. **Service selection:** Auto Services Assistant is the default mode. It retains the existing deterministic clarification, recommendation, cannot-match, and safety flows. The label “Prototype assistant — demonstration responses” makes its status clear. The mutually exclusive manual mode contains the existing main cards, additional-services route, and mock schedule options. Conversation and valid selections survive mode changes; recommendations require explicit confirmation.
6. **Review:** selected mock services, schedule, workshop notes, effective vehicle details, and any year discrepancy are displayed. Submission remains outside scope.

## AutoQuotes provider configuration

Vehicle registration lookup and service data are selected independently. Safe defaults keep everything local:

```dotenv
AUTOQUOTES_PROVIDER=mock
AUTOQUOTES_VEHICLE_PROVIDER=mock
AUTOQUOTES_SERVICE_PROVIDER=mock
```

To enable live registration lookup in an approved local test environment, set:

```dotenv
AUTOQUOTES_VEHICLE_PROVIDER=live
AUTOQUOTES_BASE_URL=https://ractest.com.au
AUTOQUOTES_SUBSCRIPTION_KEY=<secret>
AUTOQUOTES_SUBSCRIPTION_KEY_HEADER=<verified gateway header name>
AUTOQUOTES_TIMEOUT_MS=5000
```

All values are server-only; do not use `NEXT_PUBLIC_`. The header name is deliberately required because it must be verified against the RAC gateway contract. The adapter accepts HTTPS on the allowlisted `ractest.com.au` host only, sends `GET /api/autoservicesbooking/GetVehicleByRego?registrationNumber=...`, validates the response envelope, normalizes the supplied vehicle DTO, and returns every candidate when more than one matches. Missing configuration, non-success responses, empty results, timeouts, and network failures have distinct safe outcomes. A live failure never falls back to the Pajero mock.

Only registration lookup can be live. Make/model lookup, main and additional service catalogues, and logbook schedules remain deterministic mocks. `AUTOQUOTES_SERVICE_PROVIDER` currently accepts only `mock`, which prevents a partial live configuration from changing those routes.

## Architecture and data boundaries

`src/domain` owns booking, vehicle, service, assistant models and schemas. `src/components/booking-journey.tsx` owns the in-memory booking and identity-transition resets. `src/server/autoquotes/vehicle-transport.ts` validates and normalizes the shared upstream vehicle contract; `mock.ts` and `real.ts` use that same boundary. `src/app/api` keeps credentials and upstream requests off the browser.

Developer garages use an ignored local JSON file and an HTTP-only demonstration session token. This is local prototype storage, not production authentication or a customer profile integration. Vehicle images use the AllBrands catalogue or bundled representative fixtures with a generic fallback. See [docs/architecture.md](docs/architecture.md) for boundaries and limitations.

The Microsoft Foundry boundary remains unchanged. The assistant shown here is deterministic and makes no live Foundry request. Customer name and email are not sent to an AI provider.

## Known limitations and next work

- Live AutoQuotes connectivity was not exercised without a supplied subscription key and verified header name; unit tests use mocked HTTP responses only.
- Service eligibility, inclusions, pricing, availability, booking submission, production identity, and real customer/profile APIs are not implemented.
- Make/model and all service operations remain synthetic or mocked.
- The actual AutoQuotes OpenAPI and sanitized error/edge-case samples should be checked before broader integration testing.
- The next task should validate one approved end-to-end live registration request, capture a sanitized response, and then wire the independently developed Foundry provider without changing the application-owned catalogue validation and safety rules.

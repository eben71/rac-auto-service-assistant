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
3. **Vehicle details:** the selected summary contains the image, identity, registration, source details, optional customer year correction, colour, odometer, nickname, save state, and Continue action. An ASQ year remains authoritative; a different customer year is stored separately and both are shown for review. Guest additions last only for the current in-memory booking.
4. **Garage:** Add to my vehicles sits inside the selected vehicle card. Existing records can be updated without creating a duplicate. Removal uses an accessible confirmation dialog and a status message that clears after about four seconds.
5. **Service selection:** Auto Services Assistant is the default mode. It retains the existing deterministic clarification, recommendation, cannot-match, and safety flows. The label “Prototype assistant — demonstration responses” makes its status clear. The mutually exclusive manual mode contains the existing main cards, additional-services route, and mock schedule options. Conversation and valid selections survive mode changes; recommendations require explicit confirmation.
6. **Review:** selected mock services, schedule, workshop notes, effective vehicle details, and any year discrepancy are displayed. Submission remains outside scope.

## ASQ Auto Services Booking vehicle lookup

The booking journey uses the `POST /api/vehicles/lookup-by-rego` route, which accepts:

```json
{ "registrationNumber": "1GDU034" }
```

Configure its server-side implementation in `.env.local`:

```dotenv
NEXT_PUBLIC_ASQ_BASE_URL=https://api-uat.ractest.com.au
NEXT_PUBLIC_ASQ_VEHICLE_ENDPOINT=asqvehicle/v1
ASQ_API_KEY=<subscription key>
ASQ_AUTH_SCOPE=<Microsoft Entra API scope>
ASQ_MANAGED_IDENTITY_CLIENT_ID=<user-assigned managed identity client ID>
NEXT_PUBLIC_CORRELATION_ID_HEADER=X-Correlation-ID
```

The server acquires a bearer token using Azure Managed Identity, adds the API key, correlation ID, `Source-System: NextJS-ASB`, and JSON accept headers, then calls `{base URL}/{vehicle endpoint}/GetVehicleByRego`. A 404 becomes a local not-found response. Other failures return a typed error and log only the safe error code, HTTP status, and correlation ID. Registration values, API keys, bearer tokens, VINs, and upstream response bodies are not logged. Despite the requested `NEXT_PUBLIC_` names for non-secret routing values, this module reads all configuration only in server modules; `ASQ_API_KEY` and identity configuration must never use that prefix.

## Architecture and data boundaries

`src/domain` owns booking, vehicle, service, assistant models and schemas. `src/components/booking-journey.tsx` owns the in-memory booking and identity-transition resets. `src/server/asq/vehicle.ts` validates and normalizes the ASQ vehicle response. `src/app/api` keeps credentials and upstream requests off the browser.

Developer garages use an ignored local JSON file and an HTTP-only demonstration session token. This is local prototype storage, not production authentication or a customer profile integration. Vehicle images use the AllBrands catalogue or bundled representative fixtures with a generic fallback. See [docs/architecture.md](docs/architecture.md) for boundaries and limitations.

The Microsoft Foundry boundary remains unchanged. The assistant shown here is deterministic and makes no live Foundry request. Customer name and email are not sent to an AI provider.

## Known limitations and next work

- Live ASQ connectivity was not exercised without approved identity and subscription-key configuration.
- Service eligibility, inclusions, pricing, availability, booking submission, production identity, and real customer/profile APIs are not implemented.
- Make/model and all service operations remain synthetic or mocked.
- The actual ASQ OpenAPI and sanitized error/edge-case samples should be checked before broader integration testing.
- The next task should validate one approved end-to-end live registration request, capture a sanitized response, and then wire the independently developed Foundry provider without changing the application-owned catalogue validation and safety rules.

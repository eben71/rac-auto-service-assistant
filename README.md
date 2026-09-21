# RAC Auto Services assistant prototype

Single-repository Next.js demonstration of the opening RAC-style booking journey. The supplied Pajero payload and service identifiers are AutoQuotes mock records; the profile vehicles and other lookups are illustrative demonstration fixtures. No quote, appointment or booking is created.

## Run on Windows / PowerShell

Use Node.js 20.9 or newer and npm. From `C:\DevProjects\rac-auto-service-assistant`:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

In `.env.local`, fill all three `DEMO_DEVELOPER_1/2/3_EMAIL` and `DEMO_DEVELOPER_1/2/3_NAME` pairs with the actual authorised developers. Email addresses must end in `@rac.com.au`. Missing slots cannot sign in; guest mode still works. The supplied task did not include names or addresses, so the checked-in example has empty values. Open `http://localhost:3000`. The safe adapter default is `AUTOQUOTES_PROVIDER=mock`; the assistant is always a labelled deterministic demo until Foundry is implemented. If npm on this machine resolves to a missing roaming installation, use `node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'` in place of `npm` and add `--cache .npm-cache` to npm commands.

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Implemented journey

1. Begin quote: Sign in with a configured developer email, or Continue as guest and use the existing required name/email fields. These customer fields stay in memory and are never sent to Foundry.
2. Vehicle details: developers see their private illustrative garage first, can select/remove a saved car, find another, and explicitly add a found vehicle. Guests see lookup directly. Registration `1GDU034` returns the supplied 2016 Mitsubishi Pajero Sport mock (VehicleID `53275`, MID `MIT39408`); the separate make/model dataset remains synthetic. Loading, selected, not-found and unavailable states are shown.
3. Service selection: the mock catalogue uses AutoQuotes ServiceTypeId values, including Vehicle Inspection, and the optional inline deterministic help panel. EV-only items cannot be selected for the diesel Pajero Sport. A main service can be deselected; the Additional services card opens that screen without requiring a main package. Choosing Logbook for the Pajero loads its four supplied MID schedule options. Illustrative vehicles have no vehicle-specific logbook schedules or verified service eligibility.
4. Additional services: a selectable demonstration checklist; selections survive Back and Next navigation.
5. Review: selected demonstration items and any captured workshop note. There is no price, appointment, quote calculation, account or booking submission. Remaining sidebar steps are out of prototype scope.

The help panel accepts a vague symptom and asks a clarification question, including “I'm not sure” and a free-text follow-up. Since this catalogue has no verified general fault-inspection item, a rattle concern leads to a human-review / unable-to-match result. A specific request for routine servicing can suggest the existing demonstration Essentials Service fixture; the customer must explicitly add it. This may add a workshop note to the review. Serious brake or steering loss triggers advice to stop driving and seek roadside assistance or recovery, and pauses booking progression. This is a deterministic demo, not AI diagnosis or a live model response.

## Architecture

`src/domain` holds typed booking, vehicle, service and assistant models, trust-boundary schemas, navigation, catalogue validation and demo safety decisions. `src/components/booking-journey.tsx` owns the in-memory draft and navigation; `booking-ui.tsx` holds reusable presentation components; `service-assistant.tsx` owns the inline conversation surface. `src/app/api` exposes server routes. `src/server/autoquotes` selects mock or real adapters. `src/server/foundry.ts` defines the future AI boundary. Profile and image details are in [docs/architecture.md](docs/architecture.md). No customer-facing provider control is exposed. No customer personal information is sent to the AI boundary.

The mock adapter retains original field casing in transport DTOs and maps to normalized models at its boundary. It has the supplied vehicle and service IDs, plus the four MID schedule IDs. The task did not include the actual `InformationText` sample payload or full schedule envelope, so descriptions and omitted fields remain provisional rather than claiming exact contract fidelity. The real AutoQuotes adapter deliberately fails with a clear unconfigured error; there is no silent mock fallback. Server routes return generic unavailable messages on adapter errors.

The Foundry provider defines future multi-turn input and structured decisions for clarification, recommendation, inability to match, safety escalation, workshop notes, uncertainty and application-owned tool-call requests. The internal `/api/internal/ai-connectivity` route returns `not-configured` and missing configuration names only. It does not call a model or return secrets. This endpoint must be protected or removed before any production exposure.

## Integration checklists

### AutoQuotes

Place approved OpenAPI specifications and sanitized sample requests/responses in `docs/integrations/autoquotes/` when supplied. Confirm the actual authentication method, environments, endpoints, registration and make/model lookup contracts, service catalogue contracts, eligibility semantics, stable service IDs, errors, and rate limits. Implement `src/server/autoquotes/real.ts` mapping actual DTOs to domain models, validate them at the boundary, and add contract tests against sanitized examples. Keep credentials server-side. Do not infer service eligibility from the current fixture.

### Microsoft Foundry

Confirm the approved project/resource endpoint, deployment, supported API surface, authentication method and organisational permissions. Prefer RAC-approved Entra ID if supported by the actual resource. Configure only server-side values in `.env.local`. Implement the provider in `src/server/foundry.ts` after these are known, then add a protected connectivity test. Future application-owned tool calls should reach the AutoQuotes adapter through the server application layer. Before showing any model service suggestion, check its ID against the retrieved bookable catalogue and vehicle applicability. Safety escalation must take priority. Never pass first name, last name or email to the model.

## Design mapping and assumptions

All five supplied images in `docs/reference/screenshots/` were inspected in Task 002. The split layout, progress markers, tabs, dark vehicle summary, cards and checklist follow the references. Task 003 adds a compact profile menu, saved-vehicle cards and image area while preserving that layout. The supplied approved RAC logo is stored at `public/brand/rac-for-the-better.png` and is used at its original aspect ratio in both desktop and mobile layouts. No approved font asset was found. Service descriptions remain provisional demonstration copy; pixel-perfect fidelity is not claimed.

## Next tasks

Supply the actual three developer email/name pairs. Obtain the sanitized AutoQuotes InformationText/schedule samples and OpenAPI, then confirm Foundry resource and auth details. Real integration, eligibility, pricing, booking and submission are not implemented.

For parallel hackathon work, a frontend engineer can continue in `src/components/` and `src/app/globals.css`, an AutoQuotes engineer can own `src/server/autoquotes/` and the API contract mapping, and a Foundry engineer can own `src/server/foundry.ts` and future server-side orchestration. Coordinate any shared `src/domain/` contract changes before wiring real providers.

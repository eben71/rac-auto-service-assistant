# RAC Auto Services assistant prototype

Single-repository Next.js demonstration of the opening RAC-style booking journey. All vehicles and services are synthetic demonstration fixtures. No quote, appointment or booking is created.

## Run on Windows / PowerShell

Use Node.js 20.9 or newer and npm. From `C:\DevProjects\rac-auto-service-assistant`:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The safe adapter default is `AUTOQUOTES_PROVIDER=mock`; the service assistant uses the configured Foundry provider and reports an unavailable state when it cannot connect. If npm on this machine resolves to a missing roaming installation, use `node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'` in place of `npm` and add `--cache .npm-cache` to npm commands.

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Implemented journey

1. Begin quote: required name and email fields, validated in the browser. Use synthetic input. The data stays in memory and is never sent to Foundry.
2. Vehicle details: server-side adapter lookup by registration (`DEMO16`) or a small synthetic make/model list. Loading, selected, not-found and unavailable states are shown.
3. Service selection: demonstration main services, including the screenshot's Vehicle Inspection item, and an optional inline deterministic help panel. EV-only fixtures cannot be selected for the synthetic Pajero Sport. A main service can be deselected; the Additional services card also opens that screen without requiring a main package.
4. Additional services: a selectable demonstration checklist; selections survive Back and Next navigation.
5. Review: selected demonstration items and any captured workshop note. There is no price, appointment, quote calculation, account or booking submission. Remaining sidebar steps are out of prototype scope.

The help panel accepts a vague symptom and asks a clarification question, including “I'm not sure” and a free-text follow-up. Since this catalogue has no verified general fault-inspection item, a rattle concern leads to a human-review / unable-to-match result. A specific request for routine servicing can suggest the existing demonstration Essentials Service fixture; the customer must explicitly add it. This may add a workshop note to the review. Serious brake or steering loss triggers advice to stop driving and seek roadside assistance or recovery, and pauses booking progression. Foundry handles service-navigation decisions, but the assistant is not a diagnostic system and recommendations remain constrained to the supplied catalogue.

## Architecture

`src/domain` holds typed booking, vehicle, service and assistant models, trust-boundary schemas, navigation, catalogue validation and demo safety decisions. `src/components/booking-journey.tsx` owns the in-memory draft and navigation; `booking-ui.tsx` holds reusable presentation components; `service-assistant.tsx` owns the inline conversation surface. `src/app/api` exposes server routes. `src/server/autoquotes` selects mock or real adapters. `src/server/foundry.ts` calls the Foundry project Responses API with server-side configuration. No customer-facing provider control is exposed. No customer personal information is sent to the AI boundary.

The mock adapter has synthetic vehicle and catalogue fixtures. The real AutoQuotes adapter deliberately fails with a clear unconfigured error; there is no silent mock fallback. External responses must be mapped into domain models and validated with Zod before React receives them. The server routes return generic unavailable messages on adapter errors.

The Foundry provider sends multi-turn input and structured decisions for clarification, recommendation, inability to match, safety escalation, workshop notes, uncertainty and application-owned tool-call requests. Recommendations are filtered against the supplied catalogue IDs before React receives them. The internal `/api/internal/ai-connectivity` route reports configuration status only and does not return secrets. The assistant route is an internal endpoint and must be protected before production exposure.

## Integration checklists

### AutoQuotes

Place approved OpenAPI specifications and sanitized sample requests/responses in `docs/integrations/autoquotes/` when supplied. Confirm the actual authentication method, environments, endpoints, registration and make/model lookup contracts, service catalogue contracts, eligibility semantics, stable service IDs, errors, and rate limits. Implement `src/server/autoquotes/real.ts` mapping actual DTOs to domain models, validate them at the boundary, and add contract tests against sanitized examples. Keep credentials server-side. Do not infer service eligibility from the current fixture.

### Microsoft Foundry

Configure `FOUNDRY_PROJECT_ENDPOINT`, `FOUNDRY_MODEL_DEPLOYMENT` and `FOUNDRY_API_KEY` only in `.env.local`. The provider uses the project endpoint's `/openai/v1/responses` route and sends the subscription key as the `api-key` header. Before showing any model service suggestion, check its ID against the retrieved bookable catalogue and vehicle applicability. Safety escalation must take priority. Never pass first name, last name or email to the model.

## Design mapping and assumptions

All five supplied images in `docs/reference/screenshots/` were inspected. The UI was compared with Screens 1, 2, 3A/3B and 4 at a roughly matching desktop viewport, then checked at a 390px mobile viewport in headless Chrome. The sidebar split, content alignment, progress markers, form stacking, tabs, dark vehicle summary, service-card structure and additional-service checklist now follow the references. The inline assistant deliberately adds height above the manual cards. Rendered QA images are in `docs/qa/screenshots/`. The `RAC` text block remains an explicitly labelled placeholder, not an official logo; no approved standalone logo or font asset was supplied. Place approved assets under `public/brand/` when available. Service descriptions remain generic demonstration copy because actual catalogue inclusions and eligibility are unverified. Pixel-perfect fidelity is not claimed.

## Next tasks

Obtain approved logo/font assets for the final visual pass; obtain AutoQuotes OpenAPI and sanitized examples; protect the internal assistant route; then test Foundry against the approved non-production resource. Real AutoQuotes eligibility, pricing, booking and submission are not implemented.

For parallel hackathon work, a frontend engineer can continue in `src/components/` and `src/app/globals.css`, an AutoQuotes engineer can own `src/server/autoquotes/` and the API contract mapping, and a Foundry engineer can own `src/server/foundry.ts` and future server-side orchestration. Coordinate any shared `src/domain/` contract changes before wiring real providers.

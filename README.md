# RAC Auto Services assistant prototype

Single-repository Next.js demonstration of the opening RAC-style booking journey. All vehicles and services are synthetic demonstration fixtures. No quote, appointment or booking is created.

## Run on Windows / PowerShell

Use Node.js 20.9 or newer and npm. From `C:\DevProjects\rac-auto-service-assistant`:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The safe adapter default is `AUTOQUOTES_PROVIDER=mock`; the assistant is always a labelled deterministic demo until Foundry is implemented. If npm on this machine resolves to a missing roaming installation, use `node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'` in place of `npm` and add `--cache .npm-cache` to npm commands.

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
3. Service selection: demonstration main services and an inline deterministic help panel. EV-only fixtures cannot be selected for the synthetic Pajero Sport.
4. Additional services: a selectable demonstration checklist; selections survive Back and Next navigation.
5. Review: selected demonstration items only. There is no price, appointment, quote calculation, account or booking submission. Remaining sidebar steps are out of prototype scope.

The help panel accepts a vague symptom and asks a clarification question, including “I'm not sure.” Since this catalogue has no verified general inspection item, it then gives a human-review / unable-to-match result. A serious brake failure description triggers advice to stop driving and seek roadside assistance or recovery. This is a deterministic demo, not AI diagnosis or a live model response. It never adds a recommended service to the draft.

## Architecture

`src/domain` holds typed booking, vehicle, service and assistant models, trust-boundary schemas, navigation, catalogue validation and demo safety decisions. `src/components` holds the client journey. `src/app/api` exposes server routes. `src/server/autoquotes` selects mock or real adapters. `src/server/foundry.ts` defines the future AI boundary. No customer-facing provider control is exposed. No customer personal information is sent to the AI boundary.

The mock adapter has synthetic vehicle and catalogue fixtures. The real AutoQuotes adapter deliberately fails with a clear unconfigured error; there is no silent mock fallback. External responses must be mapped into domain models and validated with Zod before React receives them. The server routes return generic unavailable messages on adapter errors.

The Foundry provider defines future multi-turn input and structured decisions for clarification, recommendation, inability to match, safety escalation, workshop notes, uncertainty and application-owned tool-call requests. The internal `/api/internal/ai-connectivity` route returns `not-configured` and missing configuration names only. It does not call a model or return secrets. This endpoint must be protected or removed before any production exposure.

## Integration checklists

### AutoQuotes

Place approved OpenAPI specifications and sanitized sample requests/responses in `docs/integrations/autoquotes/` when supplied. Confirm the actual authentication method, environments, endpoints, registration and make/model lookup contracts, service catalogue contracts, eligibility semantics, stable service IDs, errors, and rate limits. Implement `src/server/autoquotes/real.ts` mapping actual DTOs to domain models, validate them at the boundary, and add contract tests against sanitized examples. Keep credentials server-side. Do not infer service eligibility from the current fixture.

### Microsoft Foundry

Confirm the approved project/resource endpoint, deployment, supported API surface, authentication method and organisational permissions. Prefer RAC-approved Entra ID if supported by the actual resource. Configure only server-side values in `.env.local`. Implement the provider in `src/server/foundry.ts` after these are known, then add a protected connectivity test. Future application-owned tool calls should reach the AutoQuotes adapter through the server application layer. Before showing any model service suggestion, check its ID against the retrieved bookable catalogue and vehicle applicability. Safety escalation must take priority. Never pass first name, last name or email to the model.

## Design mapping and assumptions

`docs/reference/screenshots/` contains no accessible images, so pixel-level screenshot comparison was unavailable. The layout follows the written brief: white roughly one-third desktop sidebar, pale blue-grey main area, yellow progress and primary actions, outlined white service options, blue links, dark slate type and a compact mobile stepper. The `RAC` text block is a placeholder, not an official logo. Place approved RAC logo, fonts and other design assets under `public/brand/`, then update the layout and tokens after visual review. The service wording is intentionally generic because the screenshot and real catalogue copy were unavailable.

## Next tasks

Obtain approved screenshots and assets for visual tuning; obtain AutoQuotes OpenAPI and sanitized examples; confirm Foundry resource and auth details; implement real contract mapping and server-side recommendation validation; then test against approved non-production resources. Real integration, eligibility, pricing, booking and submission are not implemented.

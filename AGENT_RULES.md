# Development rules

1. Work in small, reviewable increments and preserve existing files unless changes are necessary.
2. Use strict TypeScript, readable names, typed interfaces and clear module boundaries.
3. Keep external API integration, AI orchestration, safety decisions and presentation separate.
4. Never invent real API contracts, endpoints, booking identifiers, model deployments, credentials or RAC service eligibility rules.
5. Label all mock vehicles, customers and catalogue fixtures as synthetic demonstration data.
6. Keep secrets and RAC API access server-side. Never send real customer personal information or live RAC data to an unapproved model endpoint.
7. Do not diagnose vehicle faults or assert a part needs replacement from symptoms alone.
8. Validate future AI recommendations against AutoQuotes service records. Permit a general-inspection fallback only after verifying a suitable catalogue item. Safety escalation takes priority over booking.
9. Do not create, modify, expand or run unit, integration, component or end-to-end tests unless the user explicitly requests them.
10. Do not introduce test frameworks, test dependencies, coverage tooling or coverage requirements.
11. Document incomplete functionality and configuration requirements transparently.
12. Avoid unnecessary agent frameworks, vector databases, persistence, authentication frameworks and production booking submission.
13. Do not commit or push unless explicitly asked.
14. Make sure nothing committed has PII data embedded.
15. Preserve existing tests and test infrastructure. Do not delete or otherwise remove them.
16. Automated test creation and execution are excluded from hackathon task acceptance criteria unless the user explicitly requests them.
17. Run formatting, linting, TypeScript checks and a production build before reporting completion.
18. Manual browser testing is permitted and encouraged for validating functionality and UI changes.
19. Rules 9, 10, 15 and 16 override earlier task prompts that request automated test creation, modification, expansion, execution or coverage.

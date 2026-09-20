# Development rules

1. Work in small, testable increments and preserve existing files unless changes are necessary.
2. Use strict TypeScript, readable names, typed interfaces and clear module boundaries.
3. Keep external API integration, AI orchestration, safety decisions and presentation separate.
4. Never invent real API contracts, endpoints, booking identifiers, model deployments, credentials or RAC service eligibility rules.
5. Label all mock vehicles, customers and catalogue fixtures as synthetic demonstration data.
6. Keep secrets and RAC API access server-side. Never send real customer personal information or live RAC data to an unapproved model endpoint.
7. Do not diagnose vehicle faults or assert a part needs replacement from symptoms alone.
8. Validate future AI recommendations against AutoQuotes service records. Permit a general-inspection fallback only after verifying a suitable catalogue item. Safety escalation takes priority over booking.
9. Add focused tests for state transitions, adapter contracts, input validation and safety logic implemented.
10. Run formatting, linting, type checking, tests and a production build before reporting completion.
11. Document incomplete functionality and configuration requirements transparently.
12. Avoid unnecessary agent frameworks, vector databases, persistence, authentication frameworks and production booking submission.
13. Do not commit or push unless explicitly asked.

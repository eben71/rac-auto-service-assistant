# AutoQuotes demonstration boundary

AutoQuotes is entirely mocked for this hackathon. The application makes no request to an AutoQuotes/ASQ host and has no subscription-key or managed-identity configuration.

Two supplied payload families are intentionally kept distinct:

- The Mitsubishi Pajero Sport fixture is a `GetVehicleByRego` envelope containing records with fields such as `VehicleID`, `Series`, `Engine`, `Year`, `VIN` and `MID`.
- The BYD Dolphin fixtures are vehicle-selection records with nested `Make` and `Model` objects plus fields such as `ExtraInfo`, `EngineCode`, `Kw`, `Mid`, `VehicleType` and `SortOrder`. Their `Model.Year` value of `0` is not treated as a real year; the selected demonstration year is 2024.

Both are normalized into the application `Vehicle` model. DEMO3–DEMO8 intentionally omit unverified technical specifications and use synthetic `DEMO` identifiers. Future live work should introduce a separate adapter implementation from approved specifications rather than weakening these transport boundaries. Never add credentials, customer data or guessed upstream contracts here.

"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AssistantState,
  BookingDraft,
  BookingStep,
  ServiceItem,
} from "@/domain/models";
import {
  initialDraft,
  nextStep,
  previousStep,
  selectable,
  selectServiceId,
} from "@/domain/booking";
import {
  customerSchema,
  catalogueResponseSchema,
  vehicleResponseSchema,
} from "@/domain/schemas";
import {
  answerDemoAssistant,
  startDemoAssistant,
} from "@/domain/assistant-demo";

const progress = [
  "Begin quote",
  "Vehicle details",
  "Service selection",
  "Confirm your details",
  "Your quote",
  "Booking details",
  "Review your booking",
  "Submit booking",
];
const stepIndex: Record<BookingStep, number> = {
  begin: 0,
  vehicle: 1,
  services: 2,
  additional: 2,
  review: 2,
};
const demoAnswers = ["Mostly over bumps", "At low speed", "I'm not sure"];

async function postJson(path: string, payload: unknown): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error("The service is unavailable.");
  return body;
}

export function BookingJourney() {
  const [step, setStep] = useState<BookingStep>("begin");
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"registration" | "make-model">(
    "registration",
  );
  const [registration, setRegistration] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "not-found" | "error"
  >("idle");
  const [catalogue, setCatalogue] = useState<ServiceItem[]>([]);
  const [catalogueStatus, setCatalogueStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistant, setAssistant] = useState<AssistantState>({ kind: "idle" });
  const assistantRef = useRef<HTMLDivElement>(null);
  const assistantInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!draft.vehicle) return;
    let cancelled = false;
    fetch("/api/catalogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle: draft.vehicle }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable");
        return catalogueResponseSchema.parse(await response.json());
      })
      .then((data) => {
        if (!cancelled) {
          setCatalogue(data.items);
          setCatalogueStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setCatalogueStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [draft.vehicle]);

  function continueCustomer() {
    const parsed = customerSchema.safeParse(draft.customer);
    if (!parsed.success) {
      setFormErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    setFormErrors({});
    setDraft((current) => ({ ...current, customer: parsed.data }));
    setStep("vehicle");
  }

  async function lookupVehicle() {
    setLookupStatus("loading");
    try {
      const path =
        mode === "registration" ? "/api/vehicles" : "/api/vehicles/make-model";
      const payload =
        mode === "registration" ? { registration } : { make, model };
      const result = vehicleResponseSchema.parse(await postJson(path, payload));
      if (result.status === "found") {
        setDraft((current) => ({
          ...current,
          vehicle: result.vehicle,
          mainServiceId: null,
          additionalServiceIds: [],
        }));
        setCatalogue([]);
        setCatalogueStatus("loading");
        setLookupStatus("idle");
      } else
        setLookupStatus(result.status === "not-found" ? "not-found" : "error");
    } catch {
      setLookupStatus("error");
    }
  }

  function changeVehicle() {
    setDraft((current) => ({
      ...current,
      vehicle: null,
      mainServiceId: null,
      additionalServiceIds: [],
    }));
    setCatalogue([]);
    setCatalogueStatus("idle");
    setLookupStatus("idle");
  }

  function toggleAdditional(id: string) {
    try {
      selectServiceId(id, catalogue, draft.vehicle);
    } catch {
      return;
    }
    setDraft((current) => ({
      ...current,
      additionalServiceIds: current.additionalServiceIds.includes(id)
        ? current.additionalServiceIds.filter((value) => value !== id)
        : [...current.additionalServiceIds, id],
    }));
  }

  function openAssistant() {
    setAssistantOpen(true);
    setStep("services");
    window.setTimeout(() => {
      assistantRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      assistantInputRef.current?.focus();
    }, 0);
  }

  function submitAssistant() {
    if (!assistantInput.trim()) return;
    setAssistant(startDemoAssistant(assistantInput));
    setAssistantInput("");
    setAssistantOpen(true);
  }

  const currentIndex = stepIndex[step];
  const mainServices = catalogue.filter((item) => item.category === "main");
  const additionalServices = catalogue.filter(
    (item) => item.category === "additional",
  );
  const selectedServices = catalogue.filter(
    (item) =>
      item.id === draft.mainServiceId ||
      draft.additionalServiceIds.includes(item.id),
  );

  return (
    <div className="booking-shell">
      <aside className="sidebar" aria-label="Booking progress">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            RAC
          </span>
          <span>Auto Services</span>
        </div>
        <h2>Your Service</h2>
        <ol className="steps">
          {progress.map((label, index) => (
            <li
              key={label}
              className={
                index < currentIndex
                  ? "done"
                  : index === currentIndex
                    ? "active"
                    : ""
              }
              aria-current={index === currentIndex ? "step" : undefined}
            >
              <span className="step-dot">
                {index < currentIndex ? "✓" : index + 1}
              </span>
              <span className="step-label">
                {label}
                {index >= 3 && <small>Outside prototype scope</small>}
              </span>
            </li>
          ))}
        </ol>
      </aside>
      <main className="main">
        <div className="content">
          <div className="eyebrow">
            Auto Services · Demonstration booking journey
          </div>
          {step === "begin" && (
            <section aria-labelledby="begin-title">
              <h1 id="begin-title">Let’s get started</h1>
              <p className="lead">
                Tell us a little about yourself to begin your service quote.
              </p>
              <div className="note">
                Demonstration only. Use synthetic details; this prototype does
                not store or submit personal information.
              </div>
              <div className="form-grid">
                {(["firstName", "lastName", "email"] as const).map((key) => (
                  <label
                    className={`field ${key === "email" ? "full" : ""}`}
                    key={key}
                  >
                    <span>
                      {key === "firstName"
                        ? "First name"
                        : key === "lastName"
                          ? "Last name"
                          : "Email address"}
                    </span>
                    <input
                      className="input"
                      type={key === "email" ? "email" : "text"}
                      autoComplete="off"
                      value={draft.customer[key]}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          customer: {
                            ...current.customer,
                            [key]: event.target.value,
                          },
                        }))
                      }
                      aria-invalid={!!formErrors[key]}
                      aria-describedby={
                        formErrors[key] ? `${key}-error` : undefined
                      }
                    />
                    {formErrors[key] && (
                      <span className="error" id={`${key}-error`}>
                        {formErrors[key]}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <div className="actions">
                <button className="primary" onClick={continueCustomer}>
                  Next: vehicle details
                </button>
              </div>
            </section>
          )}
          {step === "vehicle" && (
            <section aria-labelledby="vehicle-title">
              <h1 id="vehicle-title">Your vehicle details</h1>
              <p className="lead">
                Find your vehicle so we can show demonstration service options.
              </p>
              {draft.vehicle ? (
                <div className="panel">
                  <h2>Selected vehicle</h2>
                  <p>
                    {draft.vehicle.year} {draft.vehicle.make}{" "}
                    {draft.vehicle.model}
                    {draft.vehicle.registration
                      ? ` · ${draft.vehicle.registration}`
                      : ""}
                  </p>
                  <span className="note">
                    Synthetic demonstration vehicle. Service eligibility has not
                    been verified with AutoQuotes.
                  </span>
                  <div>
                    <button className="secondary" onClick={changeVehicle}>
                      Change vehicle
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="tabs"
                    role="tablist"
                    aria-label="Vehicle lookup method"
                  >
                    <button
                      className={`tab ${mode === "registration" ? "active" : ""}`}
                      role="tab"
                      aria-selected={mode === "registration"}
                      onClick={() => {
                        setMode("registration");
                        setLookupStatus("idle");
                      }}
                    >
                      Registration
                    </button>
                    <button
                      className={`tab ${mode === "make-model" ? "active" : ""}`}
                      role="tab"
                      aria-selected={mode === "make-model"}
                      onClick={() => {
                        setMode("make-model");
                        setLookupStatus("idle");
                      }}
                    >
                      Make and model
                    </button>
                  </div>
                  {mode === "registration" ? (
                    <label className="field">
                      <span>Vehicle registration</span>
                      <input
                        className="input"
                        value={registration}
                        onChange={(event) =>
                          setRegistration(event.target.value)
                        }
                        placeholder="Try DEMO16"
                      />
                    </label>
                  ) : (
                    <div className="form-grid">
                      <label className="field">
                        <span>Make</span>
                        <select
                          className="input"
                          value={make}
                          onChange={(event) => {
                            setMake(event.target.value);
                            setModel("");
                          }}
                        >
                          <option value="">Select make</option>
                          <option>Mitsubishi</option>
                          <option>Toyota</option>
                          <option>Nissan</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Model</span>
                        <select
                          className="input"
                          value={model}
                          onChange={(event) => setModel(event.target.value)}
                        >
                          <option value="">Select model</option>
                          {make === "Mitsubishi" && (
                            <option>Pajero Sport</option>
                          )}
                          {make === "Toyota" && <option>Corolla</option>}
                          {make === "Nissan" && <option>Leaf</option>}
                        </select>
                      </label>
                    </div>
                  )}
                  <div className="note">
                    Synthetic lookup only: DEMO16 returns a 2016 Mitsubishi
                    Pajero Sport. The make/model list is intentionally small.
                  </div>
                  <button
                    className="primary"
                    onClick={lookupVehicle}
                    disabled={lookupStatus === "loading"}
                  >
                    {lookupStatus === "loading"
                      ? "Looking up vehicle…"
                      : "Find vehicle"}
                  </button>
                  <div role="status" aria-live="polite">
                    {lookupStatus === "not-found" && (
                      <p>
                        No demonstration vehicle found. Try DEMO16 or
                        make/model.
                      </p>
                    )}
                    {lookupStatus === "error" && (
                      <p className="error">
                        Vehicle lookup is unavailable or the input is invalid.
                        Please try again.
                      </p>
                    )}
                  </div>
                </>
              )}
              <div className="actions">
                <button className="secondary" onClick={() => setStep("begin")}>
                  Back
                </button>
                {draft.vehicle && (
                  <button
                    className="primary"
                    onClick={() => setStep(nextStep(step))}
                  >
                    Next: select service
                  </button>
                )}
              </div>
            </section>
          )}
          {step === "services" && (
            <section aria-labelledby="services-title">
              <h1 id="services-title">Choose your service</h1>
              <p className="lead">
                Select a service, or describe what you need help with.
              </p>
              <div className="panel" ref={assistantRef}>
                <h2>Not sure what service you need?</h2>
                <p>
                  Tell us what you’ve noticed. This deterministic demo guides
                  service navigation; it does not diagnose faults or use live
                  AI.
                </p>
                {!assistantOpen && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setAssistantOpen(true);
                      assistantInputRef.current?.focus();
                    }}
                  >
                    Open service help
                  </button>
                )}
                {assistantOpen && (
                  <>
                    <label className="field">
                      <span>Describe what you need help with</span>
                      <textarea
                        ref={assistantInputRef}
                        className="input"
                        rows={3}
                        value={assistantInput}
                        onChange={(event) =>
                          setAssistantInput(event.target.value)
                        }
                        placeholder="For example: I hear a rattle over bumps"
                      />
                    </label>
                    <button className="primary" onClick={submitAssistant}>
                      Help me find a service
                    </button>
                    <button
                      className="secondary ml-4"
                      onClick={() =>
                        setAssistant(
                          startDemoAssistant(
                            "My brakes failed and I cannot stop",
                          ),
                        )
                      }
                    >
                      View braking safety demo
                    </button>
                    {assistant.kind !== "idle" && (
                      <div aria-live="polite">
                        {assistant.messages.map((message, index) => (
                          <div
                            key={index}
                            className={`message ${message.role}`}
                          >
                            {message.text}
                          </div>
                        ))}
                        {assistant.kind === "clarification" && (
                          <div className="choice-row">
                            {demoAnswers.map((answer) => (
                              <button
                                key={answer}
                                className="choice"
                                onClick={() =>
                                  setAssistant(
                                    answerDemoAssistant(
                                      assistant,
                                      answer,
                                      catalogue,
                                      draft.vehicle,
                                    ),
                                  )
                                }
                              >
                                {answer}
                              </button>
                            ))}
                          </div>
                        )}
                        {assistant.kind === "recommendation" && (
                          <div className="note">
                            Recommendation:{" "}
                            {
                              catalogue.find(
                                (item) => item.id === assistant.serviceId,
                              )?.name
                            }
                            . Add a service manually after reviewing it.
                          </div>
                        )}
                        {assistant.kind === "cannot-match" && (
                          <div className="note">
                            Human review needed · No suitable inspection item
                            exists in the demonstration catalogue.
                          </div>
                        )}
                        {assistant.kind === "safety-escalation" && (
                          <div className="note">
                            Safety escalation · Do not continue driving. Arrange
                            roadside assistance or recovery.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold mb-4">Main services</h2>
              {catalogueStatus === "loading" && (
                <p role="status">Loading demonstration services…</p>
              )}
              {catalogueStatus === "error" && (
                <p className="error" role="alert">
                  Service catalogue unavailable. Please try again later.
                </p>
              )}
              <div className="card-list">
                {mainServices.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    data-testid={`service-${item.id}`}
                    className={`service-card ${draft.mainServiceId === item.id ? "selected" : ""}`}
                    disabled={!selectable(item, draft.vehicle)}
                    aria-pressed={draft.mainServiceId === item.id}
                    onClick={() => {
                      try {
                        selectServiceId(item.id, catalogue, draft.vehicle);
                        setDraft((current) => ({
                          ...current,
                          mainServiceId: item.id,
                        }));
                      } catch {
                        /* no selection */
                      }
                    }}
                  >
                    <span className="radio" aria-hidden="true" />
                    <span>
                      <strong>{item.name}</strong>
                      <span className="description">
                        {item.description}
                        {item.evOnly && !selectable(item, draft.vehicle)
                          ? " Electric vehicle only; unavailable for this demonstration vehicle."
                          : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="note">
                Demonstration catalogue only. Vehicle-specific availability,
                inclusions and pricing await AutoQuotes records.
              </div>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() => setStep("vehicle")}
                >
                  Back
                </button>
                <button
                  className="primary"
                  disabled={!draft.mainServiceId || catalogueStatus !== "ready"}
                  onClick={() => setStep("additional")}
                >
                  Next: additional services
                </button>
              </div>
            </section>
          )}
          {step === "additional" && (
            <section aria-labelledby="additional-title">
              <h1 id="additional-title">Additional services</h1>
              <p className="lead">
                Select any additional items you want to ask about.
              </p>
              <div className="note">
                Demonstration catalogue items. Selection does not confirm
                eligibility, suitability, centre availability or a repair
                diagnosis.
              </div>
              <div>
                {additionalServices.map((item) => (
                  <label className="check-row" key={item.id}>
                    <input
                      type="checkbox"
                      checked={draft.additionalServiceIds.includes(item.id)}
                      disabled={!selectable(item, draft.vehicle)}
                      onChange={() => toggleAdditional(item.id)}
                    />
                    <span>
                      {item.name}
                      {item.evOnly && !selectable(item, draft.vehicle)
                        ? " · Electric vehicle only"
                        : ""}
                    </span>
                  </label>
                ))}
              </div>
              <button className="secondary mt-5" onClick={openAssistant}>
                Looking for something not listed?
              </button>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() => setStep("services")}
                >
                  Back
                </button>
                <button className="primary" onClick={() => setStep("review")}>
                  Next: review selections
                </button>
              </div>
            </section>
          )}
          {step === "review" && (
            <section aria-labelledby="review-title">
              <h1 id="review-title">Review your selections</h1>
              <p className="lead">
                This is the end of the demonstration journey. No quote,
                appointment or booking has been created.
              </p>
              <div className="panel">
                <h2>Vehicle</h2>
                <p>
                  {draft.vehicle?.year} {draft.vehicle?.make}{" "}
                  {draft.vehicle?.model} · Synthetic demonstration data
                </p>
              </div>
              <h2 className="text-2xl font-bold">
                Selected demonstration services
              </h2>
              <ul className="review-list">
                {selectedServices.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
              <div className="note">
                Prices, vehicle applicability and workshop availability have not
                been retrieved from AutoQuotes. Please do not use this prototype
                to make a booking decision.
              </div>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() => setStep(previousStep(step))}
                >
                  Back to additional services
                </button>
              </div>
            </section>
          )}
          <footer className="mt-14 text-xs text-slate-500">
            RAC Auto Services concept demonstration · No live customer or
            booking data
          </footer>
        </div>
      </main>
    </div>
  );
}

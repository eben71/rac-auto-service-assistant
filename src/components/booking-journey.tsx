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
  BookingLayout,
  PageHeading,
  TextField,
  PrimaryButton,
  TextButton,
  VehicleSummary,
  ServiceCard,
  AdditionalServiceRow,
  AdditionalServicesCard,
} from "./booking-ui";
import { ServiceAssistant } from "./service-assistant";

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
  const [catalogueRetry, setCatalogueRetry] = useState(0);
  const [assistant, setAssistant] = useState<AssistantState>({ kind: "idle" });
  const [assistantExpanded, setAssistantExpanded] = useState(false);
  const [assistantFocusRequest, setAssistantFocusRequest] = useState(0);
  const manualRef = useRef<HTMLHeadingElement>(null);
  const assistantNavigationRef = useRef(false);

  useEffect(() => {
    if (assistantNavigationRef.current) {
      assistantNavigationRef.current = false;
      return;
    }
    const frame = window.requestAnimationFrame?.(() => window.scrollTo(0, 0));
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [step]);

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
  }, [draft.vehicle, catalogueRetry]);

  function updateCustomer(
    key: "firstName" | "lastName" | "email",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      customer: { ...current.customer, [key]: value },
    }));
    if (formErrors[key])
      setFormErrors((current) => ({ ...current, [key]: "" }));
  }

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
          workshopNotes: [],
        }));
        setAssistant({ kind: "idle" });
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
      workshopNotes: [],
    }));
    setAssistant({ kind: "idle" });
    setCatalogue([]);
    setCatalogueStatus("idle");
    setLookupStatus("idle");
  }

  function toggleMainService(id: string) {
    if (draft.mainServiceId === id) {
      setDraft((current) => ({
        ...current,
        mainServiceId: null,
        workshopNotes: [],
      }));
      return;
    }
    try {
      selectServiceId(id, catalogue, draft.vehicle);
    } catch {
      return;
    }
    setDraft((current) => ({
      ...current,
      mainServiceId: id,
      workshopNotes: [],
    }));
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

  function addRecommendation(id: string, workshopNotes?: string) {
    try {
      const item = selectServiceId(id, catalogue, draft.vehicle);
      if (item.category !== "main" || assistant.kind === "safety-escalation")
        return;
      setDraft((current) => ({
        ...current,
        mainServiceId: id,
        workshopNotes: workshopNotes ? [workshopNotes] : [],
      }));
    } catch {
      /* Reject an invalid or no-longer-available catalogue ID. */
    }
  }

  function openAssistant() {
    assistantNavigationRef.current = true;
    setStep("services");
    setAssistantExpanded(true);
    setAssistantFocusRequest((current) => current + 1);
  }

  function focusManualSelection() {
    manualRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    manualRef.current?.focus();
  }

  const mainServices = catalogue.filter((item) => item.category === "main");
  const additionalServices = catalogue.filter(
    (item) => item.category === "additional",
  );
  const selectedServices = catalogue.filter(
    (item) =>
      item.id === draft.mainServiceId ||
      draft.additionalServiceIds.includes(item.id),
  );
  const safetyHold = assistant.kind === "safety-escalation";

  return (
    <BookingLayout step={step}>
      {step === "begin" && (
        <section aria-labelledby="begin-title">
          <PageHeading
            id="begin-title"
            title="Begin quote"
            description="Please provide your details to begin this demonstration quote."
          />
          <div className="customer-fields">
            <TextField
              id="first-name"
              label="First name"
              placeholder="e.g. John"
              value={draft.customer.firstName}
              onChange={(value) => updateCustomer("firstName", value)}
              error={formErrors.firstName}
            />
            <TextField
              id="last-name"
              label="Last name"
              placeholder="e.g. Smith"
              value={draft.customer.lastName}
              onChange={(value) => updateCustomer("lastName", value)}
              error={formErrors.lastName}
            />
            <TextField
              id="email"
              label="Email address"
              type="email"
              placeholder="e.g. john.smith@example.com"
              value={draft.customer.email}
              onChange={(value) => updateCustomer("email", value)}
              error={formErrors.email}
            />
          </div>
          <PrimaryButton
            aria-label="Next: vehicle details"
            onClick={continueCustomer}
          >
            Next
          </PrimaryButton>
          <p className="demo-footnote">
            Use synthetic details only. Nothing is persisted or sent to an AI
            provider.
          </p>
        </section>
      )}

      {step === "vehicle" && (
        <section aria-labelledby="vehicle-title">
          <PageHeading
            id="vehicle-title"
            title="Vehicle details"
            question="What do you drive?"
            description="Tell us about your car so we can show demonstration service options. You can change it later."
          />
          <h2 className="section-label">Find your car</h2>
          <div
            className="lookup-tabs"
            role="tablist"
            aria-label="Vehicle lookup method"
          >
            <button
              role="tab"
              aria-selected={mode === "registration"}
              className={mode === "registration" ? "selected" : ""}
              onClick={() => {
                setMode("registration");
                setLookupStatus("idle");
              }}
            >
              By registration
            </button>
            <button
              role="tab"
              aria-selected={mode === "make-model"}
              className={mode === "make-model" ? "selected" : ""}
              onClick={() => {
                setMode("make-model");
                setLookupStatus("idle");
              }}
            >
              By make &amp; model
            </button>
          </div>
          {draft.vehicle ? (
            <VehicleSummary vehicle={draft.vehicle} onChange={changeVehicle} />
          ) : (
            <div className="lookup-panel" role="tabpanel">
              {mode === "registration" ? (
                <TextField
                  id="registration"
                  label="Registration"
                  placeholder="Try DEMO16"
                  value={registration}
                  onChange={setRegistration}
                />
              ) : (
                <div className="make-model-fields">
                  <label className="field" htmlFor="make">
                    <span>Make</span>
                    <select
                      id="make"
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
                  <label className="field" htmlFor="model">
                    <span>Model</span>
                    <select
                      id="model"
                      className="input"
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                    >
                      <option value="">Select model</option>
                      {make === "Mitsubishi" && <option>Pajero Sport</option>}
                      {make === "Toyota" && <option>Corolla</option>}
                      {make === "Nissan" && <option>Leaf</option>}
                    </select>
                  </label>
                </div>
              )}
              <PrimaryButton
                onClick={lookupVehicle}
                disabled={lookupStatus === "loading"}
              >
                {lookupStatus === "loading"
                  ? "Looking up vehicle…"
                  : "Find car"}
              </PrimaryButton>
              <div role="status" aria-live="polite">
                {lookupStatus === "not-found" && (
                  <p className="status-message">
                    No demonstration vehicle found. Try DEMO16 or use make and
                    model.
                  </p>
                )}
                {lookupStatus === "error" && (
                  <p className="field-error">
                    Vehicle lookup is unavailable or the input is invalid.
                    Please try again.
                  </p>
                )}
              </div>
            </div>
          )}
          {draft.vehicle && (
            <PrimaryButton
              aria-label="Next: select service"
              onClick={() => setStep(nextStep(step))}
            >
              Next
            </PrimaryButton>
          )}
          <div className="back-row">
            <TextButton onClick={() => setStep("begin")}>
              ‹&nbsp; Back
            </TextButton>
          </div>
          <p className="demo-footnote">
            Synthetic lookup only. DEMO16 returns a 2016 Mitsubishi Pajero
            Sport; this is not a production vehicle search.
          </p>
        </section>
      )}

      {step === "services" && (
        <section aria-labelledby="services-title">
          <PageHeading
            id="services-title"
            title="Service selection"
            question={`What does your ${draft.vehicle?.make.toUpperCase() ?? "VEHICLE"} ${draft.vehicle?.model.toUpperCase() ?? ""} need?`}
            description="Select a main service package, explore additional services, or ask for help below."
          />
          <ServiceAssistant
            state={assistant}
            onStateChange={setAssistant}
            catalogue={catalogue}
            vehicle={draft.vehicle}
            selectedMainId={draft.mainServiceId}
            onAddRecommendation={addRecommendation}
            onManualSelection={focusManualSelection}
            focusRequest={assistantFocusRequest}
            expanded={assistantExpanded}
            onExpandedChange={setAssistantExpanded}
          />
          <h2 className="manual-heading" ref={manualRef} tabIndex={-1}>
            Select a service manually
          </h2>
          {catalogueStatus === "loading" && (
            <p role="status" className="status-message">
              Loading demonstration services…
            </p>
          )}
          {catalogueStatus === "error" && (
            <div role="alert" className="status-message">
              <p>Service catalogue unavailable. Please try again.</p>
              <TextButton
                onClick={() => {
                  setCatalogueStatus("loading");
                  setCatalogueRetry((current) => current + 1);
                }}
              >
                Retry loading services
              </TextButton>
            </div>
          )}
          <div className="service-list">
            {mainServices.map((item) => (
              <ServiceCard
                key={item.id}
                item={item}
                selected={draft.mainServiceId === item.id}
                disabled={!selectable(item, draft.vehicle)}
                onSelect={() => toggleMainService(item.id)}
              />
            ))}
          </div>
          {catalogueStatus === "ready" && (
            <>
              <div className="or-divider">
                <span>OR</span>
              </div>
              <AdditionalServicesCard
                disabled={safetyHold}
                onSelect={() => setStep("additional")}
              />
            </>
          )}
          <p className="demo-footnote">
            These are synthetic catalogue fixtures. Vehicle-specific
            applicability, inclusions and pricing await AutoQuotes records.
          </p>
          {safetyHold && (
            <p className="safety-hold" role="alert">
              Booking progression is paused while this safety concern is active.
              Arrange roadside assistance or recovery.
            </p>
          )}
          {draft.mainServiceId && (
            <PrimaryButton
              aria-label="Next: additional services"
              disabled={safetyHold}
              onClick={() => setStep("additional")}
            >
              Next
            </PrimaryButton>
          )}
          <div className="back-row">
            <TextButton onClick={() => setStep("vehicle")}>
              ‹&nbsp; Back
            </TextButton>
          </div>
        </section>
      )}

      {step === "additional" && (
        <section aria-labelledby="additional-title">
          <PageHeading
            id="additional-title"
            title="Additional services"
            description="Select any of these demonstration service items to add to your selection."
          />
          <div className="additional-list">
            {additionalServices.map((item) => (
              <AdditionalServiceRow
                key={item.id}
                item={item}
                checked={draft.additionalServiceIds.includes(item.id)}
                disabled={!selectable(item, draft.vehicle)}
                onToggle={() => toggleAdditional(item.id)}
              />
            ))}
          </div>
          <div className="not-listed">
            <TextButton onClick={openAssistant}>
              Looking for something not listed? ›
            </TextButton>
          </div>
          {safetyHold && (
            <p className="safety-hold" role="alert">
              Booking progression is paused. Arrange roadside assistance or
              recovery.
            </p>
          )}
          <PrimaryButton
            aria-label="Next: review selections"
            disabled={safetyHold}
            onClick={() => setStep("review")}
          >
            Next
          </PrimaryButton>
          <div className="back-row">
            <TextButton onClick={() => setStep("services")}>
              ‹&nbsp; Back
            </TextButton>
          </div>
          <p className="demo-footnote">
            Selection does not confirm eligibility, diagnostic suitability or
            workshop availability.
          </p>
        </section>
      )}

      {step === "review" && (
        <section aria-labelledby="review-title">
          <PageHeading
            id="review-title"
            title="Review your selections"
            description="This is the end of the demonstration journey. No quote, appointment or booking has been created."
          />
          <div className="review-block">
            <h2>Vehicle</h2>
            <p>
              {draft.vehicle?.year} {draft.vehicle?.make} {draft.vehicle?.model}{" "}
              · Synthetic demonstration data
            </p>
          </div>
          <div className="review-block">
            <h2>Selected demonstration services</h2>
            {selectedServices.length ? (
              <ul>
                {selectedServices.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            ) : (
              <p>No services selected.</p>
            )}
          </div>
          {draft.workshopNotes.length > 0 && (
            <div className="review-block">
              <h2>Workshop notes to confirm</h2>
              <ul>
                {draft.workshopNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="demo-footnote">
            Prices, vehicle applicability and workshop availability have not
            been retrieved from AutoQuotes.
          </p>
          <div className="back-row">
            <TextButton onClick={() => setStep(previousStep(step))}>
              ‹&nbsp; Back to additional services
            </TextButton>
          </div>
        </section>
      )}
    </BookingLayout>
  );
}

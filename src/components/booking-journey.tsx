"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AssistantState,
  BookingDraft,
  BookingStep,
  ServiceItem,
  Vehicle,
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
  VehicleArtwork,
  ServiceCard,
  AdditionalServiceRow,
  AdditionalServicesCard,
} from "./booking-ui";
import { ServiceAssistant } from "./service-assistant";
import type { DeveloperProfile } from "@/server/profiles";
import type { VehicleImage } from "@/server/vehicle-images";
import type { ServiceSchedule } from "@/server/autoquotes/mock";

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
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showSaved, setShowSaved] = useState(true);
  const [garageMessage, setGarageMessage] = useState("");
  const [vehicleImage, setVehicleImage] = useState<VehicleImage | null>(null);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
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
  const sessionGeneration = useRef(0);

  useEffect(() => {
    const generation = sessionGeneration.current;
    fetch("/api/demo-session")
      .then((response) => response.json())
      .then((data: { profile: DeveloperProfile | null }) => {
        if (generation === sessionGeneration.current) setProfile(data.profile);
        if (generation === sessionGeneration.current && data.profile) {
          setShowSaved(true);
          setStep("vehicle");
        }
        setSessionReady(true);
      })
      .catch(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    if (!draft.vehicle) return;
    let cancelled = false;
    // Only make/model and a fixture ID reach this endpoint. No registration or VIN.
    postJson("/api/vehicle-image", {
      id: draft.vehicle.id,
      make: draft.vehicle.make,
      model: draft.vehicle.model,
    })
      .then((data) => {
        if (!cancelled)
          setVehicleImage((data as { image: VehicleImage | null }).image);
      })
      .catch(() => {
        if (!cancelled) setVehicleImage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.vehicle]);

  useEffect(() => {
    if (draft.mainServiceId !== "9" || !draft.vehicle?.mid) return;
    let cancelled = false;
    postJson("/api/schedules", { mid: draft.vehicle.mid })
      .then((data) => {
        if (!cancelled) {
          setSchedules((data as { schedules: ServiceSchedule[] }).schedules);
          setScheduleStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setScheduleStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [draft.mainServiceId, draft.vehicle]);

  async function signIn() {
    setLoginError("");
    try {
      // Password is deliberately neither validated nor sent or stored.
      const data = await postJson("/api/demo-session", {
        email: loginEmail.trim(),
      });
      sessionGeneration.current++;
      setProfile((data as { profile: DeveloperProfile }).profile);
      setPassword("");
      setLoginOpen(false);
      setShowSaved(true);
      setStep("vehicle");
    } catch {
      setLoginError("Unable to sign in with that email.");
    }
  }
  async function signOut() {
    sessionGeneration.current++;
    await fetch("/api/demo-session", { method: "DELETE" });
    setProfile(null);
    setShowSaved(false);
    setLoginOpen(false);
    setGarageMessage("");
    changeVehicle();
    setStep("begin");
  }
  async function manageVehicle(operation: "add" | "remove", vehicle: Vehicle) {
    try {
      const data = await postJson("/api/my-vehicles", { operation, vehicle });
      setProfile((data as { profile: DeveloperProfile }).profile);
      setGarageMessage(
        operation === "add"
          ? "Vehicle added to My vehicles."
          : "Vehicle removed from My vehicles.",
      );
    } catch {
      setGarageMessage("Could not update My vehicles. Please try again.");
    }
  }
  function selectVehicle(vehicle: Vehicle) {
    setVehicleImage(null);
    setSchedules([]);
    setScheduleStatus("idle");
    setDraft((current) => ({
      ...current,
      vehicle,
      mainServiceId:
        current.vehicle?.id === vehicle.id ? current.mainServiceId : null,
      additionalServiceIds:
        current.vehicle?.id === vehicle.id ? current.additionalServiceIds : [],
      workshopNotes:
        current.vehicle?.id === vehicle.id ? current.workshopNotes : [],
      serviceScheduleId:
        current.vehicle?.id === vehicle.id ? current.serviceScheduleId : null,
    }));
    setAssistant({ kind: "idle" });
    setCatalogue([]);
    setCatalogueStatus("loading");
    setLookupStatus("idle");
    setShowSaved(false);
  }

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
        selectVehicle(result.vehicle);
      } else
        setLookupStatus(result.status === "not-found" ? "not-found" : "error");
    } catch {
      setLookupStatus("error");
    }
  }

  function changeVehicle() {
    setVehicleImage(null);
    setSchedules([]);
    setScheduleStatus("idle");
    setDraft((current) => ({
      ...current,
      vehicle: null,
      mainServiceId: null,
      additionalServiceIds: [],
      workshopNotes: [],
      serviceScheduleId: null,
    }));
    setAssistant({ kind: "idle" });
    setCatalogue([]);
    setCatalogueStatus("idle");
    setLookupStatus("idle");
    setShowSaved(!!profile);
  }

  function toggleMainService(id: string) {
    setSchedules([]);
    setScheduleStatus(
      id === "9" && draft.mainServiceId !== id && draft.vehicle?.mid
        ? "loading"
        : "idle",
    );
    if (draft.mainServiceId === id) {
      setDraft((current) => ({
        ...current,
        mainServiceId: null,
        workshopNotes: [],
        serviceScheduleId: null,
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
      serviceScheduleId: null,
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
        serviceScheduleId: null,
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

  const mainServices = catalogue.filter(
    (item) =>
      item.category === "main" &&
      item.isActive !== false &&
      item.availableOnline !== false,
  );
  const additionalServices = catalogue.filter(
    (item) =>
      item.category === "additional" &&
      item.isActive !== false &&
      item.availableOnline !== false,
  );
  const selectedServices = catalogue.filter(
    (item) =>
      item.id === draft.mainServiceId ||
      draft.additionalServiceIds.includes(item.id),
  );
  const safetyHold = assistant.kind === "safety-escalation";

  return (
    <BookingLayout
      step={step}
      profileName={profile?.displayName}
      onSignIn={() => {
        setLoginOpen(true);
        setStep("begin");
      }}
      onVehicles={() => {
        setShowSaved(true);
        setStep("vehicle");
      }}
      onSignOut={signOut}
    >
      {step === "begin" && (
        <section aria-labelledby="begin-title">
          <div className="entry-actions">
            <TextButton
              onClick={() => {
                setLoginOpen(true);
                setLoginError("");
              }}
            >
              Sign in
            </TextButton>
            <TextButton
              onClick={() => {
                setLoginOpen(false);
                setShowSaved(false);
              }}
            >
              Continue as guest
            </TextButton>
          </div>
          {loginOpen ? (
            <>
              <PageHeading
                id="begin-title"
                title="Sign in"
                description="Choose a configured developer profile for this local demonstration. Email does not verify identity."
              />
              <TextField
                id="login-email"
                label="Email address"
                type="email"
                value={loginEmail}
                onChange={setLoginEmail}
              />
              <TextField
                id="login-password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
              />
              <PrimaryButton onClick={signIn}>Sign in</PrimaryButton>
              {loginError && (
                <p role="alert" className="field-error">
                  {loginError}
                </p>
              )}
              <p className="demo-footnote">
                Any password is accepted in this demo. It is never stored or
                sent. Use Continue as guest to book without a profile.
              </p>
            </>
          ) : (
            <>
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
                Use synthetic details only. Nothing is persisted or sent to an
                AI provider.
              </p>
            </>
          )}
        </section>
      )}

      {step === "vehicle" && (
        <section aria-labelledby="vehicle-title">
          <PageHeading
            id="vehicle-title"
            title={
              profile ? "Which vehicle are we servicing?" : "Vehicle details"
            }
            question={profile ? undefined : "What do you drive?"}
            description="Tell us about your car so we can show demonstration service options. You can change it later."
          />
          {sessionReady && profile && showSaved && (
            <div className="saved-vehicles">
              <h2 className="section-label">My vehicles</h2>
              {profile.savedVehicles.length ? (
                profile.savedVehicles.map((vehicle) => (
                  <div className="saved-vehicle" key={vehicle.id}>
                    <VehicleArtwork vehicle={vehicle} />
                    <div>
                      <strong>
                        {vehicle.make} {vehicle.model}
                      </strong>
                      <p>
                        {vehicle.year ? `${vehicle.year} · ` : ""}
                        {vehicle.registration ?? "Illustrative profile vehicle"}
                      </p>
                      {vehicle.details && <p>{vehicle.details}</p>}
                      <TextButton onClick={() => selectVehicle(vehicle)}>
                        Select this vehicle
                      </TextButton>
                      <TextButton
                        onClick={() => manageVehicle("remove", vehicle)}
                      >
                        Remove
                      </TextButton>
                    </div>
                  </div>
                ))
              ) : (
                <p>No saved vehicles yet.</p>
              )}
              <TextButton
                onClick={() => {
                  changeVehicle();
                  setShowSaved(false);
                }}
              >
                Find another vehicle
              </TextButton>
            </div>
          )}
          {(!profile || !showSaved || draft.vehicle) && (
            <>
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
                <VehicleSummary
                  vehicle={draft.vehicle}
                  image={vehicleImage}
                  onChange={changeVehicle}
                />
              ) : (
                <div className="lookup-panel" role="tabpanel">
                  {mode === "registration" ? (
                    <TextField
                      id="registration"
                      label="Registration"
                      placeholder="Try 1GDU034"
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
                          {make === "Mitsubishi" && (
                            <option>Pajero Sport</option>
                          )}
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
                        No demonstration vehicle found. Try 1GDU034 or use make
                        and model.
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
              {profile &&
                draft.vehicle &&
                !profile.savedVehicles.some(
                  (vehicle) => vehicle.id === draft.vehicle?.id,
                ) && (
                  <TextButton
                    onClick={() => manageVehicle("add", draft.vehicle!)}
                  >
                    Add to my vehicles
                  </TextButton>
                )}
              {draft.vehicle && (
                <PrimaryButton
                  aria-label="Next: select service"
                  onClick={() => setStep(nextStep(step))}
                >
                  Next
                </PrimaryButton>
              )}
            </>
          )}
          {garageMessage && (
            <p role="status" className="status-message">
              {garageMessage}
            </p>
          )}
          <div className="back-row">
            <TextButton onClick={() => setStep("begin")}>
              ‹&nbsp; Back
            </TextButton>
          </div>
          <p className="demo-footnote">
            Synthetic lookup only. 1GDU034 returns a 2016 Mitsubishi Pajero
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
          {draft.mainServiceId === "9" && (
            <div className="schedule-panel">
              <h2 className="section-label">Logbook schedule</h2>
              {!draft.vehicle?.mid ? (
                <p>
                  Vehicle-specific logbook schedules are unavailable for this
                  illustrative vehicle in demo mode.
                </p>
              ) : scheduleStatus === "loading" ? (
                <p role="status">Loading schedule options…</p>
              ) : scheduleStatus === "error" ? (
                <p role="alert">
                  Schedule options are unavailable. Please ask the workshop.
                </p>
              ) : schedules.length ? (
                <label className="field" htmlFor="schedule">
                  <span>Choose a schedule option</span>
                  <select
                    className="input"
                    id="schedule"
                    value={draft.serviceScheduleId ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        serviceScheduleId: event.target.value || null,
                      }))
                    }
                  >
                    <option value="">Select a schedule</option>
                    {schedules.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.description}
                      </option>
                    ))}
                  </select>
                  <small>
                    These are supplied mock options. Confirm the correct
                    schedule with the workshop.
                  </small>
                </label>
              ) : (
                <p>No schedule options are available.</p>
              )}
            </div>
          )}
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
          {draft.mainServiceId === "9" && (
            <div className="review-block">
              <h2>Logbook schedule</h2>
              <p>
                {schedules.find(
                  (option) => option.id === draft.serviceScheduleId,
                )?.description ??
                  "Not selected or unavailable. Confirm with the workshop."}
              </p>
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

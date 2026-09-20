import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { BookingStep, ServiceItem, Vehicle } from "@/domain/models";

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
const activeIndex: Record<BookingStep, number> = {
  begin: 0,
  vehicle: 1,
  services: 2,
  additional: 2,
  review: 2,
};

export function BookingLayout({
  step,
  children,
}: {
  step: BookingStep;
  children: ReactNode;
}) {
  const current = activeIndex[step];
  return (
    <div className="booking-shell">
      <aside className="sidebar" aria-label="Booking progress">
        <div className="sidebar-header">
          <div
            className="brand"
            aria-label="RAC Auto Services branding placeholder"
          >
            <span className="brand-mark">RAC</span>
            <span className="brand-caption">
              Auto Services · demo placeholder
            </span>
          </div>
          <h2>Your Service</h2>
        </div>
        <nav aria-label="Booking progress">
          <ol className="steps">
            {progress.map((label, index) => (
              <li
                key={label}
                className={
                  index < current ? "done" : index === current ? "active" : ""
                }
                aria-current={index === current ? "step" : undefined}
              >
                <span className="step-dot" aria-hidden="true" />
                <span className="step-label">
                  {label}
                  {index >= 3 && <small>Outside demo scope</small>}
                </span>
              </li>
            ))}
          </ol>
        </nav>
        <p className="sidebar-footnote">
          Concept demonstration · No booking submitted
        </p>
      </aside>
      <main className="main">
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

export function PageHeading({
  id,
  title,
  question,
  description,
}: {
  id: string;
  title: string;
  question?: string;
  description: string;
}) {
  return (
    <header className="page-heading">
      <h1 id={id} tabIndex={-1}>
        {title}
      </h1>
      {question && <p className="page-question">{question}</p>}
      <p className="lead">{description}</p>
    </header>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  id,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  error?: string;
  type?: string;
  placeholder?: string;
  id: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span className="field-error" role="alert" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="primary">
      {children}
    </button>
  );
}
export function TextButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`secondary ${className}`}>
      {children}
    </button>
  );
}

export function VehicleSummary({
  vehicle,
  onChange,
}: {
  vehicle: Vehicle;
  onChange(): void;
}) {
  return (
    <div className="vehicle-summary-block">
      <h3>Your car details</h3>
      <div className="vehicle-summary">
        <strong>
          {vehicle.make.toUpperCase()} {vehicle.model.toUpperCase()}
        </strong>
        <span>
          {vehicle.year}
          {vehicle.registration ? ` · ${vehicle.registration}` : ""}
        </span>
        <small>
          Synthetic demonstration vehicle · details beyond the fixture are
          unverified
        </small>
      </div>
      <TextButton onClick={onChange}>Change car</TextButton>
    </div>
  );
}

function ServiceIcon({ id }: { id: string }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (id === "logbook")
    return (
      <svg
        className="service-icon"
        viewBox="0 0 48 48"
        aria-hidden="true"
        {...shared}
      >
        <rect x="10" y="5" width="29" height="38" rx="2" />
        <path d="M16 5v38M21 15h12M21 22h12M21 29h9" />
      </svg>
    );
  if (id === "vehicle-inspection")
    return (
      <svg
        className="service-icon"
        viewBox="0 0 48 48"
        aria-hidden="true"
        {...shared}
      >
        <circle cx="20" cy="20" r="12" />
        <path d="m29 29 13 13" />
      </svg>
    );
  if (id === "additional")
    return (
      <svg
        className="service-icon"
        viewBox="0 0 48 48"
        aria-hidden="true"
        {...shared}
      >
        <circle cx="24" cy="24" r="11" />
        <circle cx="24" cy="24" r="4" />
        <path d="M24 3v10M24 35v10M3 24h10M35 24h10M9 9l7 7M32 32l7 7M39 9l-7 7M16 32l-7 7" />
      </svg>
    );
  return (
    <svg
      className="service-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      {...shared}
    >
      <path d="M37 7a12 12 0 0 0-14 15L8 37a5 5 0 0 0 7 7l15-15A12 12 0 0 0 45 15l-9 9-9-3-3-9z" />
    </svg>
  );
}

export function ServiceCard({
  item,
  selected,
  disabled,
  onSelect,
}: {
  item: ServiceItem;
  selected: boolean;
  disabled: boolean;
  onSelect(): void;
}) {
  return (
    <button
      type="button"
      data-testid={`service-${item.id}`}
      className={`service-card ${selected ? "selected" : ""}`}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <ServiceIcon id={item.id} />
      <span className="service-copy">
        <strong>{item.name}</strong>
        <span>
          {item.description}
          {disabled && item.evOnly
            ? " Electric vehicle only for this demo."
            : ""}
        </span>
      </span>
      <span className="service-selection" aria-hidden="true">
        {selected ? "✓" : ""}
      </span>
    </button>
  );
}

export function AdditionalServicesCard({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect(): void;
}) {
  return (
    <button
      type="button"
      className="service-card additional-card"
      disabled={disabled}
      onClick={onSelect}
    >
      <ServiceIcon id="additional" />
      <span className="service-copy">
        <strong>Additional services</strong>
        <span>
          Looking for something else? Explore demonstration service items you
          can add to your selection.
        </span>
      </span>
      <span className="card-arrow" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

export function AdditionalServiceRow({
  item,
  checked,
  disabled,
  onToggle,
}: {
  item: ServiceItem;
  checked: boolean;
  disabled: boolean;
  onToggle(): void;
}) {
  return (
    <label className={`check-row ${checked ? "checked" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <span>
        {item.name}
        {disabled && item.evOnly ? " · Electric vehicle only" : ""}
      </span>
    </label>
  );
}

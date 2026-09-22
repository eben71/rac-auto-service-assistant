"use client";
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import Image from "next/image";
import type { BookingStep, ServiceItem, Vehicle } from "@/domain/models";
import {
  profileImageEntries,
  profileVehicles,
} from "@/domain/profile-fixtures";
import type { VehicleImage } from "@/server/vehicle-images";

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
  profileName,
  onSignIn,
  onVehicles,
  onSignOut,
  onStartNewBooking,
}: {
  step: BookingStep;
  children: ReactNode;
  profileName?: string;
  onSignIn(): void;
  onVehicles(): void;
  onSignOut(): void;
  onStartNewBooking(): void;
}) {
  const current = activeIndex[step];
  return (
    <div className="booking-shell">
      <aside className="sidebar" aria-label="Booking progress">
        <div className="sidebar-header">
          <div className="brand">
            <Image
              className="brand-logo"
              src="/brand/rac-for-the-better.png"
              width={176}
              height={161}
              priority
              alt="RAC — For the better"
            />
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
        <details
          className="profile-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary>{profileName ?? "Guest"}</summary>
          <div className="profile-menu-actions">
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                onStartNewBooking();
              }}
            >
              Start a new booking
            </button>
            {profileName ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    onVehicles();
                  }}
                >
                  My vehicles
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    onSignOut();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                  onSignIn();
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </details>
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

export function Spinner({
  label = "Loading",
  size = "sm",
}: {
  label?: string;
  size?: "sm" | "lg";
}) {
  return (
    <span className={`spinner spinner-${size}`} role="status" aria-label={label}>
      <span className="spinner-circle" aria-hidden="true" />
    </span>
  );
}

export function VehicleSummary({
  vehicle,
  onChange,
  image,
  compact = false,
  children,
}: {
  vehicle: Vehicle;
  onChange(): void;
  image?: VehicleImage | null;
  compact?: boolean;
  children?: ReactNode;
}) {
  const effectiveYear = vehicle.customerDetails?.year ?? vehicle.year;
  return (
    <div className={`vehicle-summary-block ${compact ? "compact" : ""}`}>
      <h3>{compact ? "Selected vehicle" : "Your car details"}</h3>
      <div className="vehicle-summary">
        <VehicleArtwork key={vehicle.id} vehicle={vehicle} image={image} />
        <strong>
          {vehicle.make.toUpperCase()} {vehicle.model.toUpperCase()}
        </strong>
        <span>
          {effectiveYear ?? "Year not provided"}
          {vehicle.registration ? ` · ${vehicle.registration}` : ""}
          {vehicle.energyType
            ? ` · ${vehicle.energyType[0].toUpperCase()}${vehicle.energyType.slice(1)}`
            : ""}
        </span>
        {vehicle.details && <span>{vehicle.details}</span>}
        {(vehicle.customerDetails?.nickname ||
          vehicle.customerDetails?.colour ||
          vehicle.customerDetails?.odometerKm !== undefined) && (
          <span className="vehicle-extra-summary">
            {[
              vehicle.customerDetails.nickname,
              vehicle.customerDetails.colour,
              vehicle.customerDetails.odometerKm !== undefined
                ? `${vehicle.customerDetails.odometerKm.toLocaleString()} km`
                : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
        <small>
          {vehicle.source === "illustrative-profile"
            ? "Illustrative profile vehicle · vehicle-specific eligibility and schedules unavailable"
            : vehicle.dataProvenance?.technical === "supplied-sample"
              ? "Mock vehicle · technical fields are from a supplied AutoQuotes sample"
              : "Synthetic demo vehicle · unlisted technical details are unavailable"}
        </small>
      </div>
      {children}
      <TextButton onClick={onChange}>Change car</TextButton>
    </div>
  );
}

export function VehicleArtwork({
  vehicle,
  image,
}: {
  vehicle: Vehicle;
  image?: VehicleImage | null;
}) {
  const fixtureIndex = profileVehicles.findIndex(
    (item) =>
      item.id === vehicle.id &&
      item.make === vehicle.make &&
      item.model === vehicle.model,
  );
  const [resolved, setResolved] = useState<VehicleImage | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    if (fixtureIndex >= 0 || image !== undefined) return;
    let cancelled = false;
    fetch("/api/vehicle-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
      }),
    })
      .then((response) => response.json())
      .then((data: { image: VehicleImage | null }) => {
        if (!cancelled) setResolved(data.image);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fixtureIndex, image, vehicle.id, vehicle.make, vehicle.model]);
  const current = image ?? resolved;
  const source = imageFailed
    ? "/vehicles/generic.svg"
    : (current?.url ??
      (fixtureIndex >= 0
        ? profileImageEntries[fixtureIndex].path
        : "/vehicles/generic.svg"));
  const illustrative = !imageFailed && (!!current || fixtureIndex >= 0);
  return (
    <div className="vehicle-artwork">
      <Image
        src={source}
        width={220}
        height={124}
        unoptimized
        onError={() => setImageFailed(true)}
        alt={
          illustrative
            ? (current?.alt ??
              `Representative illustration of ${vehicle.make} ${vehicle.model}`)
            : "Generic vehicle silhouette"
        }
      />
      <small>
        {illustrative ? (
          <>
            Representative artwork:{" "}
            <a
              href="https://github.com/dobbygl/allbrands-api"
              target="_blank"
              rel="noreferrer"
            >
              AllBrands (CC BY 4.0)
            </a>
          </>
        ) : (
          "Generic vehicle illustration"
        )}
      </small>
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
  if (id === "9")
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
  if (id === "4")
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

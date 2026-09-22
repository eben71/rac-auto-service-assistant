import type { BookingDraft, BookingStep, ServiceItem, Vehicle } from "./models";

export const initialDraft: BookingDraft = {
  customer: { firstName: "", lastName: "", email: "" },
  vehicle: null,
  mainServiceId: null,
  additionalServiceIds: [],
  workshopNotes: [],
  serviceScheduleId: null,
};
export const stepOrder: BookingStep[] = [
  "begin",
  "vehicle",
  "services",
  "additional",
  "review",
];
export function nextStep(step: BookingStep): BookingStep {
  return stepOrder[Math.min(stepOrder.indexOf(step) + 1, stepOrder.length - 1)];
}
export function previousStep(step: BookingStep): BookingStep {
  return stepOrder[Math.max(stepOrder.indexOf(step) - 1, 0)];
}
export function selectable(
  item: ServiceItem,
  vehicle: Vehicle | null,
): boolean {
  return (
    item.isActive !== false &&
    item.availableOnline !== false &&
    (!item.evOnly || vehicle?.fuel === "electric")
  );
}
export function selectServiceId(
  id: string,
  items: ServiceItem[],
  vehicle: Vehicle | null,
): ServiceItem {
  const item = items.find((candidate) => candidate.id === id);
  if (!item || !selectable(item, vehicle))
    throw new Error(
      "Service is not available in this catalogue for this vehicle.",
    );
  return item;
}

export function sameVehicleIdentity(left: Vehicle, right: Vehicle): boolean {
  if (left.vehicleId && right.vehicleId && left.vehicleId === right.vehicleId)
    return true;
  if (left.id === right.id) return true;
  const sameDescription =
    left.make.trim().toLowerCase() === right.make.trim().toLowerCase() &&
    left.model.trim().toLowerCase() === right.model.trim().toLowerCase();
  if (!sameDescription) return false;
  const leftYear = left.customerDetails?.year ?? left.year;
  const rightYear = right.customerDetails?.year ?? right.year;
  return (
    leftYear === undefined || rightYear === undefined || leftYear === rightYear
  );
}

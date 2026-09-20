import type { BookingDraft, BookingStep, ServiceItem, Vehicle } from "./models";

export const initialDraft: BookingDraft = {
  customer: { firstName: "", lastName: "", email: "" },
  vehicle: null,
  mainServiceId: null,
  additionalServiceIds: [],
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
  return !item.evOnly || vehicle?.fuel === "electric";
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

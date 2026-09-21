export interface Customer {
  firstName: string;
  lastName: string;
  email: string;
}
export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  registration?: string;
  fuel: "petrol-diesel" | "electric" | "unknown";
  demonstration: boolean;
}
export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: "main" | "additional";
  evOnly?: boolean;
  demonstration: boolean;
}
export interface BookingDraft {
  customer: Customer;
  vehicle: Vehicle | null;
  mainServiceId: string | null;
  additionalServiceIds: string[];
  workshopNotes: string[];
}
export type BookingStep =
  "begin" | "vehicle" | "services" | "additional" | "review";
export interface AssistantMessage {
  role: "user" | "assistant";
  text: string;
}
export type AssistantState =
  | { kind: "idle" }
  | {
      kind: "clarification";
      messages: AssistantMessage[];
      intent?: "routine-service" | "symptom";
      answers?: string[];
    }
  | {
      kind: "recommendation";
      messages: AssistantMessage[];
      serviceId: string;
      explanation?: string;
      workshopNotes?: string;
    }
  | { kind: "cannot-match"; messages: AssistantMessage[] }
  | { kind: "safety-escalation"; messages: AssistantMessage[] };

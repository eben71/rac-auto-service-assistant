export interface Customer {
  firstName: string;
  lastName: string;
  email: string;
}
export interface Vehicle {
  id: string;
  year?: number;
  make: string;
  model: string;
  registration?: string;
  fuel: "petrol-diesel" | "electric" | "unknown";
  energyType?: "petrol" | "diesel" | "hybrid" | "electric" | "unknown";
  variant?: string;
  demonstration: boolean;
  vehicleId?: string;
  mid?: string;
  details?: string;
  technicalDetails?: {
    engine?: string;
    capacity?: string;
    powerKw?: string;
  };
  dataProvenance?: {
    identity: "supplied-sample" | "synthetic-demo" | "illustrative-profile";
    technical: "supplied-sample" | "verified-generic" | "unavailable";
  };
  source?:
    "asq" | "autoquotes-mock" | "illustrative-profile" | "synthetic-lookup";
  customerDetails?: VehicleCustomerDetails;
}
export interface VehicleCustomerDetails {
  year?: number;
  colour?: string;
  odometerKm?: number;
  nickname?: string;
}
export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: "main" | "additional";
  evOnly?: boolean;
  isActive?: boolean;
  availableOnline?: boolean;
  demonstration: boolean;
}
export interface BookingDraft {
  customer: Customer;
  vehicle: Vehicle | null;
  mainServiceId: string | null;
  additionalServiceIds: string[];
  workshopNotes: string[];
  serviceScheduleId?: string | null;
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

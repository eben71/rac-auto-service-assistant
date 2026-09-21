import type { ServiceItem, Vehicle } from "../../domain/models";
import type { ServiceSchedule } from "./mock";
export type VehicleLookupResult =
  | { status: "found"; vehicle: Vehicle }
  | { status: "not-found" }
  | { status: "unavailable"; message: string };
export interface AutoQuotesAdapter {
  lookupRegistration(registration: string): Promise<VehicleLookupResult>;
  selectMakeModel(make: string, model: string): Promise<VehicleLookupResult>;
  getCatalogue(vehicle: Vehicle): Promise<ServiceItem[]>;
  getSchedules(mid: string): Promise<ServiceSchedule[]>;
}

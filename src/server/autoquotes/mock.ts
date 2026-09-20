import type { AutoQuotesAdapter } from "./contracts";
import type { ServiceItem, Vehicle } from "../../domain/models";

export const demoVehicle: Vehicle = {
  id: "demo-pajero-2016",
  year: 2016,
  make: "Mitsubishi",
  model: "Pajero Sport",
  registration: "DEMO16",
  fuel: "petrol-diesel",
  demonstration: true,
};
export const demoVehicles: Vehicle[] = [
  demoVehicle,
  {
    id: "demo-corolla-2019",
    year: 2019,
    make: "Toyota",
    model: "Corolla",
    fuel: "petrol-diesel",
    demonstration: true,
  },
  {
    id: "demo-leaf-2020",
    year: 2020,
    make: "Nissan",
    model: "Leaf",
    fuel: "electric",
    demonstration: true,
  },
];
export const demoCatalogue: ServiceItem[] = [
  {
    id: "essentials",
    name: "Essentials Service",
    description: "A demonstration routine servicing option.",
    category: "main",
    demonstration: true,
  },
  {
    id: "essentials-plus",
    name: "Essentials Plus Service",
    description: "A demonstration extended routine servicing option.",
    category: "main",
    demonstration: true,
  },
  {
    id: "logbook",
    name: "Logbook",
    description: "A demonstration logbook servicing option.",
    category: "main",
    demonstration: true,
  },
  {
    id: "ev-essentials",
    name: "EV Essentials Service",
    description: "A demonstration electric vehicle servicing option.",
    category: "main",
    evOnly: true,
    demonstration: true,
  },
  {
    id: "adas",
    name: "ADAS calibration enquiry",
    description: "Enquiry only; availability to be confirmed.",
    category: "additional",
    demonstration: true,
  },
  {
    id: "air-con",
    name: "Air con service",
    description: "Demonstration catalogue item.",
    category: "additional",
    demonstration: true,
  },
  {
    id: "brake-fluid",
    name: "Brake fluid flush",
    description: "Demonstration catalogue item; not a diagnosis.",
    category: "additional",
    demonstration: true,
  },
  {
    id: "front-brakes",
    name: "Brakes - front pads & replace rotors",
    description: "Demonstration catalogue item; not a diagnosis.",
    category: "additional",
    demonstration: true,
  },
  {
    id: "rear-brakes",
    name: "Brakes - rear pads & replace rotors",
    description: "Demonstration catalogue item; not a diagnosis.",
    category: "additional",
    demonstration: true,
  },
  {
    id: "scan",
    name: "Diagnostic scan",
    description: "Demonstration catalogue item.",
    category: "additional",
    demonstration: true,
  },
  {
    id: "ev-health",
    name: "EV battery health check",
    description: "Demonstration electric vehicle item.",
    category: "additional",
    evOnly: true,
    demonstration: true,
  },
  {
    id: "alignment",
    name: "Workshop wheel alignment (selected centres only)",
    description: "Demonstration catalogue item; centre availability unknown.",
    category: "additional",
    demonstration: true,
  },
];
export const mockAutoQuotes: AutoQuotesAdapter = {
  async lookupRegistration(registration) {
    return registration.toUpperCase().replace(/\s/g, "") === "DEMO16"
      ? { status: "found", vehicle: demoVehicle }
      : { status: "not-found" };
  },
  async selectMakeModel(make, model) {
    const vehicle = demoVehicles.find(
      (item) =>
        item.make.toLowerCase() === make.toLowerCase() &&
        item.model.toLowerCase() === model.toLowerCase(),
    );
    return vehicle ? { status: "found", vehicle } : { status: "not-found" };
  },
  async getCatalogue() {
    return demoCatalogue;
  },
};

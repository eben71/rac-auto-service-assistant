import type { AutoQuotesAdapter } from "./contracts";
import type { ServiceItem, Vehicle } from "../../domain/models";
import {
  normalizeVehicle,
  type AutoQuotesVehicleDto,
} from "./vehicle-transport";

export interface AutoQuotesResponse<T> {
  Result: T;
  IsSuccess: boolean;
  ErrorCode: string | null;
  ErrorMessage: string | null;
}
export interface AutoQuotesServiceDto {
  ServiceTypeId: number;
  Name: string;
  InformationText: string;
  IsMasterServiceType: boolean;
  IsActive: boolean;
  AvailableOnline: boolean;
}
export interface AutoQuotesScheduleDto {
  Description: string;
  ServiceScheduleId: string;
  SortOrder: number;
  SelectedServiceInteralId: string | null;
}
export interface ServiceSchedule {
  id: string;
  description: string;
  sortOrder: number;
}

export const vehicleLookupDto: AutoQuotesResponse<AutoQuotesVehicleDto[]> = {
  Result: [
    {
      VehicleID: "53275",
      Make: "MITSUBISHI",
      Model: "PAJERO SPORT",
      Series: "QE, QF, QG",
      Engine: "2440cc, 4N15 I4 16v DOHC VVT I/C Turbo CRD {133kW}",
      StartYear: "2015",
      EndYear: "2027",
      YearRange: "01/15~27",
      Year: "2016",
      Details: " 4D SUV M, 4WD, AT",
      Chassis: "KS1W",
      CountryOfOrigin: "THAILAND",
      VIN: "MMAGUKS10GH004900",
      MID: "MIT39408",
      VehicleTypeText: "Diesel",
    },
  ],
  IsSuccess: true,
  ErrorCode: null,
  ErrorMessage: null,
};
export { normalizeVehicle } from "./vehicle-transport";
export type { AutoQuotesVehicleDto } from "./vehicle-transport";
export const demoVehicle = normalizeVehicle(
  vehicleLookupDto.Result[0],
  "1GDU034",
  "autoquotes-mock",
);
export const demoVehicles: Vehicle[] = [
  demoVehicle,
  {
    id: "demo-corolla-2019",
    year: 2019,
    make: "Toyota",
    model: "Corolla",
    fuel: "petrol-diesel",
    demonstration: true,
    source: "synthetic-lookup",
  },
  {
    id: "demo-leaf-2020",
    year: 2020,
    make: "Nissan",
    model: "Leaf",
    fuel: "electric",
    demonstration: true,
    source: "synthetic-lookup",
  },
];

// The supplied task omitted the sample InformationText values. These are
// provisional demonstration descriptions pending sanitized response samples.
const service = (
  ServiceTypeId: number,
  Name: string,
  InformationText: string,
  IsMasterServiceType: boolean,
): AutoQuotesServiceDto => ({
  ServiceTypeId,
  Name,
  InformationText,
  IsMasterServiceType,
  IsActive: true,
  AvailableOnline: true,
});
export const mainServiceDto: AutoQuotesResponse<AutoQuotesServiceDto[]> = {
  Result: [
    service(
      1,
      "Essentials Service",
      "A demonstration routine servicing option.",
      true,
    ),
    service(
      9,
      "Logbook",
      "Manufacturer-scheduled servicing. Confirm the actual schedule and inclusions with the workshop.",
      true,
    ),
    service(
      2,
      "Essentials Plus Service",
      "A demonstration extended routine servicing option.",
      true,
    ),
    service(
      4,
      "Vehicle Inspection",
      "A pre-purchase or end-of-warranty inspection option. Not a general fault-diagnosis service.",
      true,
    ),
    service(
      100,
      "EV Essentials Service",
      "A demonstration electric vehicle servicing option.",
      true,
    ),
  ],
  IsSuccess: true,
  ErrorCode: null,
  ErrorMessage: null,
};
export const additionalServiceDto: AutoQuotesResponse<AutoQuotesServiceDto[]> =
  {
    Result: [
      service(
        111,
        "Workshop wheel alignment (selected centres only)",
        "Centre availability must be confirmed.",
        false,
      ),
      service(69, "Air filter", "Demonstration catalogue item.", false),
      service(
        58,
        "Brake fluid flush",
        "Demonstration catalogue item; not a diagnosis.",
        false,
      ),
      service(
        49,
        "Brakes - front pads & replace rotors",
        "Demonstration catalogue item; not a diagnosis.",
        false,
      ),
      service(
        52,
        "Brakes - rear pads & replace rotors",
        "Demonstration catalogue item; not a diagnosis.",
        false,
      ),
      service(101, "Air con service", "Demonstration catalogue item.", false),
      service(
        109,
        "EV battery health check",
        "Demonstration electric vehicle item.",
        false,
      ),
      service(
        42,
        "Diagnostic scan",
        "Demonstration catalogue item; suitability must be confirmed.",
        false,
      ),
    ],
    IsSuccess: true,
    ErrorCode: null,
    ErrorMessage: null,
  };
export const serviceScheduleDto: AutoQuotesResponse<AutoQuotesScheduleDto[]> = {
  Result: [
    {
      Description: "MY -2016",
      ServiceScheduleId: "MITSG1600202",
      SortOrder: 1,
      SelectedServiceInteralId: null,
    },
    {
      Description: "MY 2017",
      ServiceScheduleId: "MITSG1600204",
      SortOrder: 3,
      SelectedServiceInteralId: null,
    },
    {
      Description: "MY 2018",
      ServiceScheduleId: "MITSG1600268",
      SortOrder: 5,
      SelectedServiceInteralId: null,
    },
    {
      Description: "MY 2019-",
      ServiceScheduleId: "MITSG1600270",
      SortOrder: 7,
      SelectedServiceInteralId: null,
    },
  ],
  IsSuccess: true,
  ErrorCode: null,
  ErrorMessage: null,
};
export function normalizeService(dto: AutoQuotesServiceDto): ServiceItem {
  return {
    id: String(dto.ServiceTypeId),
    name: dto.Name,
    description: dto.InformationText,
    category: dto.IsMasterServiceType ? "main" : "additional",
    isActive: dto.IsActive,
    availableOnline: dto.AvailableOnline,
    evOnly: dto.ServiceTypeId === 100 || dto.ServiceTypeId === 109,
    demonstration: true,
  };
}
export const demoCatalogue = [
  ...mainServiceDto.Result,
  ...additionalServiceDto.Result,
]
  .map(normalizeService)
  .filter((item) => item.isActive && item.availableOnline);
export function getMockSchedules(mid: string): ServiceSchedule[] {
  return mid.trim().toUpperCase() === "MIT39408"
    ? serviceScheduleDto.Result.map((dto) => ({
        id: dto.ServiceScheduleId,
        description: dto.Description,
        sortOrder: dto.SortOrder,
      }))
    : [];
}
export const mockAutoQuotes: AutoQuotesAdapter = {
  async lookupRegistration(registration) {
    return registration.toUpperCase().replace(/\s|-/g, "") === "1GDU034"
      ? { status: "found", vehicle: demoVehicle }
      : { status: "not-found" };
  },
  async selectMakeModel(make, model) {
    const vehicle = demoVehicles.find(
      (item) =>
        item.make.toLowerCase() === make.trim().toLowerCase() &&
        item.model.toLowerCase() === model.trim().toLowerCase(),
    );
    return vehicle ? { status: "found", vehicle } : { status: "not-found" };
  },
  async getCatalogue() {
    return demoCatalogue;
  },
  async getSchedules(mid) {
    return getMockSchedules(mid);
  },
};

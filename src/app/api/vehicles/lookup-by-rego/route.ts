import { NextResponse } from "next/server";
import { registrationSchema } from "@/domain/schemas";
import {
  AsqVehicleLookupError,
  getVehicleByRegistration,
} from "@/server/asq/vehicle";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(
    (body as { registrationNumber?: unknown })?.registrationNumber,
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REGISTRATION",
          message: "Enter a valid registration number.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const vehicle = await getVehicleByRegistration(parsed.data);
    if (!vehicle) {
      return NextResponse.json({ status: "not-found" });
    }
    return NextResponse.json({ status: "found", vehicle });
  } catch (error) {
    if (error instanceof AsqVehicleLookupError) {
      console.error("ASQ vehicle lookup failed", {
        code: error.code,
        status: error.status,
        correlationId: error.correlationId,
      });
      return NextResponse.json(
        {
          error: { code: error.code, message: error.message },
          correlationId: error.correlationId,
        },
        { status: error.status },
      );
    }
    console.error("Unexpected ASQ vehicle lookup failure", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      {
        error: {
          code: "ASQ_UNEXPECTED_ERROR",
          message: "Vehicle lookup is temporarily unavailable.",
        },
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AsqVehicleLookupError,
  getVehicleByRegistration,
} from "@/server/asq/vehicle";

const requestSchema = z.object({
  registrationNumber: z.string().trim().min(2).max(12),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
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
    const vehicle = await getVehicleByRegistration(
      parsed.data.registrationNumber,
    );
    if (!vehicle) {
      return NextResponse.json(
        {
          error: {
            code: "VEHICLE_NOT_FOUND",
            message: "No vehicle was found for that registration.",
          },
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ vehicle });
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

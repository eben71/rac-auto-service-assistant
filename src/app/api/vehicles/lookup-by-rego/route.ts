import { NextResponse } from "next/server";
import { registrationSchema, vehicleResponseSchema } from "@/domain/schemas";
import { getVehicleLookupAdapter } from "@/server/autoquotes";

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
    return NextResponse.json(
      vehicleResponseSchema.parse(
        await getVehicleLookupAdapter().lookupRegistration(parsed.data),
      ),
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", message: "Vehicle lookup is unavailable." },
      { status: 503 },
    );
  }
}

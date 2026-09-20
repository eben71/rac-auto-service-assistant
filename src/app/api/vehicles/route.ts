import { NextResponse } from "next/server";
import { registrationSchema, vehicleResponseSchema } from "@/domain/schemas";
import { getAutoQuotesAdapter } from "@/server/autoquotes";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = registrationSchema.safeParse(
      (body as { registration?: unknown })?.registration,
    );
    if (!parsed.success)
      return NextResponse.json(
        { status: "unavailable", message: "Enter a valid registration." },
        { status: 400 },
      );
    const result = vehicleResponseSchema.parse(
      await getAutoQuotesAdapter().lookupRegistration(parsed.data),
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        message: "Vehicle lookup is unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }
}

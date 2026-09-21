import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { vehicleSchema } from "@/domain/schemas";
import { updateGarage } from "@/server/profiles";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const operation = (body as { operation?: unknown })?.operation;
  const parsed = vehicleSchema.safeParse(
    (body as { vehicle?: unknown })?.vehicle,
  );
  if (!parsed.success || (operation !== "add" && operation !== "remove"))
    return NextResponse.json(
      { message: "Invalid vehicle request." },
      { status: 400 },
    );
  const token = (await cookies()).get("rac_demo_session")?.value;
  const profile = await updateGarage(token, operation, parsed.data);
  return profile
    ? NextResponse.json({ profile })
    : NextResponse.json(
        { message: "Sign in to manage vehicles." },
        { status: 401 },
      );
}

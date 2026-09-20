import { NextResponse } from "next/server";
import { catalogueResponseSchema, vehicleSchema } from "@/domain/schemas";
import { getAutoQuotesAdapter } from "@/server/autoquotes";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const vehicle = vehicleSchema.safeParse(
      (body as { vehicle?: unknown })?.vehicle,
    );
    if (!vehicle.success)
      return NextResponse.json(
        { message: "Invalid vehicle." },
        { status: 400 },
      );
    const items = await getAutoQuotesAdapter().getCatalogue(vehicle.data);
    return NextResponse.json(
      catalogueResponseSchema.parse({
        items,
        demonstration: items.every((item) => item.demonstration),
      }),
    );
  } catch {
    return NextResponse.json(
      { message: "Service catalogue is unavailable." },
      { status: 503 },
    );
  }
}

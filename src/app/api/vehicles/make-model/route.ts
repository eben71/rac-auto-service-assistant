import { NextResponse } from "next/server";
import { z } from "zod";
import { vehicleResponseSchema } from "@/domain/schemas";
import { getMockServiceAdapter } from "@/server/autoquotes";

const requestSchema = z.object({
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
});
export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { status: "unavailable", message: "Select a make and model." },
        { status: 400 },
      );
    return NextResponse.json(
      vehicleResponseSchema.parse(
        await getMockServiceAdapter().selectMakeModel(
          parsed.data.make,
          parsed.data.model,
        ),
      ),
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", message: "Vehicle selection is unavailable." },
      { status: 503 },
    );
  }
}

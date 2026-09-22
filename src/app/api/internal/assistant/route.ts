import { NextResponse } from "next/server";
import { z } from "zod";
import { foundryProvider } from "@/server/foundry";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(2_000),
      }),
    )
    .min(1)
    .max(20),
  vehicleId: z.string().trim().min(1).max(200).optional(),
  catalogue: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(200),
        name: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2_000),
        category: z.enum(["main", "additional"]),
        evOnly: z.boolean().optional(),
        isActive: z.boolean().optional(),
        availableOnline: z.boolean().optional(),
      }),
    )
    .max(100),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const decision = await foundryProvider.respond(input);
    return NextResponse.json(decision);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { message: "Invalid assistant request." },
        { status: 400 },
      );
    return NextResponse.json(
      { message: "The service assistant is unavailable." },
      { status: 503 },
    );
  }
}

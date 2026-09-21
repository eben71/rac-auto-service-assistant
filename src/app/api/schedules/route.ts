import { NextResponse } from "next/server";
import { z } from "zod";
import { getAutoQuotesAdapter } from "@/server/autoquotes";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const mid = z
    .string()
    .max(32)
    .safeParse((body as { mid?: unknown })?.mid);
  if (!mid.success)
    return NextResponse.json({ message: "Invalid MID." }, { status: 400 });
  try {
    return NextResponse.json({
      schedules: await getAutoQuotesAdapter().getSchedules(mid.data),
    });
  } catch {
    return NextResponse.json(
      { message: "Schedules unavailable." },
      { status: 503 },
    );
  }
}

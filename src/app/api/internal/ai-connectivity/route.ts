import { NextResponse } from "next/server";
import { foundryReadiness } from "@/server/foundry";

// Non-customer-facing status only. No model call or secret values are returned.
export async function GET() {
  const { missing } = foundryReadiness();
  return NextResponse.json(
    {
      status: "not-configured",
      missing,
      message:
        "Connectivity test is disabled until approved Foundry integration is implemented.",
    },
    { status: 503 },
  );
}

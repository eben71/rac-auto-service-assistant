import { NextResponse } from "next/server";
import { foundryProvider } from "@/server/foundry";

export async function GET() {
  const result = await foundryProvider.testConnectivity();
  return NextResponse.json(
    {
      status: result.ready ? "ready" : "unavailable",
      message: result.message,
    },
    { status: result.ready ? 200 : 503 },
  );
}

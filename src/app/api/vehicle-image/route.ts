import { NextResponse } from "next/server";
import { z } from "zod";
import { allBrandsImages } from "@/server/vehicle-images";

const input = z.object({
  id: z.string().max(100),
  make: z.string().max(100),
  model: z.string().max(100),
});
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = input.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ image: null }, { status: 400 });
  const image = await allBrandsImages.findImage(
    parsed.data as Parameters<typeof allBrandsImages.findImage>[0],
  );
  return NextResponse.json({ image });
}

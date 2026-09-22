import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { profileForToken, signIn, signOut } from "@/server/profiles";

const cookieName = "rac_demo_session";
export async function GET() {
  const token = (await cookies()).get(cookieName)?.value;
  return NextResponse.json({ profile: await profileForToken(token) });
}
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const email = (body as { email?: unknown })?.email;
  if (typeof email !== "string" || email.length > 254)
    return NextResponse.json(
      { message: "Unable to sign in with that email." },
      { status: 400 },
    );
  const token = await signIn(email);
  if (!token)
    return NextResponse.json(
      {
        message:
          "That email is not a configured demo profile. Restart the development server after changing .env.local.",
      },
      { status: 401 },
    );
  const response = NextResponse.json({ profile: await profileForToken(token) });
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
export async function DELETE() {
  const token = (await cookies()).get(cookieName)?.value;
  await signOut(token);
  const response = NextResponse.json({ profile: null });
  response.cookies.delete(cookieName);
  return response;
}

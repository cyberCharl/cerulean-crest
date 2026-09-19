import { NextResponse, type NextRequest } from "next/server";
import { auth0, browserAuthConfigured } from "./lib/browser-auth";
export async function proxy(request: NextRequest) {
  if (!browserAuthConfigured()) {
    if (request.nextUrl.pathname.startsWith("/auth/")) return new NextResponse("Sign-in is being configured. Please try again soon.", { status: 503 });
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const response = await auth0().middleware(request);
  if (/^\/(today|archive|issues|saved|settings|onboarding|api|mcp|auth)(\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|icon.svg).*)"] };

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  const role = request.cookies.get("role")?.value;

  // Not logged in → redirect to correct login
  if (!token) {
    if (pathname.startsWith("/patient")) {
      return NextResponse.redirect(new URL("/patientLogin", request.url));
    }

    if (pathname.startsWith("/practitioner")) {
      return NextResponse.redirect(new URL("/practitionerLogin", request.url));
    }
  }

  // Role protection
  if (pathname.startsWith("/patient") && role !== "patient") {
    return NextResponse.redirect(
      new URL("/practitioner/dashboard", request.url),
    );
  }

  if (pathname.startsWith("/practitioner") && role !== "practitioner") {
    return NextResponse.redirect(new URL("/patient/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/patient/:path*", "/practitioner/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRACTITIONER_ROUTES = [
  "/dashboard",
  "/waiting-room",
  "/appointmentsPractitioner",
  "/patients",
  "/prescriptions",
  "/messages",
  "/settings",
];

const AUTH_ROUTES = ["/patientLogin", "/patientSignup", "/practitionerLogin"];

function isPractitionerRoute(pathname: string) {
  return PRACTITIONER_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const role = request.cookies.get("role")?.value;

  // Redirect already-logged-in users away from auth pages
  if (AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    if (token && role) {
      const dest = role === "practitioner" ? "/dashboard" : "/patient/home";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Protect practitioner portal routes
  if (isPractitionerRoute(pathname)) {
    if (!token) {
      return NextResponse.redirect(
        new URL("/practitionerLogin", request.url),
      );
    }
    if (role !== "practitioner") {
      return NextResponse.redirect(new URL("/patient/home", request.url));
    }
    return NextResponse.next();
  }

  // Protect patient portal routes
  if (pathname.startsWith("/patient/")) {
    if (!token) {
      return NextResponse.redirect(new URL("/patientLogin", request.url));
    }
    if (role !== "patient") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/waiting-room/:path*",
    "/waiting-room",
    "/appointmentsPractitioner/:path*",
    "/appointmentsPractitioner",
    "/patients/:path*",
    "/patients",
    "/prescriptions/:path*",
    "/prescriptions",
    "/messages/:path*",
    "/messages",
    "/settings/:path*",
    "/settings",
    "/patient/:path*",
    "/patientLogin",
    "/patientSignup",
    "/practitionerLogin",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRACTITIONER_ROUTES = [
  "/dashboard",
  "/waiting-room",
  "/appointmentsPractitioner",
  "/patients",
  "/assessments",
  "/medications",
  "/messages",
  "/settings",
  "/support",
];

const AUTH_ROUTES = [
  "/patientLogin",
  "/patientSignup",
  "/practitionerLogin",
  "/adminLogin",
];

/** Platform console. Only SUPER_ADMIN may enter. */
const ADMIN_PREFIX = "/admin";

function isPractitionerRoute(pathname: string) {
  return PRACTITIONER_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const role = request.cookies.get("role")?.value;

  const homeFor = (r: string | undefined) =>
    r === "super_admin"
      ? "/admin/dashboard"
      : r === "patient"
        ? "/patient/home"
        : "/dashboard";

  // Redirect already-logged-in users away from auth pages
  if (AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    if (token && role) {
      return NextResponse.redirect(new URL(homeFor(role), request.url));
    }
    return NextResponse.next();
  }

  // Platform console. The role cookie is HttpOnly and set by the API, so a
  // signed-in practice user cannot grant themselves access by editing it.
  if (pathname === ADMIN_PREFIX || pathname.startsWith(ADMIN_PREFIX + "/")) {
    if (!token) {
      return NextResponse.redirect(new URL("/adminLogin", request.url));
    }
    if (role !== "super_admin") {
      // A practice user who lands here goes back to their own portal
      // rather than being told the console exists.
      return NextResponse.redirect(new URL(homeFor(role), request.url));
    }
    return NextResponse.next();
  }

  // A platform admin has no practice portal to be in.
  if (role === "super_admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
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
    "/admin/:path*",
    "/admin",
    "/adminLogin",
    "/dashboard/:path*",
    "/dashboard",
    "/waiting-room/:path*",
    "/waiting-room",
    "/appointmentsPractitioner/:path*",
    "/appointmentsPractitioner",
    "/patients/:path*",
    "/patients",
    "/assessments/:path*",
    "/assessments",
    "/medications/:path*",
    "/medications",
    "/messages/:path*",
    "/messages",
    "/settings/:path*",
    "/settings",
    "/support/:path*",
    "/support",
    "/patient/:path*",
    "/patientLogin",
    "/patientSignup",
    "/practitionerLogin",
  ],
};

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

/** Everyone who signs in through /practitionerLogin. The API decides what
 * each of them may do; the portal itself is open to all three. */
const PRACTICE_ROLES = ["practice_admin", "practitioner", "staff"];

/**
 * Sign-in pages and the roles each one is for. A visitor already signed in
 * with one of those roles goes to their home; anyone else sees the form, so
 * a super admin (or a patient) on the same browser can still sign in to a
 * different portal — the new session replaces the old cookie.
 */
const AUTH_ROUTES: Record<string, string[]> = {
  "/patientLogin": ["patient"],
  "/patientSignup": ["patient"],
  "/practitionerLogin": PRACTICE_ROLES,
  "/adminLogin": ["super_admin"],
};

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

  // Where a signed-in role belongs. Unknown roles have no home, so they are
  // sent to sign in rather than bounced between portals.
  const homeFor = (r: string | undefined) =>
    r === "super_admin"
      ? "/admin/dashboard"
      : r === "patient"
        ? "/patient/home"
        : r && PRACTICE_ROLES.includes(r)
          ? "/dashboard"
          : "/practitionerLogin";

  // A sign-in page skips its form only for someone already signed in to
  // that same portal.
  const authRoute = Object.keys(AUTH_ROUTES).find(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
  if (authRoute) {
    if (token && role && AUTH_ROUTES[authRoute].includes(role)) {
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
    if (!role || !PRACTICE_ROLES.includes(role)) {
      return NextResponse.redirect(new URL(homeFor(role), request.url));
    }
    return NextResponse.next();
  }

  // Protect patient portal routes
  if (pathname.startsWith("/patient/")) {
    if (!token) {
      return NextResponse.redirect(new URL("/patientLogin", request.url));
    }
    if (role !== "patient") {
      return NextResponse.redirect(new URL(homeFor(role), request.url));
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

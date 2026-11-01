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
 * with one of those roles goes to their home; anyone else sees the form.
 * The console has its own session (`admin_token`), so a super admin and a
 * practice user can be signed in side by side in one browser profile.
 */
const AUTH_ROUTES: Record<string, string[]> = {
  "/patientLogin": ["patient"],
  "/patientSignup": ["patient"],
  "/practitionerLogin": PRACTICE_ROLES,
};

const ADMIN_LOGIN = "/adminLogin";

/** Platform console. Only SUPER_ADMIN may enter. */
const ADMIN_PREFIX = "/admin";

/**
 * Each portal has its own address: admin.<domain> for the console,
 * practitioner.<domain> for everything else. A page opened on the wrong one
 * is sent to the same path on the right one. Other hosts (the Railway URL,
 * localhost) serve every page, as before.
 */
const ADMIN_PAGES = ["/admin", "/adminLogin", "/adminForgotPassword"];
/** Served on either address (the console's forced password change). */
const SHARED_PAGES = ["/change-password"];

const startsWithAny = (pathname: string, list: string[]) =>
  list.some((r) => pathname === r || pathname.startsWith(r + "/"));

function portalOfHost(host: string): "admin" | "practitioner" | null {
  if (host.startsWith("admin.")) return "admin";
  if (host.startsWith("practitioner.")) return "practitioner";
  return null;
}

/** Each portal address's sign-in lives at its root; this path redirects there. */
const PORTAL_LOGIN: Record<"admin" | "practitioner", string> = {
  admin: "/adminLogin",
  practitioner: "/practitionerLogin",
};

function swapPortalHost(request: NextRequest, host: string, to: "admin" | "practitioner") {
  // Built from the Host header: behind the proxy, request.nextUrl carries
  // the server's bind address ("[::]"), not the public domain.
  const target = host.replace(/:\d+$/, "").replace(/^(admin|practitioner)\./, `${to}.`);
  const { pathname, search } = request.nextUrl;
  const path = pathname === PORTAL_LOGIN[to] ? "/" : pathname;
  return NextResponse.redirect(`https://${target}${path}${search}`);
}

function isPractitionerRoute(pathname: string) {
  return PRACTITIONER_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const host = (request.headers.get("host") ?? request.nextUrl.hostname).toLowerCase();
  const portal = portalOfHost(host);

  // Wrong address for this page: same path on the right one.
  if (portal && !startsWithAny(pathname, SHARED_PAGES) && pathname !== "/") {
    const isAdminPage = startsWithAny(pathname, ADMIN_PAGES);
    if (portal === "admin" && !isAdminPage) return swapPortalHost(request, host, "practitioner");
    if (portal === "practitioner" && isAdminPage) return swapPortalHost(request, host, "admin");
    // The sign-in's own path: show it at the clean root address instead.
    if (pathname === PORTAL_LOGIN[portal]) {
      const { search } = request.nextUrl;
      return NextResponse.redirect(`https://${host.replace(/:\d+$/, "")}/${search}`);
    }
  }
  // Console session: its own HttpOnly cookie, set only by the platform
  // sign-in. The API verifies it on every call; here it only routes.
  const adminToken = request.cookies.get("admin_token")?.value;
  const legacyAdmin = request.cookies.get("role")?.value === "super_admin";
  // Practice/patient session. A super-admin session left in this cookie
  // from before the split is not a practice session.
  const token = legacyAdmin ? undefined : request.cookies.get("token")?.value;
  const role = legacyAdmin ? undefined : request.cookies.get("role")?.value;

  // Where a signed-in role belongs. Unknown roles have no home, so they are
  // sent to sign in rather than bounced between portals.
  const homeFor = (r: string | undefined) =>
    r === "patient"
      ? "/patient/home"
      : r && PRACTICE_ROLES.includes(r)
        ? "/dashboard"
        : "/practitionerLogin";

  if (pathname === ADMIN_LOGIN || pathname.startsWith(ADMIN_LOGIN + "/")) {
    return adminToken
      ? NextResponse.redirect(new URL("/admin/dashboard", request.url))
      : NextResponse.next();
  }

  // A sign-in page skips its form only for someone already signed in to
  // that same portal.
  // No public homepage yet. On a portal address the root *is* its sign-in
  // (served in place, so the address stays clean) — or the dashboard for
  // someone already signed in. Elsewhere it redirects to the practitioner
  // sign-in; temporary (307) so nothing is cached once a homepage exists.
  if (pathname === "/") {
    if (portal === "admin") {
      return adminToken
        ? NextResponse.redirect(new URL("/admin/dashboard", request.url))
        : NextResponse.rewrite(new URL(ADMIN_LOGIN, request.url));
    }
    if (portal === "practitioner") {
      if (token && role) return NextResponse.redirect(new URL(homeFor(role), request.url));
      return NextResponse.rewrite(new URL("/practitionerLogin", request.url));
    }
    return NextResponse.redirect(new URL("/practitionerLogin", request.url));
  }

  const authRoute = Object.keys(AUTH_ROUTES).find(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
  if (authRoute) {
    if (token && role && AUTH_ROUTES[authRoute].includes(role)) {
      return NextResponse.redirect(new URL(homeFor(role), request.url));
    }
    return NextResponse.next();
  }

  // Platform console. Needs the console's own session; a practice session
  // alone doesn't count (and the API would refuse it anyway).
  if (pathname === ADMIN_PREFIX || pathname.startsWith(ADMIN_PREFIX + "/")) {
    if (!adminToken) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
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
    "/",
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
    "/adminForgotPassword",
    "/acceptInvite",
    "/patientForgotPassword",
    "/practitioner/:path*",
  ],
};

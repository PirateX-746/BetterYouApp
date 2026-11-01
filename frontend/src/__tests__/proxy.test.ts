import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const ORIGIN = "https://app.example.com";
const ROLES = ["practice_admin", "practitioner", "staff", "patient"] as const;
const PAGES = [
  "/practitionerLogin",
  "/patientLogin",
  "/adminLogin",
  "/dashboard",
  "/patients/123",
  "/patient/home",
  "/admin/dashboard",
];

/**
 * Where the guard sends this visitor: the path it redirects to, or null to
 * show the page. `role` is the practice/patient session; "super_admin" means
 * the console's own session, and "both:<role>" means signed in to both.
 */
function cookieFor(role?: string): string | null {
  if (!role) return null;
  if (role === "super_admin") return "admin_token=a";
  if (role.startsWith("both:")) return `admin_token=a; token=t; role=${role.slice(5)}`;
  if (role === "legacy_admin") return "token=t; role=super_admin";
  return `token=t; role=${role}`;
}

function visit(path: string, role?: string): string | null {
  const headers = new Headers();
  const cookie = cookieFor(role);
  if (cookie) headers.set("cookie", cookie);
  const res = proxy(new NextRequest(new URL(path, ORIGIN), { headers }));
  const location = res.headers.get("location");
  return location ? new URL(location).pathname : null;
}

/** Follows redirects to the page finally shown; throws on a loop. */
function land(path: string, role?: string): string {
  const seen = new Set<string>();
  let current = path;
  for (;;) {
    if (seen.has(current)) throw new Error(`redirect loop: ${[...seen, current].join(" -> ")}`);
    seen.add(current);
    const next = visit(current, role);
    if (next === null) return current;
    current = next;
  }
}

describe("proxy route guard", () => {
  it.each(
    [...ROLES, "super_admin", "legacy_admin", ...ROLES.map((r) => `both:${r}`)].flatMap((role) =>
      PAGES.map((page) => [role, page]),
    ),
  )(
    "%s visiting %s never loops",
    (role, page) => {
      expect(() => land(page, role)).not.toThrow();
    },
  );

  it("shows a signed-in super admin the practitioner and patient sign-in forms", () => {
    expect(visit("/practitionerLogin", "super_admin")).toBeNull();
    expect(visit("/patientLogin", "super_admin")).toBeNull();
  });

  it("skips the form for someone already signed in to that portal", () => {
    expect(visit("/adminLogin", "super_admin")).toBe("/admin/dashboard");
    expect(visit("/practitionerLogin", "practitioner")).toBe("/dashboard");
    expect(visit("/practitionerLogin", "practice_admin")).toBe("/dashboard");
    expect(visit("/patientLogin", "patient")).toBe("/patient/home");
  });

  it.each(["practice_admin", "practitioner", "staff"])("lets %s into the practitioner portal", (role) => {
    expect(land("/dashboard", role)).toBe("/dashboard");
  });

  it("keeps both portals signed in side by side", () => {
    expect(land("/admin/dashboard", "both:practitioner")).toBe("/admin/dashboard");
    expect(land("/dashboard", "both:practitioner")).toBe("/dashboard");
    expect(land("/dashboard", "both:practice_admin")).toBe("/dashboard");
    expect(visit("/adminLogin", "both:practitioner")).toBe("/admin/dashboard");
    expect(visit("/practitionerLogin", "both:practitioner")).toBe("/dashboard");
  });

  it("treats a pre-split super-admin session as signed out of both", () => {
    expect(land("/dashboard", "legacy_admin")).toBe("/practitionerLogin");
    expect(land("/admin/dashboard", "legacy_admin")).toBe("/adminLogin");
  });

  it("keeps each portal to its own roles", () => {
    expect(land("/admin/dashboard", "practitioner")).toBe("/adminLogin");
    expect(land("/dashboard", "super_admin")).toBe("/practitionerLogin");
    expect(land("/dashboard", "patient")).toBe("/patient/home");
    expect(land("/patient/home", "practice_admin")).toBe("/dashboard");
  });

  it("opens the site on the practitioner sign-in (no homepage yet)", () => {
    expect(visit("/")).toBe("/practitionerLogin");
    expect(land("/", "practitioner")).toBe("/dashboard");
  });

  it("sends signed-out visitors to the matching sign-in page", () => {
    expect(visit("/dashboard")).toBe("/practitionerLogin");
    expect(visit("/patient/home")).toBe("/patientLogin");
    expect(visit("/admin/dashboard")).toBe("/adminLogin");
    expect(visit("/practitionerLogin")).toBeNull();
  });
});

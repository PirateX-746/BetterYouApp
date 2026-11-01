import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/**
 * Web app manifest — makes the portal installable on phones and tablets
 * (Add to Home Screen) and launches it full-screen like a native app.
 *
 * start_url is the site root, which serves the sign-in for that address and
 * sends a signed-in user straight on to their own home.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    // The root is the sign-in on each portal address (the proxy sends a
    // signed-in user on to their dashboard).
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    // "any" so tablets can be used in landscape and portrait.
    orientation: "any",
    background_color: "#f3f5f9",
    theme_color: "#ffffff",
    categories: ["medical", "health", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard" },
      { name: "Appointments", url: "/appointmentsPractitioner" },
      { name: "Patients", url: "/patients" },
      { name: "Messages", url: "/messages" },
    ].map((s) => ({ ...s, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] })),
  };
}

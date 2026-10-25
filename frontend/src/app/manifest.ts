import type { MetadataRoute } from "next";

/**
 * Web app manifest — makes the portal installable on phones and tablets
 * (Add to Home Screen) and launches it full-screen like a native app.
 *
 * start_url is the practitioner login: the proxy sends a signed-in user
 * straight on to their own home (dashboard or platform console), so the app
 * never opens on the marketing page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BetterYou – Psychology & Wellness Portal",
    short_name: "BetterYou",
    description: "Appointment booking and patient management for psychology practitioners.",
    start_url: "/practitionerLogin",
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

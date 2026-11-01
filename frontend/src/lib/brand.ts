/**
 * Brand copy and colours shared by page metadata, the manifest and the
 * generated images (favicon, app icons, share card). Image generation can't
 * read CSS variables, so the gradient is --gradient-brand (globals.css)
 * resolved for --primary #2563eb.
 */
export const BRAND = {
  name: "BetterYou Clinic",
  shortName: "BetterYou",
  title: "BetterYou Clinic — Practice management for psychologists",
  description:
    "Secure appointments, patient records, assessments and reminders for psychology and wellness practices.",
  tagline: "Practice management for psychology & wellness",
  /** Public address used for absolute share-image URLs. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://practitioner.betteryouclinic.co",
  primary: "#2563eb",
  gradient: "linear-gradient(135deg, #3f76ed 0%, #2563eb 45%, #1d4fc0 100%)",
} as const;

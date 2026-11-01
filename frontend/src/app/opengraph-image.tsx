import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { StethoscopeGlyph } from "@/components/brand/StethoscopeGlyph";

/** Share card for links posted in WhatsApp, LinkedIn, iMessage, Slack… */
export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #f8fafc 0%, #eef3fd 55%, #dfe8fb 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: BRAND.gradient,
              boxShadow: "0 18px 40px rgba(37, 99, 235, 0.28)",
            }}
          >
            <StethoscopeGlyph size={64} />
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -1.5 }}>
            <span style={{ color: BRAND.primary }}>Better</span>
            <span style={{ color: "#0f172a" }}>You</span>
            <span style={{ color: "#475569", fontWeight: 500, marginLeft: 18 }}>Clinic</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 58, fontWeight: 700, color: "#0f172a", lineHeight: 1.1, letterSpacing: -1.2, maxWidth: 980 }}>
            Practice management for psychology &amp; wellness
          </div>
          <div style={{ fontSize: 30, color: "#475569", maxWidth: 960, lineHeight: 1.35 }}>
            Appointments, patient records, assessments and reminders — secure and in one place.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: "#64748b" }}>
          <span>betteryouclinic.co</span>
          <span style={{ display: "flex", gap: 12, color: BRAND.primary, fontWeight: 600 }}>Secure practitioner portal</span>
        </div>
      </div>
    ),
    size,
  );
}

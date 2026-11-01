import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { StethoscopeGlyph } from "@/components/brand/StethoscopeGlyph";

/** Browser-tab favicon: the brand tile (white stethoscope on the brand gradient). */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: BRAND.gradient,
          borderRadius: 14,
        }}
      >
        <StethoscopeGlyph size={40} />
      </div>
    ),
    size,
  );
}

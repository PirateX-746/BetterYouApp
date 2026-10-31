import { ImageResponse } from "next/og";

/**
 * App icons for the manifest and iOS home screen, drawn from the sidebar's
 * brand mark (white stethoscope on the brand gradient) and rendered to PNG
 * at build time, so there are no binary assets to keep in sync.
 *
 * Image generation can't read CSS variables, so the gradient stops below are
 * the default --gradient-brand (globals.css) resolved for --primary #2563eb.
 */
const BRAND_GRADIENT = "linear-gradient(135deg, #3f76ed 0%, #2563eb 45%, #1d4fc0 100%)";

type IconSpec = {
  size: number;
  /** Corner radius as a fraction of size; 0 = full bleed (the OS applies its own mask). */
  radius: number;
  /** Glyph width as a fraction of size. Maskable icons keep it inside the 80% safe zone. */
  glyph: number;
};

const ICONS: Record<string, IconSpec> = {
  "icon-192.png": { size: 192, radius: 0.22, glyph: 0.56 },
  "icon-512.png": { size: 512, radius: 0.22, glyph: 0.56 },
  "maskable-512.png": { size: 512, radius: 0, glyph: 0.44 },
  "apple-touch-icon.png": { size: 180, radius: 0, glyph: 0.54 },
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const spec = ICONS[name];
  if (!spec) return new Response("Not found", { status: 404 });

  const { size, radius, glyph } = spec;
  const glyphSize = Math.round(size * glyph);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: BRAND_GRADIENT,
          borderRadius: Math.round(size * radius),
        }}
      >
        {/* lucide-react "Stethoscope", the same glyph as the sidebar brand mark */}
        <svg
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 2v2" />
          <path d="M5 2v2" />
          <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
          <path d="M8 15a6 6 0 0 0 12 0v-3" />
          <circle cx="20" cy="10" r="2" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}

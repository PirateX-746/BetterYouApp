import type { NextConfig } from "next";

/**
 * Sent with every page. No script-src CSP yet: the theme bootstrap in the
 * root layout is an inline script, so a strict CSP needs nonces first.
 * These still block clickjacking, MIME sniffing and referrer leaks, and
 * limit device access to what the document scanner needs (camera, self).
 */
const securityHeaders = [
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
    ...(process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
        : []),
];

const nextConfig: NextConfig = {
    // Self-contained server in .next/standalone for the Docker image.
    output: "standalone",
    allowedDevOrigins: [
        "localhost",
        "192.168.1.41",
        "0.0.0.0",
    ],
    experimental: {
        // The /api rewrite buffers request bodies, capped at 10 MB by default.
        // Document uploads are allowed up to 20 MB (backend UPLOAD_LIMITS), so
        // leave headroom for multipart overhead; the backend enforces the cap.
        proxyClientMaxBodySize: "25mb",
    },
    async headers() {
        return [
            { source: "/:path*", headers: securityHeaders },
            {
                // The browser must always re-check the service worker so a
                // deploy's new version (cache bump) reaches installed apps.
                source: "/sw.js",
                headers: [
                    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                    { key: "Content-Type", value: "application/javascript; charset=utf-8" },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${process.env.BACKEND_URL || "http://localhost:3001"}/:path*`,
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
        ],
    },
};

export default nextConfig;

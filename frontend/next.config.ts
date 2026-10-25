import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

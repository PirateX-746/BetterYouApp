import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: [
        "localhost",
        "192.168.1.61",
        "0.0.0.0",
    ],
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: "http://localhost:3001/:path*",
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

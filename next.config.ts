import type { NextConfig } from "next";

const GENERATED_ASSET_CACHE = "public, max-age=31536000, immutable";
const MEDIA_ASSET_CACHE =
  "public, max-age=604800, s-maxage=31536000, stale-while-revalidate=2592000";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // One indexable host: `www` resolves to the apex with a permanent (308) redirect, so
    // search engines consolidate signals on https://yansons.online instead of reporting
    // both hosts. The trailing-slash form of every path already 308s to the canonical URL.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.yansons.online" }],
        destination: "https://yansons.online/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/ascii/:path*",
        headers: [{ key: "Cache-Control", value: GENERATED_ASSET_CACHE }],
      },
      {
        source: "/animations/:path*",
        headers: [{ key: "Cache-Control", value: GENERATED_ASSET_CACHE }],
      },
      {
        source:
          "/projects/:path*.:extension(png|jpg|jpeg|webp|avif|gif|svg|mp4|webm|mov)",
        headers: [{ key: "Cache-Control", value: MEDIA_ASSET_CACHE }],
      },
      {
        source:
          "/archive/:path*.:extension(png|jpg|jpeg|webp|avif|gif|svg|mp4|webm|mov)",
        headers: [{ key: "Cache-Control", value: MEDIA_ASSET_CACHE }],
      },
      {
        source: "/favicons/:path*",
        headers: [{ key: "Cache-Control", value: MEDIA_ASSET_CACHE }],
      },
      {
        source: "/og.png",
        headers: [{ key: "Cache-Control", value: MEDIA_ASSET_CACHE }],
      },
    ];
  },
};

export default nextConfig;

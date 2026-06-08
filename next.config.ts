import type { NextConfig } from "next";

const GENERATED_ASSET_CACHE = "public, max-age=31536000, immutable";
const MEDIA_ASSET_CACHE =
  "public, max-age=604800, s-maxage=31536000, stale-while-revalidate=2592000";

const nextConfig: NextConfig = {
  async headers() {
    return [
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

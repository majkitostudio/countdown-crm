import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/readiness",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/dashboard",
        has: [{ type: "query", key: "tab", value: "revenue" }],
        destination: "/reports?tab=revenue",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/reports",
        permanent: true,
      },
      {
        source: "/analytics",
        destination: "/reports?tab=revenue",
        permanent: true,
      },
      {
        source: "/workspace",
        destination: "/console",
        permanent: true,
      },
      {
        source: "/calendar",
        destination: "/schedule",
        permanent: true,
      },
      {
        source: "/calls",
        destination: "/call-logs",
        permanent: true,
      },
      {
        source: "/calls/:path*",
        destination: "/call-logs/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

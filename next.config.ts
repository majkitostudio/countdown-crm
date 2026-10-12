import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/readiness",
        destination: "/admin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

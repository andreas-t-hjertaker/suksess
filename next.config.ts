import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Typescript og ESLint sjekkes i CI
  typescript: {
    ignoreBuildErrors: false,
  },
  // Optimalisering
  compress: true,
  poweredByHeader: false,
  // Suksess branding og konfigurasjon
  env: {
    NEXT_PUBLIC_APP_NAME: "Suksess",
    NEXT_PUBLIC_APP_VERSION: "0.1.0",
    NEXT_PUBLIC_REGION: "europe-west1",
  },
};

export default nextConfig;

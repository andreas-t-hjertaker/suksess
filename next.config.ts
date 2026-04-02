import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: ".",
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

export default withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
})(nextConfig);

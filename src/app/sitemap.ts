import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://suksess.no";

  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/personvern`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/vilkar`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/databehandleravtale`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal/dpia`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ConsentBanner } from "@/components/consent-banner";
import { WebsiteJsonLd } from "@/components/json-ld";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ketlcloud.web.app"),
  title: {
    default: "ketl cloud",
    template: "%s | ketl cloud",
  },
  description:
    "SaaS-boilerplate med Next.js, Firebase og TypeScript. Alt du trenger for å bygge moderne webapplikasjoner.",
  manifest: "/manifest.json",
  openGraph: {
    title: "ketl cloud",
    description:
      "SaaS-boilerplate med Next.js, Firebase og TypeScript. Alt du trenger for å bygge moderne webapplikasjoner.",
    type: "website",
    siteName: "ketl cloud",
    locale: "nb_NO",
  },
  twitter: {
    card: "summary_large_image",
    title: "ketl cloud",
    description:
      "SaaS-boilerplate med Next.js, Firebase og TypeScript.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <WebsiteJsonLd
          name="ketl cloud"
          url="https://ketlcloud.web.app"
          description="SaaS-boilerplate med Next.js, Firebase og TypeScript."
        />
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <AnalyticsProvider />
              {children}
              <Toaster />
              <ConsentBanner />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

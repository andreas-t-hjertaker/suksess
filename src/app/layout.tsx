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
import { PersonalityProvider } from "@/components/personality-provider";
import { SkipLink } from "@/components/skip-link";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://suksess.no"),
  title: {
    default: "Suksess – Karriere og utdanning",
    template: "%s | Suksess",
  },
  description:
    "AI-drevet karriere- og utdanningsveiledning for norske VGS-elever. Finn studieretningen som passer deg basert på personlighet, interesser og karakterer.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Suksess – Din personlige karriereveileder",
    description:
      "AI-drevet karriere- og utdanningsveiledning for norske VGS-elever.",
    type: "website",
    siteName: "Suksess",
    locale: "nb_NO",
  },
  twitter: {
    card: "summary_large_image",
    title: "Suksess – Karriere og utdanning",
    description:
      "AI-drevet karriere- og utdanningsveiledning for norske VGS-elever.",
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
        <SkipLink />
        <WebsiteJsonLd
          name="Suksess"
          url="https://suksess.no"
          description="AI-drevet karriere- og utdanningsveiledning for norske VGS-elever."
        />
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <AuthProvider>
            <PersonalityProvider>
              <TooltipProvider>
                <AnalyticsProvider />
                {children}
                <Toaster />
                <ConsentBanner />
              </TooltipProvider>
            </PersonalityProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

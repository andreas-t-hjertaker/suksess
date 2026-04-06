import type { Metadata } from "next";
import localFont from "next/font/local";
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
import { AppCheckProvider } from "@/components/app-check-provider";
import { ErrorReporter } from "@/components/error-reporter";
import { ReducedMotionProvider } from "@/components/reduced-motion-provider";
import { RouteGuard } from "@/components/route-guard";
import { HtmlLangSync } from "@/components/html-lang-sync";

const plusJakartaSans = localFont({
  src: [
    { path: "./fonts/PlusJakartaSansVariable.woff2", style: "normal" },
    { path: "./fonts/PlusJakartaSansVariable-LatinExt.woff2", style: "normal" },
  ],
  variable: "--font-display",
  weight: "200 800",
  display: "swap",
  preload: true,
});

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
  preload: true,
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMonoVariable.woff2",
  variable: "--font-mono",
  weight: "100 800",
  display: "swap",
  preload: true,
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
    <html lang="nb" suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://www.google.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.weaviate.network wss://*.firebaseio.com https://europe-west1-suksess-842ed.cloudfunctions.net https://firebaseinstallations.googleapis.com; frame-src 'self' https://*.firebaseapp.com https://js.stripe.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'"
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <SkipLink />
        <WebsiteJsonLd
          name="Suksess"
          url="https://suksess.no"
          description="AI-drevet karriere- og utdanningsveiledning for norske VGS-elever."
        />
        <HtmlLangSync />
        <ServiceWorkerRegistration />
        <AppCheckProvider />
        <ErrorReporter />
        <ReducedMotionProvider>
          <ThemeProvider>
            <AuthProvider>
              <RouteGuard>
              <PersonalityProvider>
                <TooltipProvider>
                  <AnalyticsProvider />
                  {children}
                  <Toaster />
                  <ConsentBanner />
                </TooltipProvider>
              </PersonalityProvider>
              </RouteGuard>
            </AuthProvider>
          </ThemeProvider>
        </ReducedMotionProvider>
      </body>
    </html>
  );
}

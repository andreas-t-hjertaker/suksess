"use client";

import React from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar, MobileSidebar, MobileBottomNav } from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import dynamic from "next/dynamic";
import { NotificationBell } from "@/components/notification-bell";
import { useImplicitProfiling } from "@/hooks/use-implicit-profiling";
import { PageTransition } from "@/components/motion";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ScrollToTop } from "@/components/scroll-to-top";
import { leggTilBrodsmuler } from "@/lib/brodsmule-samler";

// Lazy-loaded komponenter — reduserer initial bundle
const AiAssistant = dynamic(
  () => import("@/modules/ai-assistant").then((m) => ({ default: m.AiAssistant })),
  { ssr: false }
);
const OnboardingStepper = dynamic(
  () => import("@/components/onboarding-stepper").then((m) => ({ default: m.OnboardingStepper })),
  { ssr: false }
);
const CommandPalette = dynamic(
  () => import("@/components/command-palette").then((m) => ({ default: m.CommandPalette })),
  { ssr: false }
);
const LevelUpOverlay = dynamic(
  () => import("@/components/level-up-overlay").then((m) => ({ default: m.LevelUpOverlay })),
  { ssr: false }
);
const BadgeToastListener = dynamic(
  () => import("@/components/badge-toast").then((m) => ({ default: m.BadgeToastListener })),
  { ssr: false }
);
const FeedbackFAB = dynamic(
  () => import("@/components/feedback-fab").then((m) => ({ default: m.FeedbackFAB })),
  { ssr: false }
);

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  useImplicitProfiling(); // Sporer atferd og justerer UI gradvis

  // Spor navigasjonsendringer som brødsmler for feedback-kontekst
  React.useEffect(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (path) {
      leggTilBrodsmuler("navigasjon", { sti: path });
    }
  }, [children]); // children endres ved rutebytte

  // Lag initialer fra visningsnavn eller e-post
  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topplinje */}
        <header
          role="banner"
          className="flex h-14 items-center justify-between border-b border-border px-4"
        >
          <MobileSidebar />
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-3">
            <CommandPalette />
            <span
              className="hidden text-sm text-muted-foreground sm:inline"
              aria-hidden="true"
            >
              {user?.displayName || user?.email}
            </span>
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label={`Brukermeny for ${user?.displayName || user?.email || "bruker"}`}
                  />
                }
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.photoURL || undefined}
                    alt={user?.displayName || "Bruker"}
                  />
                  <AvatarFallback className="text-xs" aria-hidden="true">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Logg ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Hovedinnhold */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 md:pb-6" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileBottomNav />
      <AiAssistant
        title="Suksess-assistent"
        welcomeMessage="Hei! Jeg er din AI-assistent for Suksess. Spør meg om karakterer, karrierevalg, utdanning og mer!"
        contextProvider={() => ({
          user: user
            ? { displayName: user.displayName, email: user.email, uid: user.uid }
            : undefined,
          appName: "Suksess",
          currentPath: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
          customContext:
            "Suksess er en plattform for norske videregående elever med karriereveiledning, karakterkalkulator, CV-builder og AI-veileder.",
        })}
      />
      <OnboardingStepper />
      <ScrollToTop />
      <LevelUpOverlay />
      <BadgeToastListener />
      <FeedbackFAB />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardContent>{children}</DashboardContent>
    </ProtectedRoute>
  );
}

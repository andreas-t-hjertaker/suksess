"use client";

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
import { LogOut, HelpCircle } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { AiAssistant } from "@/modules/ai-assistant";
import { NotificationBell } from "@/components/notification-bell";
import { useImplicitProfiling } from "@/hooks/use-implicit-profiling";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { LevelUpOverlay } from "@/components/level-up-overlay";
import { PageTransition } from "@/components/motion";
import { CommandPalette } from "@/components/command-palette";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ToastContainer } from "@/components/feedback";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  useImplicitProfiling(); // Sporer atferd og justerer UI gradvis

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
      {/* WCAG 2.4.1 / 2.4.12: Skip-lenke — første fokuserbare element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Hopp til innhold
      </a>

      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topplinje */}
        <header
          role="banner"
          className="flex h-14 items-center justify-between border-b border-border px-4 gap-4"
        >
          <MobileSidebar />
          {/* Breadcrumbs (skjult på mobil) */}
          <Breadcrumbs className="hidden md:flex flex-1 min-w-0" />
          {/* Kommandopalett-trigger */}
          <CommandPalette />
          <div className="flex items-center gap-3">
            <span
              className="hidden text-sm text-muted-foreground sm:inline"
              aria-hidden="true"
            >
              {user?.displayName || user?.email}
            </span>
            <NotificationBell />
            {/* WCAG 3.2.6 Consistent Help — hjelpelenke konsistent i header */}
            <Link
              href="/dashboard/veileder"
              aria-label="Hjelp — åpne AI-veileder"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </Link>
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
        <main id="main-content" className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileBottomNav />
      <LevelUpOverlay />
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
      <ToastContainer />
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

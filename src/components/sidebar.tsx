"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Rocket,
  CreditCard,
  Code,
  Shield,
  GraduationCap,
  DatabaseZap,
  User,
  Compass,
  Sparkles,
  ScrollText,
  BarChart2,
  ClipboardList,
  TrendingUp,
  Briefcase,
  BookOpen,
  GitBranch,
  Target,
  Building2,
} from "lucide-react";
import { useAdmin } from "@/hooks/use-admin";
import { useTenant } from "@/hooks/use-tenant";
import { useLocale } from "@/hooks/use-locale";
import type { Messages } from "@/lib/i18n/locales";

type NavItemDef = {
  href: string;
  labelKey: keyof Messages["nav"];
  icon: typeof LayoutDashboard;
};

const navItemDefs: NavItemDef[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profil", labelKey: "profile", icon: User },
  { href: "/dashboard/veileder", labelKey: "advisor", icon: Sparkles },
  { href: "/dashboard/karriere", labelKey: "career", icon: Compass },
  { href: "/dashboard/karrieregraf", labelKey: "careerGraph", icon: GitBranch },
  { href: "/dashboard/cv", labelKey: "cv", icon: ScrollText },
  { href: "/dashboard/analyse", labelKey: "analyse", icon: BarChart2 },
  { href: "/dashboard/soknadscoach", labelKey: "applicationCoach", icon: ClipboardList },
  { href: "/dashboard/jobbmatch", labelKey: "jobMatch", icon: Briefcase },
  { href: "/dashboard/handlingsplan", labelKey: "actionPlan", icon: Target },
  { href: "/dashboard/studier", labelKey: "studies", icon: BookOpen },
  { href: "/dashboard/karakterer", labelKey: "grades", icon: GraduationCap },
  { href: "/dashboard/dokumenter", labelKey: "documents", icon: FileText },
  { href: "/dashboard/fremgang", labelKey: "progress", icon: TrendingUp },
  { href: "/dashboard/abonnement", labelKey: "subscription", icon: CreditCard },
  { href: "/dashboard/utvikler", labelKey: "developer", icon: Code },
  { href: "/dashboard/innstillinger", labelKey: "settings", icon: Settings },
  { href: "/dashboard/mine-data", labelKey: "myData", icon: DatabaseZap },
];

function useNavItems() {
  const { t } = useLocale();
  return navItemDefs.map((item) => ({
    href: item.href,
    label: t.nav[item.labelKey],
    icon: item.icon,
  }));
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  const { isAdmin } = useAdmin();
  const { role, tenantId } = useTenant();
  const navItems = useNavItems();

  const isTenantAdmin = tenantId && ["admin", "superadmin"].includes(role);

  const allItems = [
    ...navItems,
    ...(isTenantAdmin ? [{ href: "/school-admin", label: "Skoledashboard", icon: Building2 }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <nav aria-label="Hovednavigasjon" className="space-y-1">
      {allItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
              isActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:translate-x-0.5"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Sidebar for desktop med kollaps-mulighet */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden h-screen flex-col border-r border-border bg-sidebar transition-all duration-200 md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        {!collapsed && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <Rocket className="h-5 w-5" />
            <span>Suksess</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && "mx-auto")}
          aria-label={collapsed ? "Utvid sidemeny" : "Minimer sidemeny"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {collapsed ? <CollapsedNav /> : <NavLinks />}
      </div>
    </aside>
  );
}

/** Kollapset navigasjon — bare ikoner */
function CollapsedNav() {
  const pathname = usePathname();
  const { isAdmin } = useAdmin();
  const navItems = useNavItems();

  const allItems = isAdmin
    ? [...navItems, { href: "/admin", label: "Admin", icon: Shield }]
    : navItems;

  return (
    <nav className="space-y-1">
      {allItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center rounded-lg p-2 transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
            title={item.label}
          >
            <item.icon className="h-4 w-4" />
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom-navigasjon for mobil (viser 5 primære lenker) */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAdmin();
  const { t } = useLocale();

  const primaryItems = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/dashboard/veileder", label: t.nav.advisor, icon: Sparkles },
    { href: "/dashboard/karriere", label: t.nav.career, icon: Compass },
    { href: "/dashboard/profil", label: t.nav.profile, icon: User },
    isAdmin
      ? { href: "/admin", label: "Admin", icon: Shield }
      : { href: "/dashboard/innstillinger", label: t.nav.settings, icon: Settings },
  ];

  function handleTap() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }

  return (
    <nav
      aria-label="Mobilnavigasjon"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm pb-safe md:hidden"
      style={{ minHeight: "4rem" }}
    >
      {primaryItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleTap}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-center transition-all touch-feedback active:scale-95",
              "min-h-[44px] min-w-[44px]",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <item.icon
                className={cn("h-5 w-5 transition-colors", isActive && "text-primary")}
                aria-hidden="true"
              />
              {isActive && (
                <span className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" aria-hidden="true" />
              )}
            </div>
            <span className={cn("text-[10px] font-medium transition-colors", isActive && "text-primary")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobil-sidebar som Sheet/drawer */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <SheetTitle className="sr-only">Navigasjon</SheetTitle>
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold tracking-tight"
            onClick={() => setOpen(false)}
          >
            <Rocket className="h-5 w-5" />
            <span>Suksess</span>
          </Link>
        </div>
        <div className="p-3">
          <NavLinks onClick={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

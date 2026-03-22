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
  Cloud,
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
} from "lucide-react";
import { useAdmin } from "@/hooks/use-admin";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profil", label: "Min profil", icon: User },
  { href: "/dashboard/veileder", label: "AI-veileder", icon: Sparkles },
  { href: "/dashboard/karriere", label: "Karriere", icon: Compass },
  { href: "/dashboard/cv", label: "CV-builder", icon: ScrollText },
  { href: "/dashboard/analyse", label: "Analyse", icon: BarChart2 },
  { href: "/dashboard/soknadscoach", label: "Søknads-coach", icon: ClipboardList },
  { href: "/dashboard/karakterer", label: "Karakterer", icon: GraduationCap },
  { href: "/dashboard/dokumenter", label: "Dokumenter", icon: FileText },
  { href: "/dashboard/fremgang", label: "Fremgang & XP", icon: TrendingUp },
  { href: "/dashboard/abonnement", label: "Abonnement", icon: CreditCard },
  { href: "/dashboard/utvikler", label: "Utvikler", icon: Code },
  { href: "/dashboard/innstillinger", label: "Innstillinger", icon: Settings },
  { href: "/dashboard/mine-data", label: "Mine data", icon: DatabaseZap },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  const { isAdmin } = useAdmin();

  const allItems = isAdmin
    ? [...navItems, { href: "/admin", label: "Admin", icon: Shield }]
    : navItems;

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
            <Cloud className="h-5 w-5" />
            <span>ketl cloud</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && "mx-auto")}
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

  const primaryItems = [
    { href: "/dashboard", label: "Hjem", icon: LayoutDashboard },
    { href: "/dashboard/veileder", label: "Veileder", icon: Sparkles },
    { href: "/dashboard/karriere", label: "Karriere", icon: Compass },
    { href: "/dashboard/profil", label: "Profil", icon: User },
    { href: "/dashboard/innstillinger", label: "Mer", icon: Settings },
  ];

  if (isAdmin) {
    primaryItems[4] = { href: "/admin", label: "Admin", icon: Shield };
  }

  return (
    <nav
      aria-label="Mobilnavigasjon"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm md:hidden"
    >
      {primaryItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-center transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon
              className={cn("h-5 w-5", isActive && "text-primary")}
              aria-hidden="true"
            />
            <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>
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
            <Cloud className="h-5 w-5" />
            <span>ketl cloud</span>
          </Link>
        </div>
        <div className="p-3">
          <NavLinks onClick={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

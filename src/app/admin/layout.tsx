"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Shield,
  Users,
  ToggleLeft,
  BarChart3,
  ArrowLeft,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
  School,
  Building2,
} from "lucide-react";
import { Loader2 } from "lucide-react";

const adminNavItems = [
  { href: "/admin", label: "Oversikt", icon: BarChart3 },
  { href: "/admin/brukere", label: "Brukere", icon: Users },
  { href: "/admin/radgivere", label: "Skoler & rådgivere", icon: School },
  { href: "/admin/feature-flags", label: "Feature flags", icon: ToggleLeft },
  { href: "/admin/tenant", label: "Tenanter", icon: Building2 },
];

function AdminNavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {adminNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

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
            href="/admin"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <Shield className="h-5 w-5" />
            <span>Admin</span>
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
        {collapsed ? (
          <nav className="space-y-1">
            {adminNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
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
        ) : (
          <AdminNavLinks />
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {!collapsed && "Tilbake til dashboard"}
        </Link>
      </div>
    </aside>
  );
}

function AdminMobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <SheetTitle className="sr-only">Admin-navigasjon</SheetTitle>
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-semibold tracking-tight"
            onClick={() => setOpen(false)}
          >
            <Shield className="h-5 w-5" />
            <span>Admin</span>
          </Link>
        </div>
        <div className="p-3">
          <AdminNavLinks onClick={() => setOpen(false)} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake til dashboard
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Beskytter admin-sider — krever innlogging + admin-rolle */
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (firebaseUser) {
      firebaseUser.getIdTokenResult().then((result) => {
        if (!result.claims.admin) {
          router.replace("/dashboard");
        } else {
          setIsAdmin(true);
        }
        setCheckingAdmin(false);
      });
    } else if (!loading) {
      setCheckingAdmin(false);
    }
  }, [user, firebaseUser, loading, router]);

  if (loading || checkingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return <>{children}</>;
}

function AdminContent({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

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
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <AdminMobileSidebar />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.displayName || user?.email}
            </span>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                  />
                }
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.photoURL || undefined}
                    alt={user?.displayName || "Bruker"}
                  />
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logg ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProtectedRoute>
      <AdminContent>{children}</AdminContent>
    </AdminProtectedRoute>
  );
}

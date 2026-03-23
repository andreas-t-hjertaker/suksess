"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Toast-system (lettere enn sonner for enkle feedback-meldinger)
// ---------------------------------------------------------------------------

type ToastType = "success" | "error" | "info" | "warning" | "loading";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
};

type ToastState = ToastItem[];

// Singleton event bus
const listeners: Array<(toasts: ToastState) => void> = [];
let toastState: ToastState = [];

function notifyListeners() {
  listeners.forEach((l) => l([...toastState]));
}

let idCounter = 0;

export const toast = {
  success: (message: string, description?: string, duration = 3000) => {
    const id = String(++idCounter);
    toastState = [...toastState, { id, type: "success", message, description, duration }];
    notifyListeners();
    if (duration > 0) setTimeout(() => toast.dismiss(id), duration);
    return id;
  },
  error: (message: string, description?: string, duration = 5000) => {
    const id = String(++idCounter);
    toastState = [...toastState, { id, type: "error", message, description, duration }];
    notifyListeners();
    if (duration > 0) setTimeout(() => toast.dismiss(id), duration);
    return id;
  },
  info: (message: string, description?: string, duration = 3000) => {
    const id = String(++idCounter);
    toastState = [...toastState, { id, type: "info", message, description, duration }];
    notifyListeners();
    if (duration > 0) setTimeout(() => toast.dismiss(id), duration);
    return id;
  },
  warning: (message: string, description?: string, duration = 4000) => {
    const id = String(++idCounter);
    toastState = [...toastState, { id, type: "warning", message, description, duration }];
    notifyListeners();
    if (duration > 0) setTimeout(() => toast.dismiss(id), duration);
    return id;
  },
  loading: (message: string, description?: string) => {
    const id = String(++idCounter);
    toastState = [...toastState, { id, type: "loading", message, description, duration: 0 }];
    notifyListeners();
    return id;
  },
  dismiss: (id: string) => {
    toastState = toastState.filter((t) => t.id !== id);
    notifyListeners();
  },
  dismissAll: () => {
    toastState = [];
    notifyListeners();
  },
};

// ---------------------------------------------------------------------------
// Toast-komponent
// ---------------------------------------------------------------------------

const TOAST_STYLES: Record<ToastType, { bg: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }> = {
  success: { bg: "border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-950/50", icon: CheckCircle2, iconColor: "text-green-600 dark:text-green-400" },
  error: { bg: "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/50", icon: AlertCircle, iconColor: "text-red-600 dark:text-red-400" },
  info: { bg: "border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/50", icon: Info, iconColor: "text-blue-600 dark:text-blue-400" },
  warning: { bg: "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/50", icon: AlertTriangle, iconColor: "text-amber-600 dark:text-amber-400" },
  loading: { bg: "border-border bg-background", icon: Loader2, iconColor: "text-muted-foreground" },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const { bg, icon: Icon, iconColor } = TOAST_STYLES[item.type];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all duration-300",
        bg,
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
      role={item.type === "error" ? "alert" : "status"}
      aria-live={item.type === "error" ? "assertive" : "polite"}
    >
      <Icon className={cn(
        "h-4 w-4 mt-0.5 shrink-0",
        iconColor,
        item.type === "loading" && "animate-spin"
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{item.message}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
        )}
      </div>
      {item.type !== "loading" && (
        <button
          onClick={() => onDismiss(item.id)}
          className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Lukk melding"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast-container — monteres én gang i layoutet
// ---------------------------------------------------------------------------

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastState>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const idx = listeners.indexOf(setToasts);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-[9998] flex flex-col gap-2 max-w-[360px] w-full md:bottom-4"
      aria-label="Varsler"
      role="region"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={toast.dismiss} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pulseknapp — visuell oppmerksomhetsfanger
// ---------------------------------------------------------------------------

export function PulseButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center rounded-full",
        "before:absolute before:inset-0 before:rounded-full before:bg-primary/20",
        "before:animate-ping",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Suksess-animasjon (checkmark bounce)
// ---------------------------------------------------------------------------

export function SuccessAnimation({ show, className }: { show: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center transition-all duration-300",
        show ? "opacity-100 scale-100" : "opacity-0 scale-75",
        className
      )}
      aria-hidden={!show}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton med shimmer (for loading states)
// ---------------------------------------------------------------------------

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 space-y-3 animate-pulse", className)}>
      <div className="h-4 w-2/3 rounded-full bg-muted" />
      <div className="h-8 w-1/3 rounded-full bg-muted" />
      <div className="h-3 w-1/2 rounded-full bg-muted" />
    </div>
  );
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border p-3 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-9 w-9 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 rounded-full bg-muted w-2/3" />
            <div className="h-3 rounded-full bg-muted w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teller-animasjon (for stats)
// ---------------------------------------------------------------------------

export function AnimatedNumber({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === displayed) return;
    const diff = value - displayed;
    const steps = 20;
    const increment = diff / steps;
    let current = displayed;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current += increment;
      setDisplayed(step >= steps ? value : Math.round(current));
      if (step >= steps) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <span className={className}>
      {displayed.toLocaleString("nb-NO")}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Hover-kort med 3D-tilt-effekt (CSS transforms)
// ---------------------------------------------------------------------------

export function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
    const y = ((e.clientX - rect.left) / rect.width - 0.5) * -6;
    setTilt({ x, y });
  }

  return (
    <div
      className={cn("transition-transform duration-100 ease-out", className)}
      style={{ transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      {children}
    </div>
  );
}

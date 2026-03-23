"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/**
 * BottomSheet — mobilvennlig action sheet med drag-to-close
 *
 * Inspirert av iOS-design og Progressive Web App best practices.
 * Fungerer som modal på desktop (sentrert), bottom sheet på mobil.
 */

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Stopper brukeren fra å lukke ved å klikke på backdrop */
  dismissible?: boolean;
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  // Lås scrolling på body når åpen
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Escape-tast lukker
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open && dismissible) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, dismissible, onClose]);

  // Touch drag-to-dismiss
  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDragY(delta);
  }

  function handleTouchEnd() {
    isDragging.current = false;
    if (dragY > 100 && dismissible) {
      onClose();
    }
    setDragY(0);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          // Mobil: glir opp fra bunn
          "absolute bottom-0 left-0 right-0 sm:relative sm:bottom-auto sm:left-auto sm:right-auto",
          // Desktop: sentrert modal
          "sm:fixed sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg",
          // Styling
          "rounded-t-3xl sm:rounded-2xl bg-background border border-border/50 shadow-2xl",
          "flex flex-col max-h-[90vh] sm:max-h-[85vh]",
          "transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full sm:translate-y-[-45%]"
        )}
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
            <h2 className="text-base font-semibold">{title}</h2>
            {dismissible && (
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Lukk"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Innhold */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * BottomSheetAction — en knapperad i en BottomSheet
 */
export function BottomSheetAction({
  icon: Icon,
  label,
  description,
  onClick,
  destructive,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "hover:bg-accent"
      )}
    >
      {Icon && (
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          destructive ? "bg-destructive/10" : "bg-muted"
        )}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
    </button>
  );
}

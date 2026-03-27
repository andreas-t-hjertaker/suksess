"use client";

import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  className?: string;
}

/**
 * Gjenbrukbar EmptyState-komponent for sider uten innhold.
 * Viser ikon, tittel, beskrivelse og valgfri CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-16",
        className
      )}
      role="status"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
        <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold font-display mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        {action && (
          <Link href={action.href} className={cn(buttonVariants({ variant: "default" }))}>
            {action.label}
          </Link>
        )}
        {secondaryAction && (
          <Link href={secondaryAction.href} className={cn(buttonVariants({ variant: "outline" }))}>
            {secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}

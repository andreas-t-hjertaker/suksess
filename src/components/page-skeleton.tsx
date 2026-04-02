"use client";

import { SkeletonShimmer } from "@/components/motion/skeleton-shimmer";

interface PageSkeletonProps {
  /** Antall skeletonkort å vise */
  cards?: number;
  /** Vis tittel-skeleton */
  title?: boolean;
  /** Mønster: "grid" (kort-grid) | "list" (vertikale linjer) | "chat" (meldingsbobler) */
  variant?: "grid" | "list" | "chat" | "form";
}

/**
 * Sidebasert skeleton-loading (#140)
 *
 * Tilpasbar skeleton som matcher ulike sideoppsett.
 *
 * Bruk:
 *   <PageSkeleton variant="grid" cards={6} />
 *   <PageSkeleton variant="list" />
 *   <PageSkeleton variant="chat" />
 */
export function PageSkeleton({
  cards = 6,
  title = true,
  variant = "grid",
}: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      {title && (
        <div className="space-y-2">
          <SkeletonShimmer className="h-8 w-48" />
          <SkeletonShimmer className="h-4 w-72" />
        </div>
      )}

      {variant === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <SkeletonShimmer className="h-5 w-3/4" />
              <SkeletonShimmer className="h-4 w-full" />
              <SkeletonShimmer className="h-4 w-2/3" />
              <div className="flex gap-2 pt-2">
                <SkeletonShimmer className="h-6 w-16" rounded="full" />
                <SkeletonShimmer className="h-6 w-20" rounded="full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "list" && (
        <div className="space-y-3">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 flex items-center gap-4">
              <SkeletonShimmer className="h-10 w-10 shrink-0" rounded="full" />
              <div className="flex-1 space-y-2">
                <SkeletonShimmer className="h-4 w-3/4" />
                <SkeletonShimmer className="h-3 w-1/2" />
              </div>
              <SkeletonShimmer className="h-8 w-20" rounded="md" />
            </div>
          ))}
        </div>
      )}

      {variant === "chat" && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          {Array.from({ length: cards }, (_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              <div className={`space-y-1 ${i % 2 === 0 ? "max-w-[70%]" : "max-w-[60%]"}`}>
                <SkeletonShimmer
                  className={`h-12 w-full ${i % 2 === 0 ? "rounded-tl-sm" : "rounded-tr-sm"}`}
                  rounded="lg"
                />
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <SkeletonShimmer className="h-10 flex-1" rounded="lg" />
            <SkeletonShimmer className="h-10 w-10" rounded="md" />
          </div>
        </div>
      )}

      {variant === "form" && (
        <div className="max-w-2xl space-y-6">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonShimmer className="h-4 w-24" />
              <SkeletonShimmer className="h-10 w-full" rounded="md" />
            </div>
          ))}
          <SkeletonShimmer className="h-10 w-32" rounded="md" />
        </div>
      )}
    </div>
  );
}

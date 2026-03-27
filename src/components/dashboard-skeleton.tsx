"use client";

import { SkeletonShimmer } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Skeleton loading state for dashboard bento grid.
 * Shows shimmering placeholders matching the bento layout.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome heading */}
      <div className="space-y-2">
        <SkeletonShimmer className="h-8 w-48" rounded="lg" />
        <SkeletonShimmer className="h-4 w-72" rounded="md" />
      </div>

      {/* Bento grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Profile card */}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6">
            <SkeletonShimmer className="h-16 w-16" rounded="full" />
            <SkeletonShimmer className="h-5 w-32" rounded="md" />
            <SkeletonShimmer className="h-4 w-20" rounded="md" />
          </CardContent>
        </Card>

        {/* XP card */}
        <Card>
          <CardContent className="py-6 space-y-3">
            <div className="flex items-center gap-2">
              <SkeletonShimmer className="h-8 w-8" rounded="full" />
              <SkeletonShimmer className="h-4 w-20" rounded="md" />
            </div>
            <SkeletonShimmer className="h-8 w-24" rounded="md" />
            <SkeletonShimmer className="h-5 w-16" rounded="full" />
          </CardContent>
        </Card>

        {/* Stats card */}
        <Card>
          <CardContent className="py-6 space-y-3">
            <div className="flex items-center gap-2">
              <SkeletonShimmer className="h-8 w-8" rounded="full" />
              <SkeletonShimmer className="h-4 w-24" rounded="md" />
            </div>
            <SkeletonShimmer className="h-8 w-16" rounded="md" />
            <SkeletonShimmer className="h-3 w-32" rounded="md" />
          </CardContent>
        </Card>

        {/* RIASEC card */}
        <Card>
          <CardContent className="py-6 space-y-3">
            <div className="flex items-center gap-2">
              <SkeletonShimmer className="h-8 w-8" rounded="full" />
              <SkeletonShimmer className="h-4 w-28" rounded="md" />
            </div>
            <SkeletonShimmer className="h-8 w-20" rounded="md" />
            <SkeletonShimmer className="h-3 w-24" rounded="md" />
          </CardContent>
        </Card>

        {/* AI chat widget */}
        <Card>
          <CardContent className="py-6 space-y-3">
            <div className="flex items-center gap-2">
              <SkeletonShimmer className="h-8 w-8" rounded="full" />
              <SkeletonShimmer className="h-4 w-20" rounded="md" />
            </div>
            <SkeletonShimmer className="h-4 w-full" rounded="md" />
            <div className="flex gap-1.5">
              <SkeletonShimmer className="h-5 w-16" rounded="full" />
              <SkeletonShimmer className="h-5 w-16" rounded="full" />
              <SkeletonShimmer className="h-5 w-16" rounded="full" />
            </div>
          </CardContent>
        </Card>

        {/* Checklist card */}
        <Card>
          <CardContent className="py-6 space-y-3">
            <div className="flex items-center gap-2">
              <SkeletonShimmer className="h-8 w-8" rounded="full" />
              <SkeletonShimmer className="h-4 w-20" rounded="md" />
            </div>
            <div className="flex items-center gap-4">
              <SkeletonShimmer className="h-14 w-14" rounded="full" />
              <SkeletonShimmer className="h-4 w-24" rounded="md" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <SkeletonShimmer className="h-3.5 w-3.5" rounded="full" />
                <SkeletonShimmer className="h-3 w-32" rounded="md" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

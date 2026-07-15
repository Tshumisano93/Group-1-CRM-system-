import React from "react";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-[linear-gradient(110deg,#e2e8f0_8%,#f1f5f9_18%,#e2e8f0_33%)] bg-[length:200%_100%] animate-shimmer rounded ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {[...Array(6)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

import React from 'react';

export const Skeleton = ({ className = '' }) => (
  <div className={`skeleton-line rounded-lg ${className}`} />
);

export const SkeletonCard = () => (
  <div className="glass-card p-5 space-y-3">
    <Skeleton className="h-5 w-2/5" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="glass-card p-0 overflow-hidden">
    <div className="p-4 border-b border-white/10">
      <Skeleton className="h-5 w-32" />
    </div>
    <div className="divide-y divide-white/5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-20 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

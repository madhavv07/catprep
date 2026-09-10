import React from 'react';

/**
 * High-performance animated skeleton wave cards.
 * Uses hardware-accelerated .skeleton-shimmer keyframes with zero layout shifts.
 */

export const TaskCardSkeleton: React.FC = () => {
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4 border border-white/[0.06]">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Checkbox Placeholder */}
          <div className="w-5 h-5 rounded-full skeleton-shimmer shrink-0" />
          {/* Subject Pill & Tag */}
          <div className="flex items-center gap-2">
            <div className="w-14 h-5 rounded-md skeleton-shimmer" />
            <div className="w-20 h-5 rounded-md skeleton-shimmer" />
            <div className="w-24 h-5 rounded-full skeleton-shimmer hidden sm:block" />
          </div>
        </div>
        {/* Action icons */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg skeleton-shimmer" />
          <div className="w-6 h-6 rounded-lg skeleton-shimmer" />
        </div>
      </div>

      {/* Title & Short Description */}
      <div className="pl-8 space-y-2">
        <div className="w-3/4 h-5 rounded-lg skeleton-shimmer" />
        <div className="w-1/2 h-3.5 rounded-lg skeleton-shimmer" />

        {/* Metadata Chips */}
        <div className="pt-2 flex items-center gap-4">
          <div className="w-24 h-4 rounded-md skeleton-shimmer" />
          <div className="w-28 h-4 rounded-md skeleton-shimmer" />
          <div className="w-20 h-4 rounded-md skeleton-shimmer hidden sm:block" />
        </div>
      </div>
    </div>
  );
};

export const FeedPostSkeleton: React.FC = () => {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4 border border-white/[0.06]">
      {/* Header with Avatar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl skeleton-shimmer shrink-0" />
          <div className="space-y-1.5">
            <div className="w-28 h-4 rounded skeleton-shimmer" />
            <div className="w-20 h-3 rounded skeleton-shimmer" />
          </div>
        </div>
        <div className="w-16 h-4 rounded-full skeleton-shimmer" />
      </div>

      {/* Post text */}
      <div className="space-y-2 pt-1">
        <div className="w-full h-3.5 rounded skeleton-shimmer" />
        <div className="w-5/6 h-3.5 rounded skeleton-shimmer" />
      </div>

      {/* Footer bar */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05]">
        <div className="w-16 h-6 rounded-lg skeleton-shimmer" />
        <div className="w-20 h-6 rounded-lg skeleton-shimmer" />
      </div>
    </div>
  );
};

export const VocabCardSkeleton: React.FC = () => {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3.5 border border-white/[0.06]">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="w-28 h-5 rounded-lg skeleton-shimmer" />
          <div className="w-16 h-3.5 rounded skeleton-shimmer" />
        </div>
        <div className="w-14 h-5 rounded-full skeleton-shimmer" />
      </div>
      <div className="h-10 rounded-xl skeleton-shimmer w-full" />
      <div className="w-3/4 h-3.5 rounded skeleton-shimmer" />
    </div>
  );
};

export const MetricsGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-card p-4 sm:p-5 rounded-2xl space-y-3 border border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="w-20 h-3.5 rounded skeleton-shimmer" />
            <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
          </div>
          <div className="w-16 h-7 rounded-lg skeleton-shimmer" />
          <div className="w-28 h-3 rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
};

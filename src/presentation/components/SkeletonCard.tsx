export function SkeletonCard() {
  return (
    <div data-testid="skeleton-card" className="overflow-hidden" aria-hidden="true">
      <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-surface-2" />
      <div className="mt-2 space-y-1.5 px-0.5">
        <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-surface-2" />
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-surface-2" />
      </div>
    </div>
  );
}

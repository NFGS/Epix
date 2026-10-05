export function SkeletonCard() {
  return (
    <div
      data-testid="skeleton-card"
      className="overflow-hidden rounded-xl border border-border bg-surface"
      aria-hidden="true"
    >
      <div className="aspect-[2/3] w-full animate-pulse bg-surface-2" />
      <div className="space-y-2 p-2.5">
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}

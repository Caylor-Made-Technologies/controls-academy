/** A shimmering placeholder block. Size it with utility classes (`h-9 w-3/4`). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Placeholder for a whole screen body while its code loads. */
export function SkeletonPage() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-9 w-3/4" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}

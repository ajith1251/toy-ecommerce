import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-button,8px)] bg-[var(--surface-soft)] border border-[var(--hairline)]',
        className
      )}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-[var(--surface)] rounded-[var(--radius-card,16px)] overflow-hidden border border-[var(--hairline)]">
      <Skeleton className="aspect-[4/5] rounded-none border-0" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-20 border-0 bg-[var(--hairline)]" />
        <Skeleton className="h-5 w-3/4 border-0 bg-[var(--hairline)]" />
        <Skeleton className="h-3 w-full border-0 bg-[var(--hairline)]" />
        <div className="flex justify-between items-center mt-4">
          <Skeleton className="h-6 w-16 border-0 bg-[var(--hairline)]" />
          <Skeleton className="h-4 w-20 border-0 bg-[var(--hairline)]" />
        </div>
      </div>
    </div>
  );
}

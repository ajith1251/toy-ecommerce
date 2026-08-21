import { Loader2 } from 'lucide-react';

/** Full-area loading indicator for page-level async work (API-backed routes). */
export default function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-32" role="status" aria-live="polite">
      <Loader2 size={40} className="text-red-500 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

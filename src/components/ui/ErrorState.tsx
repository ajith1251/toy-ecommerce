import { AlertTriangle } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Called by the "Try again" button. Omit to hide the retry action. */
  onRetry?: () => void;
  /** Optional secondary action (e.g. a link back home). */
  footer?: React.ReactNode;
}

/**
 * Consistent user-facing error state. Deliberately vague about the failure —
 * no stack traces or technical details are ever shown to users.
 */
export default function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
  footer,
}: ErrorStateProps) {
  return (
    <div className="text-center py-24 max-w-xl mx-auto px-6" role="alert">
      <div className="w-20 h-20 mx-auto rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-5">
        <AlertTriangle size={40} className="text-red-400" aria-hidden />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <Button onClick={onRetry}>Try Again</Button>
        )}
        {footer}
      </div>
    </div>
  );
}

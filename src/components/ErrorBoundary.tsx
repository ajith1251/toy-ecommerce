import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import ErrorState from './ui/ErrorState';
import { captureException } from '../lib/errorTracking';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Application-level error boundary. Catches unexpected rendering errors so
 * users see a friendly, recoverable state instead of a blank page or a raw
 * stack trace. Resets when the user clicks "Try again".
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Report through the tracking boundary (console by default; a real
    // provider can be plugged in without touching this component).
    captureException(error, { componentStack: info.componentStack });
    console.error('Application error:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <ErrorState
            title="Something went wrong"
            description="An unexpected error occurred while rendering this page."
            onRetry={this.handleRetry}
            footer={
              <a
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-slate-200 dark:border-slate-700 hover:border-red-500 hover:text-red-500 font-medium transition-all"
              >
                Back to ToyBox
              </a>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}

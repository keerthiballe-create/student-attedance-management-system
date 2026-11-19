import { Component, type ErrorInfo, type ReactNode } from 'react';

interface GlobalErrorPageProps {
  errorType: string;
  message: string;
  onReset: () => void;
}

/**
 * Unit 2: Global Error Page displayed for unhandled UI exceptions or custom error states.
 */
export function GlobalErrorPage({ errorType, message, onReset }: GlobalErrorPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-5 py-12 text-slate-900">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8">
        <div className="font-mono text-xs font-medium text-red-600">
          {errorType}
        </div>
        <h1 className="mt-2 font-display text-xl font-bold tracking-tight text-slate-900">
          Global Error Page
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {message || 'An unexpected application error occurred.'}
        </p>
        <div className="mt-6 flex items-center gap-3">
          {/* Delegation Event Model: <button> is the Event Source, click is the Event Object, onReset is the Event Listener */}
          <button
            type="button"
            onClick={onReset}
            className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap"
          >
            Return to Attendance Ledger
          </button>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('GlobalErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <GlobalErrorPage
          errorType={this.state.error.name || 'ApplicationException'}
          message={this.state.error.message}
          onReset={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

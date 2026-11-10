import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI ErrorBoundary capture:', error, info.componentStack);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-slate-900">
              অ্যাপ্লিকেশনে একটি অপ্রত্যাশিত সমস্যা হয়েছে
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              অনুগ্রহ করে পেজটি পুনরায় লোড করুন। সমস্যাটি থেকে গেলে সার্ভার চালু আছে কিনা যাচাই করুন।
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <RotateCcw className="h-4 w-4" />
              <span>পুনরায় চেষ্টা করুন</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

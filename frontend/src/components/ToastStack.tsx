import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error';
  text: string;
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  useEffect(() => {
    const durationMs = toast.type === 'error' ? 7000 : 5000;
    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast.id, toast.type, onDismiss]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-sm shadow-lg backdrop-blur-sm ${
        toast.type === 'error'
          ? 'border-rose-200 bg-rose-50/95 text-rose-900'
          : 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {toast.type === 'error' ? (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        )}
        <span className="font-medium">{toast.text}</span>
      </div>
      <button
        type="button"
        aria-label="নোটিফিকেশন বন্ধ করুন"
        onClick={() => onDismiss(toast.id)}
        className="cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2.5 pl-8 sm:pl-0">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

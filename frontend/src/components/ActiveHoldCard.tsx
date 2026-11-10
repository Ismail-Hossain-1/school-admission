import { CheckCircle2, Clock, CreditCard, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';
import type { HoldStatus, StudentHoldResponse } from '../types/admission';
import { HoldStatusBadge } from './HoldStatusBadge';

interface ActiveHoldCardProps {
  hold: StudentHoldResponse;
  onConfirm: (holdId: string) => Promise<void>;
  onCancel: (holdId: string) => Promise<void>;
  onExpired?: () => void;
  isConfirming: boolean;
  isCancelling: boolean;
}

export function ActiveHoldCard({
  hold,
  onConfirm,
  onCancel,
  onExpired,
  isConfirming,
  isCancelling,
}: ActiveHoldCardProps) {
  const { remainingSeconds, formattedTime, isExpired } = useCountdown(
    hold.expiresAt,
    hold.status === 'HELD',
    onExpired,
  );

  const effectiveStatus: HoldStatus =
    hold.status === 'HELD' && isExpired ? 'EXPIRED' : hold.status;

  const isHeldActive = effectiveStatus === 'HELD';
  const isBusy = isConfirming || isCancelling;
  const isUrgent = isHeldActive && remainingSeconds <= 60;

  return (
    <div
      data-testid={`hold-card-${hold.holdId}`}
      className={`rounded-xl border bg-white p-5 shadow-xs transition ${
        effectiveStatus === 'CONFIRMED'
          ? 'border-emerald-200 bg-emerald-50/30'
          : effectiveStatus === 'EXPIRED'
            ? 'border-rose-200 bg-rose-50/30'
            : 'border-indigo-200'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900">
              {hold.className || hold.classId}
            </h3>
            <HoldStatusBadge status={effectiveStatus} />
          </div>
          <p className="text-xs text-slate-500">
            আবেদন আইডি: <span className="font-mono font-medium text-slate-700">{hold.holdId}</span>
          </p>
        </div>

        {/* Countdown Display */}
        {isHeldActive && (
          <div
            className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2 ${
              isUrgent
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? 'animate-pulse text-rose-600' : ''}`} />
            <div className="text-right">
              <p className="text-[11px] font-medium">মেয়াদ শেষ হতে বাকি</p>
              <p className="font-mono text-lg leading-tight font-bold tabular-nums">
                {formattedTime}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contextual Status Feedback */}
      {effectiveStatus === 'CONFIRMED' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>ভর্তি ফি পরিশোধ সফল হয়েছে এবং আপনার আসনটি স্থায়ীভাবে নিশ্চিত করা হয়েছে।</span>
        </div>
      )}

      {effectiveStatus === 'EXPIRED' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>
            নির্ধারিত সময়সীমা শেষ হয়ে যাওয়ায় আবেদনটি EXPIRED হয়েছে এবং আসনটি পুনরায় অন্যদের জন্য উন্মুক্ত হয়েছে।
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-3.5">
        <button
          type="button"
          disabled={!isHeldActive || isBusy}
          onClick={() => void onCancel(hold.holdId)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCancelling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>বাতিল হচ্ছে...</span>
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              <span>বাতিল</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={!isHeldActive || isBusy}
          onClick={() => void onConfirm(hold.holdId)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isConfirming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>পরিশোধ হচ্ছে...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              <span>ভর্তি ফি দিন</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

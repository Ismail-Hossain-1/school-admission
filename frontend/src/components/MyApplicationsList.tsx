import { ClipboardList, ArrowRight, RefreshCw, Loader2, CalendarClock } from 'lucide-react';
import type { StudentHoldResponse } from '../types/admission';
import { ActiveHoldCard } from './ActiveHoldCard';
import { HoldStatusBadge } from './HoldStatusBadge';

interface MyApplicationsListProps {
  holds: StudentHoldResponse[];
  isStudentIdValid: boolean;
  isLoading: boolean;
  confirmingHoldId: string | null;
  cancellingHoldId: string | null;
  onConfirm: (holdId: string) => Promise<void>;
  onCancel: (holdId: string) => Promise<void>;
  onHoldExpired: (holdId: string) => void;
  onRefresh: () => void;
  onNavigateToClasses: () => void;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function MyApplicationsList({
  holds,
  isStudentIdValid,
  isLoading,
  confirmingHoldId,
  cancellingHoldId,
  onConfirm,
  onCancel,
  onHoldExpired,
  onRefresh,
  onNavigateToClasses,
}: MyApplicationsListProps) {
  if (!isStudentIdValid) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <ClipboardList className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-3 text-base font-bold text-slate-900">
          শিক্ষার্থীর পরিচয় এখনো প্রদান করা হয়নি
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          আপনার আবেদনসমূহ দেখতে অনুগ্রহ করে উপরে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর লিখুন।
        </p>
      </div>
    );
  }

  const activeHolds = holds.filter((h) => h.status === 'HELD');
  const finalizedHolds = holds.filter((h) => h.status !== 'HELD');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">আমার আবেদনসমূহ</h2>
            <p className="text-xs text-slate-500">
              মোট {holds.length}টি আবেদন (সক্রিয়: {activeHolds.length}টি)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 sm:self-center"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>তালিকা হালনাগাদ</span>
        </button>
      </div>

      {isLoading && holds.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-12 text-sm text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span>আপনার আবেদনসমূহ লোড হচ্ছে...</span>
        </div>
      ) : holds.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-xs">
          <p className="text-base font-semibold text-slate-800">
            এই জন্ম নিবন্ধন নম্বরের অধীনে এখনো কোনো আবেদন পাওয়া যায়নি
          </p>
          <p className="mt-1 text-sm text-slate-500">
            পছন্দের ক্লাস ও শিফটে আসন সংরক্ষণ করতে ক্লাস তালিকা থেকে আবেদন করুন।
          </p>
          <button
            type="button"
            onClick={onNavigateToClasses}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
          >
            <span>ক্লাস তালিকা দেখুন</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeHolds.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">
                সক্রিয় আবেদন ({activeHolds.length}টি)
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {activeHolds.map((hold) => (
                  <ActiveHoldCard
                    key={hold.holdId}
                    hold={hold}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                    onExpired={() => onHoldExpired(hold.holdId)}
                    isConfirming={confirmingHoldId === hold.holdId}
                    isCancelling={cancellingHoldId === hold.holdId}
                  />
                ))}
              </div>
            </section>
          )}

          {finalizedHolds.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-6 py-3.5">
                <h3 className="text-sm font-bold text-slate-800">
                  অন্যান্য ও পূর্ববর্তী আবেদন ({finalizedHolds.length}টি)
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {finalizedHolds.map((hold) => (
                  <div
                    key={hold.holdId}
                    className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-semibold text-slate-900">
                          {hold.className || hold.classId}
                        </span>
                        <HoldStatusBadge status={hold.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        আবেদন আইডি: <span className="font-mono">{hold.holdId}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                      <span>সময়সীমা: {formatDateTime(hold.expiresAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

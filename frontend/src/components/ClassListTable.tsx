import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Send, Users } from 'lucide-react';
import type { ClassDetailResponse, HoldStatus } from '../types/admission';

interface ClassListTableProps {
  classes: ClassDetailResponse[];
  isInitialLoading: boolean;
  pollingError: string | null;
  lastUpdated: Date | null;
  isStudentIdValid: boolean;
  studentClassStatusMap: Map<string, HoldStatus>;
  applyingClassId: string | null;
  onApply: (classId: string) => Promise<void>;
  onManualRefresh: () => void;
}

export function ClassListTable({
  classes,
  isInitialLoading,
  pollingError,
  lastUpdated,
  isStudentIdValid,
  studentClassStatusMap,
  applyingClassId,
  onApply,
  onManualRefresh,
}: ClassListTableProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">ক্লাস ও শিফট তালিকা</h2>
            <p className="text-xs text-slate-500">
              প্রতি ৩ সেকেন্ড পরপর আসন সংখ্যা স্বয়ংক্রিয়ভাবে হালনাগাদ হয়
              {lastUpdated ? ` · সর্বশেষ: ${lastUpdated.toLocaleTimeString('bn-BD')}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onManualRefresh}
          className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:self-center"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>এখনই হালনাগাদ</span>
        </button>
      </div>

      {/* Non-destructive Polling Error Warning */}
      {pollingError && (
        <div
          role="alert"
          className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{pollingError}</span>
        </div>
      )}

      {/* Initial Loading State */}
      {isInitialLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span>ক্লাস তালিকা লোড হচ্ছে...</span>
        </div>
      ) : classes.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-slate-700">এখনো কোনো ক্লাস তৈরি করা হয়নি</p>
          <p className="mt-1 text-sm text-slate-500">
            স্কুল অ্যাডমিন হিসেবে নতুন ক্লাস ও শিফট যোগ করতে &ldquo;নতুন ক্লাস তৈরি (অ্যাডমিন)&rdquo; ট্যাবে যান।
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-3.5">ক্লাস ও শিফট</th>
                <th className="px-4 py-3.5 text-center">মোট আসন</th>
                <th className="px-4 py-3.5 text-center">হোল্ড করা</th>
                <th className="px-4 py-3.5 text-center">নিশ্চিত</th>
                <th className="px-4 py-3.5 text-center">খালি আসন</th>
                <th className="px-6 py-3.5 text-right">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map((cls) => {
                const studentStatus = studentClassStatusMap.get(cls.id);
                const isApplying = applyingClassId === cls.id;
                const isAnyApplying = applyingClassId !== null;
                const isAvailable = cls.availableSeats > 0;
                const alreadyActive =
                  studentStatus === 'HELD' || studentStatus === 'CONFIRMED';

                return (
                  <tr key={cls.id} className="transition hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{cls.name}</p>
                      <p className="font-mono text-xs text-slate-400">{cls.id}</p>
                    </td>

                    <td className="px-4 py-4 text-center font-semibold text-slate-800 tabular-nums">
                      {cls.totalSeats}
                    </td>

                    <td className="px-4 py-4 text-center tabular-nums">
                      <span className="inline-flex min-w-[2.25rem] justify-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        {cls.heldSeats}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center tabular-nums">
                      <span className="inline-flex min-w-[2.25rem] justify-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {cls.confirmedSeats}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center tabular-nums">
                      <span
                        className={`inline-flex min-w-[2.25rem] justify-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isAvailable
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {cls.availableSeats}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {studentStatus === 'CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>ভর্তি নিশ্চিত</span>
                        </span>
                      ) : studentStatus === 'HELD' ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900">
                          <Clock className="h-3.5 w-3.5" />
                          <span>আবেদন চলমান</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!isStudentIdValid || !isAvailable || alreadyActive || isAnyApplying}
                          title={
                            !isStudentIdValid
                              ? 'আবেদন করতে প্রথমে উপরে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন'
                              : !isAvailable
                                ? 'এই ক্লাসে কোনো আসন খালি নেই'
                                : undefined
                          }
                          onClick={() => void onApply(cls.id)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          {isApplying ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>আবেদন হচ্ছে...</span>
                            </>
                          ) : !isAvailable ? (
                            <span>আসন পূর্ণ</span>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span>আবেদন করুন</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


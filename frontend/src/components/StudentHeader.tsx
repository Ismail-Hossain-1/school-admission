import { CheckCircle2, Eraser, GraduationCap, IdCard, Sparkles, AlertCircle } from 'lucide-react';
import { useStudent } from '../context/useStudent';
import { STUDENT_ID_LENGTH } from '../utils/studentId';

export function StudentHeader() {
  const { draftStudentId, isValid, updateDraftStudentId, clearStudentId, fillDemoStudentId } =
    useStudent();

  const remainingDigits = STUDENT_ID_LENGTH - draftStudentId.length;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              স্কুল ভর্তি সিস্টেম
            </h1>
            <p className="text-xs text-slate-500">
              অনলাইন আসন সংরক্ষণ ও ভর্তি পোর্টাল (আগে আবেদন করলে আগে পাবেন)
            </p>
          </div>
        </div>

        {/* Persistent Student Identity Input */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 md:min-w-[420px]">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="student-id-input"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
            >
              <IdCard className="h-4 w-4 text-indigo-600" />
              <span>শিক্ষার্থীর জন্ম নিবন্ধন নম্বর (১৭ অঙ্ক)</span>
            </label>

            {isValid ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>পরিচয় সক্রিয়</span>
              </span>
            ) : draftStudentId.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>
                  আরও {remainingDigits}টি সংখ্যা দিন ({draftStudentId.length}/17)
                </span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">আবেদন করতে নম্বর দিন (0/17)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="student-id-input"
              type="text"
              inputMode="numeric"
              maxLength={STUDENT_ID_LENGTH}
              value={draftStudentId}
              onChange={(e) => updateDraftStudentId(e.target.value)}
              placeholder="১৭ অঙ্কের জন্ম নিবন্ধন নম্বর লিখুন (যেমন: 20152691234567890)"
              className={`w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm text-slate-900 transition outline-none placeholder:font-sans placeholder:text-xs placeholder:text-slate-400 ${
                isValid
                  ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                  : draftStudentId.length > 0
                    ? 'border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
              }`}
            />

            <button
              type="button"
              onClick={fillDemoStudentId}
              title="পরীক্ষার জন্য একটি ১৭ অঙ্কের নমুনা নম্বর বসান"
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>নমুনা</span>
            </button>

            {draftStudentId.length > 0 && (
              <button
                type="button"
                onClick={clearStudentId}
                title="নম্বর মুছে ফেলুন"
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                <Eraser className="h-3.5 w-3.5" />
                <span>মুছুন</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

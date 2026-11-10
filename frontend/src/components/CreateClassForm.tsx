import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, PlusCircle } from 'lucide-react';
import { admissionApi } from '../api/admissionApi';
import { parseApiError } from '../api/apiError';
import type { ClassResponse } from '../types/admission';

interface CreateClassFormProps {
  onClassCreated?: (created: ClassResponse) => void;
}

export function CreateClassForm({ onClassCreated }: CreateClassFormProps) {
  const [name, setName] = useState('');
  const [totalSeatsInput, setTotalSeatsInput] = useState('');
  const [fieldError, setFieldError] = useState<{ name?: string; totalSeats?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdClass, setCreatedClass] = useState<ClassResponse | null>(null);
  const [recentClasses, setRecentClasses] = useState<ClassResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): { name: string; totalSeats: number } | null => {
    const errors: { name?: string; totalSeats?: string } = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      errors.name = 'ক্লাসের নাম আবশ্যক।';
    } else if (trimmedName.length > 255) {
      errors.name = 'ক্লাসের নাম সর্বোচ্চ ২৫৫ অক্ষরের মধ্যে হতে হবে।';
    }

    const trimmedSeats = totalSeatsInput.trim();
    const parsedSeats = Number(trimmedSeats);

    if (!trimmedSeats || !Number.isInteger(parsedSeats) || parsedSeats < 1) {
      errors.totalSeats = 'মোট আসন সংখ্যা অবশ্যই ১ বা তার বেশি পূর্ণসংখ্যা হতে হবে।';
    } else if (parsedSeats > 100000) {
      errors.totalSeats = 'মোট আসন সংখ্যা ১,০০,০০০-এর বেশি হতে পারবে না।';
    }

    setFieldError(errors);
    if (Object.keys(errors).length > 0) {
      return null;
    }

    return { name: trimmedName, totalSeats: parsedSeats };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setCreatedClass(null);

    const validated = validate();
    if (!validated) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await admissionApi.createClass(validated);
      setCreatedClass(created);
      setRecentClasses((prev) => [created, ...prev]);
      setName('');
      setTotalSeatsInput('');
      setFieldError({});
      onClassCreated?.(created);
    } catch (error) {
      const apiErr = parseApiError(error);
      setSubmitError(apiErr.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">
            নতুন ক্লাস ও শিফট তৈরি (অ্যাডমিন)
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <Info className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>
              প্রতিটি শিফটের জন্য আলাদা ক্লাস তৈরি করুন (যেমন: Class 6 - Morning Shift, Class 6 - Day Shift)।
            </span>
          </p>
        </div>

        {createdClass && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold">নতুন ক্লাস সফলভাবে তৈরি হয়েছে!</p>
              <p className="mt-0.5 text-emerald-800">
                ক্লাস: <span className="font-medium">{createdClass.name}</span> · মোট আসন:{' '}
                <span className="font-medium">{createdClass.totalSeats}</span> · আইডি:{' '}
                <span className="font-mono text-xs">{createdClass.id}</span>
              </p>
            </div>
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">ক্লাস তৈরি করা যায়নি</p>
              <p className="mt-0.5 text-rose-800">{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label
                htmlFor="class-name-input"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                ক্লাসের নাম <span className="text-rose-500">*</span>
              </label>
              <input
                id="class-name-input"
                type="text"
                maxLength={255}
                value={name}
                disabled={isSubmitting}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldError.name) {
                    setFieldError((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                placeholder="যেমন: Class 6 - Morning Shift"
                className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 disabled:bg-slate-100 ${
                  fieldError.name
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                }`}
              />
              {fieldError.name && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldError.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="total-seats-input"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                মোট আসন সংখ্যা <span className="text-rose-500">*</span>
              </label>
              <input
                id="total-seats-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={100000}
                value={totalSeatsInput}
                disabled={isSubmitting}
                onChange={(e) => {
                  setTotalSeatsInput(e.target.value);
                  if (fieldError.totalSeats) {
                    setFieldError((prev) => ({ ...prev, totalSeats: undefined }));
                  }
                }}
                placeholder="যেমন: 120"
                className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 disabled:bg-slate-100 ${
                  fieldError.totalSeats
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                }`}
              />
              {fieldError.totalSeats && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldError.totalSeats}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>তৈরি হচ্ছে...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>ক্লাস তৈরি করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {recentClasses.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            এই সেশনে তৈরি করা ক্লাসসমূহ ({recentClasses.length}টি)
          </h3>
          <div className="divide-y divide-slate-100">
            {recentClasses.map((cls) => (
              <div key={cls.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-900">{cls.name}</span>
                  <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                    {cls.id}
                  </span>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-semibold text-indigo-700">
                  মোট আসন: {cls.totalSeats}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


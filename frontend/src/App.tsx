import { useState } from 'react';
import { BookOpen, ClipboardList, PlusCircle, Server, UserCheck, UserX } from 'lucide-react';
import { CreateClassForm } from './components/CreateClassForm';
import { StudentHeader } from './components/StudentHeader';
import { envConfig } from './config/env';
import { StudentProvider } from './context/StudentContext';
import { useStudent } from './context/useStudent';

type ActiveTab = 'classes' | 'my-holds' | 'admin';

function PortalBody() {
  const { studentId, isValid } = useStudent();
  const [activeTab, setActiveTab] = useState<ActiveTab>('admin');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StudentHeader />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Session Status Bar */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            {isValid ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <UserCheck className="h-4.5 w-4.5" />
              </div>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <UserX className="h-4.5 w-4.5" />
              </div>
            )}
            <p className="text-sm font-medium text-slate-700">
              {isValid
                ? `সক্রিয় জন্ম নিবন্ধন নম্বর: ${studentId}`
                : 'আবেদন করতে উপরের ঘরে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর লিখুন।'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 sm:self-center">
            <Server className="h-3.5 w-3.5 text-emerald-600" />
            <span>সার্ভার: {envConfig.apiBaseUrl}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="প্রধান নেভিগেশন" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'classes'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>ক্লাস তালিকা ও আবেদন</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my-holds')}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'my-holds'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>আমার আবেদন</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>নতুন ক্লাস তৈরি (অ্যাডমিন)</span>
          </button>
        </nav>

        {/* Tab Views */}
        {activeTab === 'classes' && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-base font-semibold text-slate-800">ক্লাস তালিকা ও আবেদন স্ক্রিন</h2>
            <p className="mt-1 text-sm text-slate-500">
              পরবর্তী ধাপে লাইভ আসন সংখ্যা ও আবেদন কার্যক্রম যুক্ত করা হবে।
            </p>
          </div>
        )}

        {activeTab === 'my-holds' && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-base font-semibold text-slate-800">আমার আবেদন তালিকা</h2>
            <p className="mt-1 text-sm text-slate-500">
              পরবর্তী ধাপে শিক্ষার্থীর সকল আবেদনের অবস্থা ও ফি পরিশোধ ব্যবস্থা যুক্ত করা হবে।
            </p>
          </div>
        )}

        {activeTab === 'admin' && <CreateClassForm />}
      </main>
    </div>
  );
}

function App() {
  return (
    <StudentProvider>
      <PortalBody />
    </StudentProvider>
  );
}

export default App;

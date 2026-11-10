import { Server, UserCheck, UserX } from 'lucide-react';
import { StudentHeader } from './components/StudentHeader';
import { envConfig } from './config/env';
import { StudentProvider } from './context/StudentContext';
import { useStudent } from './context/useStudent';

function PortalBody() {
  const { studentId, isValid } = useStudent();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StudentHeader />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            {isValid ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <UserCheck className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <UserX className="h-5 w-5" />
              </div>
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {isValid
                  ? `স্বাগতম! সক্রিয় জন্ম নিবন্ধন নম্বর: ${studentId}`
                  : 'শিক্ষার্থীর পরিচয় এখনো সেট করা হয়নি'}
              </h2>
              <p className="text-sm text-slate-600">
                {isValid
                  ? 'আপনার পরিচয় ব্রাউজারে সংরক্ষিত আছে। পেজ রিলোড করলেও তথ্য অক্ষুণ্ণ থাকবে।'
                  : 'ভর্তির আবেদন করতে উপরের ঘরে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর লিখুন।'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 sm:self-center">
            <Server className="h-3.5 w-3.5 text-emerald-600" />
            <span>সার্ভার: {envConfig.apiBaseUrl}</span>
          </div>
        </div>
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

import { GraduationCap, Server } from 'lucide-react';
import { envConfig } from './config/env';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">স্কুল ভর্তি সিস্টেম</h1>
              <p className="text-xs text-slate-500">অনলাইন আসন সংরক্ষণ ও ভর্তি পোর্টাল</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
            <Server className="h-3.5 w-3.5 text-emerald-600" />
            <span>সার্ভার: {envConfig.apiBaseUrl}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <h2 className="text-lg font-semibold text-slate-800">
            ভর্তি পোর্টাল প্রস্তুত হচ্ছে
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            প্রাথমিক অবকাঠামো ও বাংলা ইউজার ইন্টারফেস কনফিগারেশন সফলভাবে সম্পন্ন হয়েছে।
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;

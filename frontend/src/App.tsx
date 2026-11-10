import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardList, PlusCircle, Server, UserCheck, UserX } from 'lucide-react';
import { admissionApi } from './api/admissionApi';
import { parseApiError } from './api/apiError';
import { ActiveHoldCard } from './components/ActiveHoldCard';
import { ClassListTable } from './components/ClassListTable';
import { CreateClassForm } from './components/CreateClassForm';
import { MyApplicationsList } from './components/MyApplicationsList';
import { StudentHeader } from './components/StudentHeader';
import { ToastStack, type ToastItem } from './components/ToastStack';
import { envConfig } from './config/env';
import { StudentProvider } from './context/StudentContext';
import { useStudent } from './context/useStudent';
import { useClassesPolling } from './hooks/useClassesPolling';
import type { HoldStatus, StudentHoldResponse } from './types/admission';

type ActiveTab = 'classes' | 'my-holds' | 'admin';

function PortalBody() {
  const { studentId, isValid } = useStudent();
  const [activeTab, setActiveTab] = useState<ActiveTab>('classes');

  const { classes, isInitialLoading, pollingError, lastUpdated, refreshClasses } =
    useClassesPolling(3000);

  const [myHolds, setMyHolds] = useState<StudentHoldResponse[]>([]);
  const [isLoadingHolds, setIsLoadingHolds] = useState(false);
  const [highlightedHoldIds, setHighlightedHoldIds] = useState<string[]>([]);
  const [applyingClassId, setApplyingClassId] = useState<string | null>(null);
  const [confirmingHoldId, setConfirmingHoldId] = useState<string | null>(null);
  const [cancellingHoldId, setCancellingHoldId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((type: ToastItem['type'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev.slice(-2), { id, type, text }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadMyHolds = useCallback(
    async (activeStudentId: string | null) => {
      if (!activeStudentId) {
        setMyHolds([]);
        setHighlightedHoldIds([]);
        return;
      }

      setIsLoadingHolds(true);
      try {
        const holds = await admissionApi.getMyHolds();
        setMyHolds(holds);
      } catch (error) {
        const apiErr = parseApiError(error);
        pushToast('error', apiErr.message);
      } finally {
        setIsLoadingHolds(false);
      }
    },
    [pushToast],
  );

  useEffect(() => {
    let cancelled = false;

    const syncHolds = async () => {
      if (!studentId) {
        setMyHolds([]);
        setHighlightedHoldIds([]);
        setIsLoadingHolds(false);
        return;
      }

      setIsLoadingHolds(true);
      try {
        const holds = await admissionApi.getMyHolds();
        if (!cancelled) {
          setMyHolds(holds);
          setHighlightedHoldIds([]);
        }
      } catch (error) {
        if (!cancelled) {
          const apiErr = parseApiError(error);
          pushToast('error', apiErr.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHolds(false);
        }
      }
    };

    void syncHolds();

    return () => {
      cancelled = true;
    };
  }, [studentId, pushToast]);

  const classNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cls of classes) {
      map.set(cls.id, cls.name);
    }
    return map;
  }, [classes]);

  const studentClassStatusMap = useMemo(() => {
    const map = new Map<string, HoldStatus>();
    for (const hold of myHolds) {
      if (hold.status === 'CONFIRMED') {
        map.set(hold.classId, 'CONFIRMED');
      } else if (hold.status === 'HELD' && !map.has(hold.classId)) {
        map.set(hold.classId, 'HELD');
      }
    }
    return map;
  }, [myHolds]);

  const visibleActiveHolds = useMemo(() => {
    const highlightSet = new Set(highlightedHoldIds);
    return myHolds.filter((h) => h.status === 'HELD' || highlightSet.has(h.holdId));
  }, [myHolds, highlightedHoldIds]);

  const handleApply = useCallback(
    async (classId: string) => {
      if (!studentId) {
        pushToast('error', 'আবেদন করতে প্রথমে উপরে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর লিখুন।');
        return;
      }

      setApplyingClassId(classId);

      try {
        const created = await admissionApi.createHold(classId);
        const mappedHold: StudentHoldResponse = {
          holdId: created.holdId,
          classId: created.classId,
          className: classNameMap.get(created.classId) ?? created.classId,
          status: created.status,
          expiresAt: created.expiresAt,
        };

        setMyHolds((prev) => [mappedHold, ...prev]);
        setHighlightedHoldIds((prev) => [created.holdId, ...prev]);
        pushToast(
          'success',
          'আসনটি সাময়িকভাবে আপনার জন্য সংরক্ষিত হয়েছে! নির্ধারিত সময়ের মধ্যে "ভর্তি ফি দিন" বাটনে ক্লিক করে ভর্তি নিশ্চিত করুন।',
        );
        await refreshClasses();
      } catch (error) {
        const apiErr = parseApiError(error);
        pushToast('error', apiErr.message);
        await refreshClasses();
        await loadMyHolds(studentId);
      } finally {
        setApplyingClassId(null);
      }
    },
    [studentId, classNameMap, refreshClasses, loadMyHolds, pushToast],
  );

  const handleConfirm = useCallback(
    async (holdId: string) => {
      setConfirmingHoldId(holdId);

      try {
        const result = await admissionApi.confirmHold(holdId);
        setMyHolds((prev) =>
          prev.map((h) => (h.holdId === holdId ? { ...h, status: result.status } : h)),
        );
        setHighlightedHoldIds((prev) => (prev.includes(holdId) ? prev : [holdId, ...prev]));
        pushToast('success', 'ভর্তি ফি পরিশোধ সফল হয়েছে এবং আপনার ভর্তি নিশ্চিত করা হয়েছে!');
        await refreshClasses();
      } catch (error) {
        const apiErr = parseApiError(error);
        pushToast('error', apiErr.message);
        await loadMyHolds(studentId);
        await refreshClasses();
      } finally {
        setConfirmingHoldId(null);
      }
    },
    [studentId, loadMyHolds, refreshClasses, pushToast],
  );

  const handleCancel = useCallback(
    async (holdId: string) => {
      setCancellingHoldId(holdId);

      try {
        await admissionApi.cancelHold(holdId);
        setMyHolds((prev) =>
          prev.map((h) => (h.holdId === holdId ? { ...h, status: 'CANCELLED' } : h)),
        );
        setHighlightedHoldIds((prev) => prev.filter((id) => id !== holdId));
        pushToast('success', 'আবেদনটি বাতিল করা হয়েছে এবং আসনটি পুনরায় উন্মুক্ত হয়েছে।');
        await refreshClasses();
      } catch (error) {
        const apiErr = parseApiError(error);
        pushToast('error', apiErr.message);
        await loadMyHolds(studentId);
        await refreshClasses();
      } finally {
        setCancellingHoldId(null);
      }
    },
    [studentId, loadMyHolds, refreshClasses, pushToast],
  );

  const handleHoldExpired = useCallback(
    (holdId: string) => {
      setMyHolds((prev) =>
        prev.map((h) =>
          h.holdId === holdId && h.status === 'HELD' ? { ...h, status: 'EXPIRED' } : h,
        ),
      );
      setHighlightedHoldIds((prev) => (prev.includes(holdId) ? prev : [holdId, ...prev]));
      void refreshClasses();
    },
    [refreshClasses],
  );

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
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'classes'
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
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'my-holds'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>আমার আবেদন</span>
            {isValid && myHolds.length > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  activeTab === 'my-holds'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {myHolds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'admin'
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
          <div className="space-y-6">
            {visibleActiveHolds.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-base font-bold text-slate-900">
                  চলমান আবেদন ({visibleActiveHolds.length}টি)
                </h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {visibleActiveHolds.map((hold) => (
                    <ActiveHoldCard
                      key={hold.holdId}
                      hold={hold}
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                      onExpired={() => handleHoldExpired(hold.holdId)}
                      isConfirming={confirmingHoldId === hold.holdId}
                      isCancelling={cancellingHoldId === hold.holdId}
                    />
                  ))}
                </div>
              </section>
            )}

            <ClassListTable
              classes={classes}
              isInitialLoading={isInitialLoading}
              pollingError={pollingError}
              lastUpdated={lastUpdated}
              isStudentIdValid={isValid}
              studentClassStatusMap={studentClassStatusMap}
              applyingClassId={applyingClassId}
              onApply={handleApply}
              onManualRefresh={() => void refreshClasses()}
            />
          </div>
        )}

        {activeTab === 'my-holds' && (
          <MyApplicationsList
            holds={myHolds}
            isStudentIdValid={isValid}
            isLoading={isLoadingHolds}
            confirmingHoldId={confirmingHoldId}
            cancellingHoldId={cancellingHoldId}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onHoldExpired={handleHoldExpired}
            onRefresh={() => void loadMyHolds(studentId)}
            onNavigateToClasses={() => setActiveTab('classes')}
          />
        )}

        {activeTab === 'admin' && (
          <CreateClassForm
            onClassCreated={(created) => {
              void refreshClasses();
              pushToast('success', `ক্লাস "${created.name}" ক্লাস তালিকায় যুক্ত হয়েছে।`);
            }}
          />
        )}
      </main>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
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

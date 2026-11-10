import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { registerStudentIdResolver } from '../api/admissionApi';
import {
  generateDemoStudentId,
  getStoredStudentId,
  isValidStudentId,
  STUDENT_ID_LENGTH,
  STUDENT_ID_STORAGE_KEY,
} from '../utils/studentId';
import { StudentContext, type StudentContextValue } from './useStudent';

function persistStudentId(value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value) {
      window.localStorage.setItem(STUDENT_ID_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(STUDENT_ID_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or private browsing errors gracefully
  }
}

export function StudentProvider({ children }: { children: ReactNode }) {
  const [initialId] = useState<string | null>(() => getStoredStudentId());
  const [studentId, setStudentId] = useState<string | null>(initialId);
  const [draftStudentId, setDraftStudentId] = useState<string>(initialId ?? '');

  useEffect(() => {
    registerStudentIdResolver(() => studentId);
  }, [studentId]);

  const updateDraftStudentId = useCallback((rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '').slice(0, STUDENT_ID_LENGTH);
    setDraftStudentId(digitsOnly);

    if (isValidStudentId(digitsOnly)) {
      registerStudentIdResolver(() => digitsOnly);
      setStudentId(digitsOnly);
      persistStudentId(digitsOnly);
    } else {
      registerStudentIdResolver(() => null);
      setStudentId(null);
      if (digitsOnly.length === 0) {
        persistStudentId(null);
      }
    }
  }, []);

  const clearStudentId = useCallback(() => {
    registerStudentIdResolver(() => null);
    setDraftStudentId('');
    setStudentId(null);
    persistStudentId(null);
  }, []);

  const fillDemoStudentId = useCallback(() => {
    const demoId = generateDemoStudentId();
    registerStudentIdResolver(() => demoId);
    setDraftStudentId(demoId);
    setStudentId(demoId);
    persistStudentId(demoId);
  }, []);

  const value = useMemo<StudentContextValue>(
    () => ({
      studentId,
      draftStudentId,
      isValid: studentId !== null,
      updateDraftStudentId,
      clearStudentId,
      fillDemoStudentId,
    }),
    [studentId, draftStudentId, updateDraftStudentId, clearStudentId, fillDemoStudentId],
  );

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

import { createContext, useContext } from 'react';

export interface StudentContextValue {
  studentId: string | null;
  draftStudentId: string;
  isValid: boolean;
  updateDraftStudentId: (value: string) => void;
  clearStudentId: () => void;
  fillDemoStudentId: () => void;
}

export const StudentContext = createContext<StudentContextValue | undefined>(undefined);

export function useStudent(): StudentContextValue {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
}


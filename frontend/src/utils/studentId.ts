export const STUDENT_ID_STORAGE_KEY = 'school_admission_student_id';
export const STUDENT_ID_LENGTH = 17;

const STUDENT_ID_REGEX = /^\d{17}$/;

export function isValidStudentId(value: string): boolean {
  return STUDENT_ID_REGEX.test(value.trim());
}

export function getStoredStudentId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STUDENT_ID_STORAGE_KEY);
    if (stored && isValidStudentId(stored)) {
      return stored.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export function generateDemoStudentId(): string {
  const randomDigits = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
  return `2015${randomDigits}`;
}

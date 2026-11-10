export type HoldStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export interface CreateClassRequest {
  name: string;
  totalSeats: number;
}

export interface ClassResponse {
  id: string;
  name: string;
  totalSeats: number;
}

export interface ClassDetailResponse {
  id: string;
  name: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

export interface CreateHoldResponse {
  holdId: string;
  classId: string;
  studentId: string;
  status: HoldStatus;
  expiresAt: string;
}

export interface HoldDetailResponse {
  holdId: string;
  classId: string;
  status: HoldStatus;
  expiresAt: string;
}

export interface ConfirmHoldResponse {
  holdId: string;
  status: HoldStatus;
}

export interface StudentHoldResponse {
  holdId: string;
  classId: string;
  className: string;
  status: HoldStatus;
  expiresAt: string;
}

export interface ApiErrorPayload {
  error?: string;
}

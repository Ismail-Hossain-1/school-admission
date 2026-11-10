import axios from 'axios';
import { envConfig } from '../config/env';
import type {
  ClassDetailResponse,
  ClassResponse,
  ConfirmHoldResponse,
  CreateClassRequest,
  CreateHoldResponse,
  HoldDetailResponse,
  StudentHoldResponse,
} from '../types/admission';
import { getStoredStudentId } from '../utils/studentId';
import { parseApiError } from './apiError';

let studentIdResolver: () => string | null = getStoredStudentId;

export function registerStudentIdResolver(resolver: () => string | null): void {
  studentIdResolver = resolver;
}

export const apiClient = axios.create({
  baseURL: envConfig.apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const activeId = studentIdResolver();
  if (activeId && !config.headers.has('X-Student-Id')) {
    config.headers.set('X-Student-Id', activeId);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(parseApiError(error)),
);

export const admissionApi = {
  async createClass(payload: CreateClassRequest): Promise<ClassResponse> {
    const response = await apiClient.post<ClassResponse>('/classes', payload);
    return response.data;
  },

  async getClasses(): Promise<ClassDetailResponse[]> {
    const response = await apiClient.get<ClassDetailResponse[]>('/classes');
    return response.data;
  },

  async getClassById(classId: string): Promise<ClassDetailResponse> {
    const response = await apiClient.get<ClassDetailResponse>(`/classes/${encodeURIComponent(classId)}`);
    return response.data;
  },

  async createHold(classId: string): Promise<CreateHoldResponse> {
    const response = await apiClient.post<CreateHoldResponse>(
      `/classes/${encodeURIComponent(classId)}/holds`,
    );
    return response.data;
  },

  async getHoldById(holdId: string): Promise<HoldDetailResponse> {
    const response = await apiClient.get<HoldDetailResponse>(`/holds/${encodeURIComponent(holdId)}`);
    return response.data;
  },

  async confirmHold(holdId: string): Promise<ConfirmHoldResponse> {
    const response = await apiClient.post<ConfirmHoldResponse>(
      `/holds/${encodeURIComponent(holdId)}/confirm`,
    );
    return response.data;
  },

  async cancelHold(holdId: string): Promise<void> {
    await apiClient.delete(`/holds/${encodeURIComponent(holdId)}`);
  },

  async getMyHolds(): Promise<StudentHoldResponse[]> {
    const response = await apiClient.get<StudentHoldResponse[]>('/me/holds');
    return response.data;
  },
};


import { useCallback, useEffect, useRef, useState } from 'react';
import { admissionApi } from '../api/admissionApi';
import { parseApiError } from '../api/apiError';
import type { ClassDetailResponse } from '../types/admission';

interface UseClassesPollingResult {
  classes: ClassDetailResponse[];
  isInitialLoading: boolean;
  pollingError: string | null;
  lastUpdated: Date | null;
  refreshClasses: () => Promise<void>;
}

export function useClassesPolling(pollIntervalMs = 3000): UseClassesPollingResult {
  const [classes, setClasses] = useState<ClassDetailResponse[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const requestSeqRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchClasses = useCallback(async (isInitial: boolean) => {
    const requestId = ++requestSeqRef.current;

    try {
      const data = await admissionApi.getClasses();
      if (!isMountedRef.current || requestId !== requestSeqRef.current) {
        return;
      }

      setClasses(data);
      setPollingError(null);
      setLastUpdated(new Date());
    } catch (error) {
      if (!isMountedRef.current || requestId !== requestSeqRef.current) {
        return;
      }

      const apiErr = parseApiError(error);
      setPollingError(apiErr.message);
    } finally {
      if (isInitial && isMountedRef.current) {
        setIsInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const scheduleNext = async (isInitial: boolean) => {
      await fetchClasses(isInitial);
      if (!cancelled && isMountedRef.current) {
        timeoutId = window.setTimeout(() => {
          void scheduleNext(false);
        }, pollIntervalMs);
      }
    };

    void scheduleNext(true);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [fetchClasses, pollIntervalMs]);

  const refreshClasses = useCallback(async () => {
    await fetchClasses(false);
  }, [fetchClasses]);

  return {
    classes,
    isInitialLoading,
    pollingError,
    lastUpdated,
    refreshClasses,
  };
}


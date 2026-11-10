import { useEffect, useRef, useState } from 'react';

export function computeRemainingSeconds(expiresAt: string): number {
  const targetMs = Date.parse(expiresAt);
  if (Number.isNaN(targetMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

interface UseCountdownResult {
  remainingSeconds: number;
  formattedTime: string;
  isExpired: boolean;
}

export function useCountdown(
  expiresAt: string,
  isActive: boolean,
  onExpire?: () => void,
): UseCountdownResult {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    isActive ? computeRemainingSeconds(expiresAt) : 0,
  );

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let firedExpire = false;

    const updateTick = () => {
      const next = computeRemainingSeconds(expiresAt);
      setRemainingSeconds(next);

      if (next <= 0 && !firedExpire) {
        firedExpire = true;
        onExpireRef.current?.();
      }
    };

    const immediateTimer = window.setTimeout(updateTick, 0);
    const intervalId = window.setInterval(() => {
      updateTick();
      if (firedExpire) {
        window.clearInterval(intervalId);
      }
    }, 500);

    return () => {
      window.clearTimeout(immediateTimer);
      window.clearInterval(intervalId);
    };
  }, [expiresAt, isActive]);

  const effectiveRemaining = isActive ? remainingSeconds : 0;
  const isExpired = isActive && effectiveRemaining <= 0;

  return {
    remainingSeconds: effectiveRemaining,
    formattedTime: formatCountdown(effectiveRemaining),
    isExpired,
  };
}

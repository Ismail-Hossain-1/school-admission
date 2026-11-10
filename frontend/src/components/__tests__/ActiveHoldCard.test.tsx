import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentHoldResponse } from '../../types/admission';
import { ActiveHoldCard } from '../ActiveHoldCard';

describe('ActiveHoldCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions to EXPIRED and disables pay button automatically when timer reaches 00:00 without reload', () => {
    const hold: StudentHoldResponse = {
      holdId: 'h_test123',
      classId: 'c_test1',
      className: 'Class 6 - Morning Shift',
      status: 'HELD',
      expiresAt: '2026-11-10T10:00:05.000Z',
    };

    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn().mockResolvedValue(undefined);
    const onExpired = vi.fn();

    render(
      <ActiveHoldCard
        hold={hold}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onExpired={onExpired}
        isConfirming={false}
        isCancelling={false}
      />,
    );

    expect(screen.getByText('HELD · আসন সংরক্ষিত')).toBeInTheDocument();
    expect(screen.getByText('00:05')).toBeInTheDocument();

    const payBtn = screen.getByRole('button', { name: /ভর্তি ফি দিন/i });
    const cancelBtn = screen.getByRole('button', { name: /বাতিল/i });
    expect(payBtn).toBeEnabled();
    expect(cancelBtn).toBeEnabled();

    act(() => {
      vi.advanceTimersByTime(5500);
    });

    expect(screen.getByText('EXPIRED · মেয়াদ শেষ')).toBeInTheDocument();
    expect(payBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });
});

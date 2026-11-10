import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { StudentProvider } from '../../context/StudentContext';
import { STUDENT_ID_STORAGE_KEY } from '../../utils/studentId';
import { StudentHeader } from '../StudentHeader';

describe('StudentHeader', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('strips non-numeric input and shows remaining digits until 17 digits are entered', async () => {
    const user = userEvent.setup();

    render(
      <StudentProvider>
        <StudentHeader />
      </StudentProvider>,
    );

    const input = screen.getByLabelText(/শিক্ষার্থীর জন্ম নিবন্ধন নম্বর/i);
    await user.type(input, 'abc2015269123');

    expect(input).toHaveValue('2015269123');
    expect(screen.getByText(/আরও 7টি সংখ্যা দিন \(10\/17\)/i)).toBeInTheDocument();
    expect(window.localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBeNull();
  });

  it('activates identity and persists to localStorage once 17 digits are entered', async () => {
    const user = userEvent.setup();

    render(
      <StudentProvider>
        <StudentHeader />
      </StudentProvider>,
    );

    const input = screen.getByLabelText(/শিক্ষার্থীর জন্ম নিবন্ধন নম্বর/i);
    await user.type(input, '20152691234567890');

    expect(screen.getByText('পরিচয় সক্রিয়')).toBeInTheDocument();
    expect(window.localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBe('20152691234567890');

    const clearBtn = screen.getByRole('button', { name: /মুছুন/i });
    await user.click(clearBtn);

    expect(input).toHaveValue('');
    expect(window.localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBeNull();
  });
});

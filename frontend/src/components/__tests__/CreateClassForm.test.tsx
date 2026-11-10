import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { admissionApi } from '../../api/admissionApi';
import { CreateClassForm } from '../CreateClassForm';

describe('CreateClassForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows Bengali validation errors on empty or invalid submission without calling API', async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(admissionApi, 'createClass');

    render(<CreateClassForm />);

    const submitBtn = screen.getByRole('button', { name: /ক্লাস তৈরি করুন/i });
    await user.click(submitBtn);

    expect(screen.getByText('ক্লাসের নাম আবশ্যক।')).toBeInTheDocument();
    expect(
      screen.getByText('মোট আসন সংখ্যা অবশ্যই ১ বা তার বেশি পূর্ণসংখ্যা হতে হবে।'),
    ).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('submits valid class data and displays Bengali confirmation banner', async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(admissionApi, 'createClass').mockResolvedValue({
      id: 'c_mock123',
      name: 'Class 6 - Morning Shift',
      totalSeats: 120,
    });
    const onClassCreated = vi.fn();

    render(<CreateClassForm onClassCreated={onClassCreated} />);

    const nameInput = screen.getByLabelText(/ক্লাসের নাম/i);
    const seatsInput = screen.getByLabelText(/মোট আসন সংখ্যা/i);

    await user.type(nameInput, 'Class 6 - Morning Shift');
    await user.type(seatsInput, '120');
    await user.click(screen.getByRole('button', { name: /ক্লাস তৈরি করুন/i }));

    expect(createSpy).toHaveBeenCalledWith({
      name: 'Class 6 - Morning Shift',
      totalSeats: 120,
    });
    expect(screen.getByText('নতুন ক্লাস সফলভাবে তৈরি হয়েছে!')).toBeInTheDocument();
    expect(onClassCreated).toHaveBeenCalledTimes(1);
    expect(nameInput).toHaveValue('');
  });
});

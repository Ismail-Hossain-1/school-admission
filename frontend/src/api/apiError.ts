import axios from 'axios';
import type { ApiErrorPayload } from '../types/admission';

export class ApiClientError extends Error {
  readonly statusCode: number | undefined;
  readonly rawMessage: string | undefined;

  constructor(message: string, statusCode?: number, rawMessage?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.rawMessage = rawMessage;
  }
}

function translateBadRequest(raw: string | undefined): string {
  const normalized = (raw ?? '').toLowerCase();

  if (normalized.includes('already has an active hold') || normalized.includes('confirmed admission')) {
    return 'আপনি ইতিমধ্যে এই ক্লাসে একটি আবেদন করেছেন বা ভর্তি নিশ্চিত করেছেন।';
  }
  if (normalized.includes('expired')) {
    return 'দুঃখিত, আপনার আবেদনের মেয়াদ শেষ হয়ে গেছে।';
  }
  if (normalized.includes('already confirmed')) {
    return 'ভর্তি ইতিমধ্যে নিশ্চিত হয়ে যাওয়ায় আবেদনটি বাতিল করা যাবে না।';
  }
  if (normalized.includes('cancelled')) {
    return 'এই আবেদনটি ইতিমধ্যে বাতিল করা হয়েছে।';
  }
  if (normalized.includes('x-student-id') || normalized.includes('17-digit')) {
    return 'সঠিক ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর প্রদান করুন।';
  }
  if (normalized.includes('class name')) {
    return 'ক্লাসের নাম সঠিকভাবে লিখুন।';
  }
  if (normalized.includes('total seats')) {
    return 'মোট আসন সংখ্যা অবশ্যই ১ বা তার বেশি হতে হবে।';
  }

  return 'প্রদত্ত তথ্যটি সঠিক নয়। অনুগ্রহ করে তথ্য যাচাই করে আবার চেষ্টা করুন।';
}

export function parseApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    if (!error.response) {
      return new ApiClientError(
        'সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। অনুগ্রহ করে সার্ভার চালু আছে কিনা যাচাই করুন এবং পুনরায় চেষ্টা করুন।',
        undefined,
        error.message,
      );
    }

    const { status, data } = error.response;
    const rawMessage = typeof data?.error === 'string' ? data.error : error.message;

    switch (status) {
      case 409:
        return new ApiClientError('দুঃখিত, এই ক্লাসে আর কোনো আসন খালি নেই।', status, rawMessage);
      case 403:
        return new ApiClientError(
          'আপনি শুধুমাত্র আপনার নিজের আবেদন নিশ্চিত বা বাতিল করতে পারবেন।',
          status,
          rawMessage,
        );
      case 404:
        return new ApiClientError('অনুরোধকৃত ক্লাস বা আবেদনটি খুঁজে পাওয়া যায়নি।', status, rawMessage);
      case 400:
        return new ApiClientError(translateBadRequest(rawMessage), status, rawMessage);
      default:
        if (status >= 500) {
          return new ApiClientError(
            'সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
            status,
            rawMessage,
          );
        }
        return new ApiClientError(
          'অনুরোধটি সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
          status,
          rawMessage,
        );
    }
  }

  if (error instanceof Error) {
    return new ApiClientError(
      'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
      undefined,
      error.message,
    );
  }

  return new ApiClientError('একটি অজানা ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
}


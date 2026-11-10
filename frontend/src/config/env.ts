declare global {
  interface Window {
    __ENV__?: {
      VITE_API_BASE_URL?: string;
    };
  }
}

function resolveApiBaseUrl(): string {
  const runtimeUrl = typeof window !== 'undefined' ? window.__ENV__?.VITE_API_BASE_URL : undefined;
  const buildUrl = import.meta.env.VITE_API_BASE_URL;
  const raw = runtimeUrl?.trim() || buildUrl?.trim() || 'http://localhost:8080';
  return raw.replace(/\/+$/, '');
}

export const envConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
} as const;


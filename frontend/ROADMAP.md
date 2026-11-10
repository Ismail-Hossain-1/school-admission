# Frontend Engineering Roadmap: School Admission System

This document outlines the detailed development phases for the React 18 + Vite + TypeScript frontend of the School Admission System.

---

## Architecture Overview
* **Framework:** React 18+ with Vite and TypeScript
* **Language Mandate:** **All Frontend UI text must be in Bengali (বাংলা)** — including navigation labels, headings, form labels, buttons, placeholders, empty states, validation messages, and user-facing error notifications (keeping exact API status keywords like `HELD`, `CONFIRMED`, `EXPIRED`, `CANCELLED` visibly paired or styled for clarity and spec compliance).
* **Styling:** Tailwind CSS (clean, responsive, intuitive UI with clear Bengali typography support)
* **API Integration:** Axios / Fetch API with central request interceptors
* **Identity:** Persistent Student ID (17-digit birth registration number / ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর) managed in global state and `localStorage`
* **Real-time UX:** 3-second auto-polling for class seats + real-time client-side countdown timer for active holds

---

## Phase Breakdown

### Phase 1: Project Setup & Baseline Infrastructure
* **Status:** Completed ✅
* **Scope:**
  * Scaffold React 19 (18+) + TypeScript app using Vite in `/frontend`.
  * Install and configure Tailwind CSS v4 (`@tailwindcss/vite`) + `lucide-react` icons + Bengali font stack (`Hind Siliguri`, `<html lang="bn">`).
  * Setup dual runtime/build-time environment configuration (`src/config/env.ts`, `public/env-config.js`, `.env.example`) for `VITE_API_BASE_URL` defaulting to `http://localhost:8080`.

### Phase 2: Global State Management & Student ID Persistence
* **Status:** Completed ✅
* **Scope:**
  * Define strict TypeScript DTOs (`src/types/admission.ts`) mirroring all 8 backend contracts.
  * Setup Axios client (`src/api/admissionApi.ts`) with automatic `X-Student-Id` header attachment and Bengali error translator (`src/api/apiError.ts`).
  * Create `StudentContext` & `useStudent` hook (`src/context/StudentContext.tsx`, `useStudent.ts`) with zero-flicker `localStorage` persistence and 17-digit numeric validation (`src/utils/studentId.ts`).
  * Implement top Bengali Student Identity Header (`src/components/StudentHeader.tsx`) with live validation badge, demo ID helper, and clear action.

### Phase 3: Screen 1 - School Admin Class Creation (নতুন ক্লাস তৈরি)
* **Status:** Completed ✅
* **Scope:**
  * Built `CreateClassForm` (`src/components/CreateClassForm.tsx`) for school admins with Bengali UI labels ("ক্লাসের নাম", "মোট আসন সংখ্যা", "ক্লাস তৈরি করুন").
  * Form fields: Class Name (with separate-shift guidance) and Total Seats (`1`–`100,000`).
  * Client-side validation in Bengali, double-submit lock, `POST /classes` integration, and Bengali success/error banners with `onClassCreated` callback hook.
  * Added 3-tab Bengali navigation shell in `src/App.tsx`.

### Phase 4: Screen 2 - Public Class List with Live Auto-Polling (ক্লাস তালিকা)
* **Status:** Completed ✅
* **Scope:**
  * Built `ClassListTable` (`src/components/ClassListTable.tsx`) displaying class seats in Bengali ("ক্লাস ও শিফট", "মোট আসন", "হোল্ড করা", "নিশ্চিত", "খালি আসন", "কার্যক্রম") with per-class student status indicators.
  * Implemented non-stacking `useClassesPolling` hook (`src/hooks/useClassesPolling.ts`) polling `GET /classes` every 3 seconds without flicker or request overlap.
  * Implemented "আবেদন করুন" button (`POST /classes/{classId}/holds`) with `409 Conflict` Bengali error translation and immediate seat refresh.

### Phase 5: Screen 3 - Active Hold Screen with Live Countdown Timer (আবেদন)
* **Status:** Completed ✅
* **Scope:**
  * Built `ActiveHoldCard` (`src/components/ActiveHoldCard.tsx`) and `HoldStatusBadge` (`src/components/HoldStatusBadge.tsx`).
  * Implemented `useCountdown` hook (`src/hooks/useCountdown.ts`) ticking from `expiresAt` in `MM:SS` format ("মেয়াদ শেষ হতে বাকি").
  * **Zero-Reload Expiry:** Flips status badge immediately to `EXPIRED · মেয়াদ শেষ` at `00:00` and disables "ভর্তি ফি দিন" and "বাতিল" buttons immediately without page reload.
  * Integrated "ভর্তি ফি দিন" (`POST /holds/{holdId}/confirm`), "বাতিল" (`DELETE /holds/{holdId}`), and automatic active hold recovery across browser reloads via `GET /me/holds` in `src/App.tsx`.

### Phase 6: Screen 4 - "আমার আবেদন" (My Applications)
* **Status:** Completed ✅
* **Scope:**
  * Built `MyApplicationsList` (`src/components/MyApplicationsList.tsx`) listing active and finalized applications for the active Student ID via `GET /me/holds` under "আমার আবেদনসমূহ".
  * Reuses `ActiveHoldCard` for live countdown/actions on active holds and displays status badges (`HELD`, `CONFIRMED`, `EXPIRED`, `CANCELLED`) with Bengali descriptions and timestamps.
  * Automatically refreshes on student ID switch and shows total count badge on the navigation tab.

### Phase 7: Error Boundaries, Toast Notifications & UX Polish
* **Status:** Completed ✅
* **Scope:**
  * Implemented global React `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) guaranteeing zero blank pages on unexpected runtime errors.
  * Implemented auto-dismissing Bengali `ToastStack` (`src/components/ToastStack.tsx`) integrated across all portal actions.

### Phase 8: Multi-Stage Dockerfile & Containerization
* **Status:** Completed ✅
* **Scope:**
  * Created `frontend/Dockerfile` (`node:22-alpine` matching Vite 8's `>=22.12.0` engine requirement $\rightarrow$ `nginx:alpine`), `frontend/.dockerignore`, `frontend/nginx.conf` (SPA routing + no-store on `/env-config.js`), and `frontend/docker-entrypoint.sh` for runtime `VITE_API_BASE_URL` injection.

### Phase 9: Frontend Automated Component Tests (Bonus)
* **Status:** Completed ✅
* **Scope:**
  * Configured Vitest + React Testing Library + `jsdom` (`vitest.config.ts`, `src/test/setup.ts`).
  * Implemented 5 passing automated tests across `StudentHeader.test.tsx`, `ActiveHoldCard.test.tsx` (fake timer countdown $\rightarrow$ `EXPIRED` & disabled button), and `CreateClassForm.test.tsx`.


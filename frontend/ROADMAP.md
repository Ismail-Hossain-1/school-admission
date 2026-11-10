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
* **Status:** Planned
* **Scope:**
  * Create `StudentContext` for managing active student birth registration number.
  * Sync state with `localStorage` so refreshing or reopening browser preserves the session.
  * Enforce 17-digit numeric validation before dispatching requests.
  * Setup Axios API client with automatic `X-Student-Id` header attachment.

### Phase 3: Screen 1 - School Admin Class Creation (নতুন ক্লাস তৈরি)
* **Status:** Planned
* **Scope:**
  * Build Class Creation component for school admins with Bengali UI labels ("ক্লাসের নাম", "মোট আসন সংখ্যা", "ক্লাস তৈরি করুন").
  * Form fields: Class Name (e.g. `"Class 6 - Morning Shift"`) and Total Seats.
  * Front-end validation in Bengali (e.g. "আসন সংখ্যা অবশ্যই ১ বা তার বেশি হতে হবে", "ক্লাসের নাম আবশ্যক").
  * API integration: `POST /classes`.
  * Bengali success toast ("নতুন ক্লাস সফলভাবে তৈরি হয়েছে") and list refresh trigger.

### Phase 4: Screen 2 - Public Class List with Live Auto-Polling (ক্লাস তালিকা)
* **Status:** Planned
* **Scope:**
  * Display all classes in a responsive table/grid with Bengali headers: "ক্লাসের নাম", "মোট আসন", "হোল্ড করা আসন", "নিশ্চিত আসন", "খালি আসন", "কার্যক্রম".
  * Real-time seat updates: Implement `useInterval` hook polling `GET /classes` every 3 seconds without screen flickers.
  * "আবেদন করুন" button:
    * Disabled if `availableSeats <= 0` or if no valid 17-digit Student ID is set.
    * Calls `POST /classes/{classId}/holds`.
    * Handles `409 Conflict` gracefully with a clear Bengali error message ("এই ক্লাসে আর কোনো আসন খালি নেই").

### Phase 5: Screen 3 - Active Hold Screen with Live Countdown Timer (আবেদন)
* **Status:** Planned
* **Scope:**
  * Dedicated active hold card / modal with Bengali labels ("আবেদন আইডি", "ক্লাস", "বাকি সময়", "অবস্থা").
  * **Real-time Countdown Timer:**
    * Calculates remaining seconds from `expiresAt`.
    * Live ticking display (`MM:SS` with Bengali label "মেয়াদ শেষ হতে বাকি").
    * **Zero-Reload Expiry:** When the timer hits `00:00`, UI status flips to `EXPIRED` (মেয়াদ শেষ) instantly without page reload, and the "ভর্তি ফি দিন" button is disabled immediately.
  * "ভর্তি ফি দিন" button:
    * Calls `POST /holds/{holdId}/confirm`.
    * Shows immediate admission confirmed state ("ভর্তি নিশ্চিত হয়েছে").
  * "বাতিল" button:
    * Calls `DELETE /holds/{holdId}` and releases the hold.

### Phase 6: Screen 4 - "আমার আবেদন" (My Applications)
* **Status:** Planned
* **Scope:**
  * List all applications for the active Student ID via `GET /me/holds` under Bengali heading "আমার আবেদনসমূহ".
  * Displays status badges (`HELD`, `CONFIRMED`, `EXPIRED`, `CANCELLED`) with Bengali descriptions.
  * Action shortcuts on active holds ("ভর্তি ফি দিন" / "বাতিল করুন").
  * Automatically refreshes on student ID switch.

### Phase 7: Error Boundaries, Toast Notifications & UX Polish
* **Status:** Planned
* **Scope:**
  * Create friendly notification system (toast banners) strictly in Bengali:
    * Seat full (`409 Conflict`) $\rightarrow$ "দুঃখিত, এই ক্লাসে আর কোনো আসন খালি নেই।"
    * Already applied $\rightarrow$ "আপনি ইতিমধ্যে এই ক্লাসে আবেদন করেছেন বা ভর্তি নিশ্চিত করেছেন।"
    * Invalid Student ID $\rightarrow$ "সঠিক ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।"
    * Server offline $\rightarrow$ "সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। অনুগ্রহ করে পরে চেষ্টা করুন।"
    * Expired hold $\rightarrow$ "দুঃখিত, আপনার আবেদনের মেয়াদ শেষ হয়ে গেছে।"
  * Guarantee zero blank pages or console-only errors.

### Phase 8: Multi-Stage Dockerfile & Containerization
* **Status:** Planned
* **Scope:**
  * Create `frontend/Dockerfile` using multi-stage build:
    * Build stage: `node:20-alpine` (Vite build)
    * Production stage: `nginx:alpine` serving static SPA with fallback routing for React router.
  * Expose port 80 (mapped to 3000 in `docker-compose.yml`).

### Phase 9: Frontend Automated Component Tests (Bonus)
* **Status:** Planned
* **Scope:**
  * Setup Vitest + React Testing Library.
  * Test: Countdown timer reaches zero $\rightarrow$ status changes to EXPIRED and Pay button is disabled.
  * Test: Student ID input enforces 17 digits.


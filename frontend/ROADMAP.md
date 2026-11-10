# Frontend Engineering Roadmap: School Admission System

This document outlines the detailed development phases for the React 18 + Vite + TypeScript frontend of the School Admission System.

---

## Architecture Overview
* **Framework:** React 18+ with Vite and TypeScript
* **Styling:** Tailwind CSS (clean, responsive, intuitive UI)
* **API Integration:** Axios / Fetch API with central request interceptors
* **Identity:** Persistent Student ID (17-digit birth registration number) managed in global state and `localStorage`
* **Real-time UX:** 3-second auto-polling for class seats + real-time client-side countdown timer for active holds

---

## Phase Breakdown

### Phase 1: Project Setup & Baseline Infrastructure
* **Status:** Planned
* **Scope:**
  * Scaffold React 18 + TypeScript app using Vite in `/frontend`.
  * Install and configure Tailwind CSS + lucide-react icons.
  * Setup environment configuration (`VITE_API_BASE_URL` with default `http://localhost:8080`).

### Phase 2: Global State Management & Student ID Persistence
* **Status:** Planned
* **Scope:**
  * Create `StudentContext` for managing active student birth registration number.
  * Sync state with `localStorage` so refreshing or reopening browser preserves the session.
  * Enforce 17-digit numeric validation before dispatching requests.
  * Setup Axios API client with automatic `X-Student-Id` header attachment.

### Phase 3: Screen 1 - School Admin Class Creation
* **Status:** Planned
* **Scope:**
  * Build Class Creation component for school admins.
  * Form fields: Class Name (e.g. `"Class 6 - Morning Shift"`) and Total Seats.
  * Front-end validation (positive integer seats, required name).
  * API integration: `POST /classes`.
  * Success toast / feedback and list refresh trigger.

### Phase 4: Screen 2 - Public Class List with Live Auto-Polling
* **Status:** Planned
* **Scope:**
  * Display all classes in a responsive table/grid.
  * Columns: Class Name, Total Seats, Held Seats, Confirmed Seats, Available Seats, Action.
  * Real-time seat updates: Implement `useInterval` hook polling `GET /classes` every 3 seconds without screen flickers.
  * "আবেদন করুন" (Apply) button:
    * Disabled if `availableSeats <= 0` or if no valid 17-digit Student ID is set.
    * Calls `POST /classes/{classId}/holds`.
    * Handles `409 Conflict` gracefully with a clear Bengali/English error message.

### Phase 5: Screen 3 - Active Hold Screen with Live Countdown Timer
* **Status:** Planned
* **Scope:**
  * Dedicated active hold card / modal.
  * Display Hold ID, Class Name, Expiration Timestamp, and Status.
  * **Real-time Countdown Timer:**
    * Calculates remaining seconds from `expiresAt`.
    * Live ticking display (`MM:SS`).
    * **Zero-Reload Expiry:** When the timer hits `00:00`, UI status flips to `EXPIRED` instantly without page reload, and the "ভর্তি ফি দিন" (Pay Fee) button is disabled immediately.
  * "ভর্তি ফি দিন" (Pay Fee) button:
    * Calls `POST /holds/{holdId}/confirm`.
    * Shows immediate admission confirmed state.
  * "বাতিল" (Cancel) button:
    * Calls `DELETE /holds/{holdId}` and releases the hold.

### Phase 6: Screen 4 - "আমার আবেদন" (My Applications)
* **Status:** Planned
* **Scope:**
  * List all applications for the active Student ID via `GET /me/holds`.
  * Displays status badges: `HELD`, `CONFIRMED`, `EXPIRED`, `CANCELLED`.
  * Action shortcuts on active holds (Pay Fee / Cancel).
  * Automatically refreshes on student ID switch.

### Phase 7: Error Boundaries, Toast Notifications & UX Polish
* **Status:** Planned
* **Scope:**
  * Create friendly notification system (toast banners) for:
    * Seat full (`409 Conflict`) $\rightarrow$ "এই ক্লাসে আর কোনো আসন খালি নেই।"
    * Already applied $\rightarrow$ "আপনি ইতিমধ্যে এই ক্লাসে আবেদন করেছেন।"
    * Server offline $\rightarrow$ "সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না।"
    * Expired hold $\rightarrow$ "আবেদনের মেয়াদ শেষ হয়ে গেছে।"
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

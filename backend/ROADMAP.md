# Backend Engineering Roadmap: School Admission System

This document outlines the detailed development phases for the .NET 8 + PostgreSQL backend of the School Admission System.

---

## Architecture Overview
* **Framework:** .NET 8 (C#) Web API
* **Database:** PostgreSQL with Entity Framework Core + Raw SQL for row-level pessimistic locking
* **Port:** `http://localhost:8080` (strictly mandated by spec)
* **Identity:** Custom HTTP Header `X-Student-Id` containing 17 numeric digits
* **Core Invariant:** $\text{heldSeats} + \text{confirmedSeats} \le \text{totalSeats}$ guaranteed under extreme concurrency.

---

## Phase Breakdown

### Phase 1: Database Architecture, Entities & Persistence
* **Status:** Completed ✅
* **Scope:**
  * Initialize .NET 8 Web API project in `/backend`.
  * Define relational models:
    * `Class`: `Id` (`VARCHAR(64)`), `Name` (`VARCHAR(255)`), `TotalSeats` (`INT`), `CreatedAt` (`TIMESTAMPTZ`).
    * `Hold`: `Id` (`VARCHAR(64)`), `ClassId` (`VARCHAR(64)`), `StudentId` (`VARCHAR(17)`), `Status` (`VARCHAR(20)`), `ExpiresAt` (`TIMESTAMPTZ`), `CreatedAt`, `UpdatedAt`.
  * Configure `AppDbContext` using Entity Framework Core with `Npgsql`.
  * Setup PostgreSQL indexes for performance:
    * `idx_holds_class_status` on `(class_id, status)`
    * `idx_holds_student_id` on `student_id`
    * `idx_holds_expiry` on `(status, expires_at)`
  * Implement connection string injection via environment variable (`ConnectionStrings__DefaultConnection`).
  * Implement automatic database migration on startup (`Database.MigrateAsync()`) to ensure turnkey Docker execution.

### Phase 2: Core Domain Logic & Pessimistic Concurrency Engine
* **Status:** Completed ✅
* **Scope:**
  * Implement `IAdmissionService` and seat allocation logic.
  * Implement **PostgreSQL Row-Level Pessimistic Locking (`SELECT ... FOR UPDATE`)**:
    * Acquire row lock on `classes` row during hold creation inside an isolated ACID transaction.
    * Real-time calculation: Count `CONFIRMED` seats + active `HELD` seats (where `expires_at > NOW()`).
    * If `occupiedSeats >= totalSeats`, rollback transaction and return `409 Conflict`.
    * If seats are available, insert `Hold` record with `expires_at = NOW() + HOLD_DURATION_SECONDS` and commit.
  * Implement **Single Active Application Rule**:
    * Verify student has no active hold or confirmed admission in the target class.
  * Implement **Idempotent Confirmation**:
    * `POST /holds/{holdId}/confirm` locks the hold row.
    * If already `CONFIRMED`, returns `200 OK` idempotently without incrementing confirmed count.
    * Checks ownership (`X-Student-Id`) and expiry.
  * Implement **Hold Cancellation**:
    * `DELETE /holds/{holdId}` transitions status to `CANCELLED` (returns `204 No Content`).

### Phase 3: Hold Expiry Lifecycle & Background Worker
* **Status:** Pending Approval
* **Scope:**
  * **Layer 1 (Instant Release):** Ensure every query for seat availability ignores holds where `expires_at <= NOW()`. Seat is freed on the exact millisecond of expiry.
  * **Layer 2 (Background Cleaner):** Implement `HoldExpiryBackgroundService : BackgroundService`:
    * Runs every 5 seconds.
    * Executes: `UPDATE holds SET status = 'EXPIRED', updated_at = NOW() WHERE status = 'HELD' AND expires_at <= NOW();`
    * Keeps database status clean for `GET /holds/{holdId}` and `/me/holds`.

### Phase 4: API Presentation Layer & Error Boundary
* **Status:** Pending Approval
* **Scope:**
  * Implement all 8 mandated endpoints strictly matching JSON schemas and status codes:
    1. `POST /classes` (201 Created)
    2. `GET /classes` (200 OK)
    3. `GET /classes/{classId}` (200 OK)
    4. `POST /classes/{classId}/holds` (201 Created / 409 Conflict)
    5. `GET /holds/{holdId}` (200 OK)
    6. `POST /holds/{holdId}/confirm` (200 OK)
    7. `DELETE /holds/{holdId}` (204 No Content)
    8. `GET /me/holds` (200 OK)
  * Implement `X-Student-Id` validation filter (17-digit numeric regex).
  * Global Exception Handling Middleware to guarantee `4xx` responses on all validation/client errors, **never returning 500**.

### Phase 5: Automated Testing Suite & Concurrency Verification
* **Status:** Pending Approval
* **Scope:**
  * Setup xUnit test project (`backend/tests/AdmissionSystem.Tests`).
  * Test Case 1: End-to-end happy path (Create class $\rightarrow$ hold $\rightarrow$ confirm).
  * Test Case 2: Automatic expiration without API call.
  * Test Case 3: Duplicate confirm idempotency.
  * Test Case 4: Student cannot hold twice in same class.
  * **Test Case 5 (Mandatory High-Concurrency Stress Test):**
    * 5 seats vs 50 simultaneous parallel requests.
    * Assert exactly 5 succeed (`201`), 45 receive `409 Conflict`.
    * Assert database counters: `held = 5`, `available = 0`.

### Phase 6: Multi-Stage Dockerfile & Containerization
* **Status:** Pending Approval
* **Scope:**
  * Create `backend/Dockerfile` with multi-stage build:
    * Build stage: `mcr.microsoft.com/dotnet/sdk:8.0-alpine`
    * Runtime stage: `mcr.microsoft.com/dotnet/aspnet:8.0-alpine`
  * Expose port 8080 and configure environment variables.

### Phase 7: Multi-Process Concurrency Verification (Bonus)
* **Status:** Pending Approval
* **Scope:**
  * Demonstrate 2 backend processes on ports 8080 & 8081 connected to the same PostgreSQL DB.
  * Verify rule 1 holds across both instances simultaneously due to DB-level locking.


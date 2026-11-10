# Engineering Assumptions & Architectural Decisions

Where the assignment brief left implementation details open, the following reasonable assumptions and architectural safeguards were applied:

---

## 1. Domain & Validation Assumptions

1. **Class & Shift Modeling:**
   - Per §1.3 and §1.4, each class shift (e.g., `"Class 6 - Morning Shift"` and `"Class 6 - Day Shift"`) is stored and managed as an independent `Class` entity with its own `totalSeats` quota.
   - `totalSeats` is validated as a positive integer (`1` to `100,000`). Class `name` is trimmed and capped at `255` characters.

2. **Student Identity (`X-Student-Id`):**
   - Treated strictly as a **17-digit numeric string** (`^\d{17}$`), matching the Bangladeshi Birth Registration Number (BRN) standard referenced in the specification.
   - Leading/trailing header whitespace is trimmed before validation; missing or malformed headers return `400 Bad Request` (never `500`).
   - Because no login exists, the frontend persists the 17-digit ID in `localStorage` per browser so page refreshes and browser restarts preserve ongoing holds seamlessly.

3. **Re-Applying After Expiration or Cancellation:**
   - Rule 3 states a student cannot hold more than one active application or confirmed admission in the same class simultaneously.
   - Once a student's prior hold transitions to `EXPIRED` or `CANCELLED`, they are permitted to submit a new application for that class if seats are available.

4. **Cancellation & Confirmation State Transitions:**
   - Only an active, unexpired `HELD` application owned by the requesting `X-Student-Id` can be confirmed (`CONFIRMED`) or cancelled (`CANCELLED`).
   - Confirming an already `CONFIRMED` hold by its owner is idempotent (`200 OK` without incrementing `confirmedSeats`).
   - Cancelling an already `CANCELLED` hold is idempotent (`204 No Content`).
   - Attempting to confirm or cancel an `EXPIRED` hold returns `400 Bad Request`; attempting to cancel a `CONFIRMED` admission returns `400 Bad Request`; accessing another student's hold returns `403 Forbidden`.

5. **Payment Simulation:**
   - Clicking `"ভর্তি ফি দিন"` calls `POST /holds/{holdId}/confirm` directly and treats payment as immediately successful, per §1.3.

6. **Timestamps:**
   - All timestamps stored in PostgreSQL (`TIMESTAMPTZ`) and serialized in API JSON payloads use UTC ISO-8601 format (`Z`).

---

## 2. Hold Expiry Mechanism (Zero-Lag Seat Recovery)

To guarantee Rule 2 (*seats release automatically on expiration without requiring any API call*), we implemented a **dual-layer expiration model**:

1. **Layer 1 — Instant Real-Time Query Evaluation:**
   - All seat calculations (`GET /classes`, `GET /classes/{classId}`, and `POST /classes/{classId}/holds`) count only `CONFIRMED` seats plus `HELD` rows where `expires_at > NOW()`.
   - Any hold whose `expires_at` has passed releases its seat the exact millisecond it expires, independent of background job intervals.
2. **Layer 2 — Periodic Background Sweeper (`HoldExpiryBackgroundService`):**
   - A `.NET BackgroundService` using `PeriodicTimer` sweeps stale rows (`UPDATE holds SET status = 'EXPIRED' WHERE status = 'HELD' AND expires_at <= NOW()`) every `5` seconds (configurable via `HOLD_EXPIRY_CHECK_INTERVAL_SECONDS`), keeping persisted database status clean.

---

## 3. Bonus: Multi-Process Concurrency Guarantee (Rule 1)

### Why In-Memory Locks Fail
In-process synchronization primitives (`lock`, `SemaphoreSlim`) only coordinate threads inside a single .NET process. When two backend instances run on different ports (e.g., `:8080` and `:8081`) sharing the same PostgreSQL database, in-memory locks allow simultaneous requests across processes to read stale seat counts and over-allocate seats.

### How Rule 1 Is Guaranteed Across Any Number of Processes
1. **PostgreSQL Row-Level Pessimistic Locking (`SELECT ... FOR UPDATE`):**
   - Every `CreateHoldAsync` transaction acquires an exclusive row lock on the target class row:
     ```sql
     SELECT * FROM classes WHERE id = @classId FOR UPDATE;
     ```
   - Concurrent requests hitting **Process A (`8080`)** and **Process B (`8081`)** for the same class are strictly serialized by PostgreSQL at the target class row lock.
2. **Why `IsolationLevel.ReadCommitted` Is Essential:**
   - Under PostgreSQL's `READ COMMITTED` isolation level, each subsequent statement inside a transaction receives a fresh snapshot as of that statement's start time.
   - Because Process B's `COUNT(*)` query only starts *after* Process A releases the `FOR UPDATE` row lock (upon commit), Process B is mathematically guaranteed to observe Process A's newly inserted hold before evaluating `occupiedSeats >= totalSeats`.
3. **Zero Deadlock Ordering:**
   - Hold confirmations and cancellations lock individual `holds` rows (`WHERE id = @holdId FOR UPDATE`), and the background expiry sweeper updates strictly disjoint rows (`expires_at <= NOW()`).
4. **Verified via Automated Test & Compose Profile:**
   - Verified in `AdmissionApiTests.Concurrency_TwoIndependentBackendInstances_SharingSameDatabase_NeverExceedsTotalSeats` (50 concurrent requests across two isolated hosts competing for 5 seats) and runnable live with `docker compose --profile multiprocess up`.

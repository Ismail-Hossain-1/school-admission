# School Admission System (অনলাইন স্কুল ভর্তি সিস্টেম)

A high-concurrency **First Come, First Served (FCFS)** school admission and seat-hold reservation system built with **.NET 10 Web API**, **PostgreSQL 16**, **React 19 + TypeScript (Vite + Tailwind CSS)**, and **Docker Compose**.

---

## Quick Start (Docker Only)

No local .NET SDK, Node.js, or PostgreSQL installation is required—only **Docker** (with Docker Compose).

1. **Clone the repository and navigate to the project root:**
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. **Start PostgreSQL, Backend API, and Frontend UI together:**
   ```bash
   docker compose up --build
   ```

3. **Access the application:**
   - **Frontend UI (Bengali Portal):** [http://localhost:3000](http://localhost:3000)
   - **Backend REST API:** [http://localhost:8080](http://localhost:8080)
   - **Backend Health Check:** [http://localhost:8080/health](http://localhost:8080/health)

4. **Verify Data Persistence Across Restarts:**
   ```bash
   docker compose down
   docker compose up
   ```
   All classes, holds, and confirmed admissions remain intact via the `pgdata` Docker named volume.

---

## Configuration (Environment Variables)

All critical configuration values can be overridden via shell environment variables or a `.env` file alongside `docker-compose.yml`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `HOLD_DURATION_SECONDS` | `600` | Duration (in seconds) a seat remains `HELD` before expiring automatically. |
| `HOLD_EXPIRY_CHECK_INTERVAL_SECONDS` | `5` | Background sweeper polling interval (in seconds). |
| `DB_CONNECTION_STRING` | `Host=db;Port=5432;...` | Overrides PostgreSQL connection string (`ConnectionStrings__DefaultConnection`). |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend API URL injected dynamically at frontend container startup (`/env-config.js`). |

Example with a fast 30-second hold expiry for manual testing:
```bash
HOLD_DURATION_SECONDS=30 docker compose up --build
```

---

## Running Automated Tests

### 1. Backend Integration & Concurrency Tests (xUnit + PostgreSQL)

The backend test suite (`backend/tests/AdmissionSystem.Tests`) includes **7 automated tests**, including:
- 50 simultaneous barrier-synchronized hold requests competing for 5 seats (`409 Conflict` enforcement).
- Automatic hold expiration without external API calls.
- Multi-instance concurrency safety across two independent backend hosts sharing the same PostgreSQL database.
- Idempotent confirmation, ownership validation (`403`), single active application per class, and `4xx` input validation guarantees.

**Option A — Native Host (.NET SDK + Docker running for Testcontainers):**
```bash
dotnet test backend/AdmissionSystem.slnx --logger "console;verbosity=detailed"
```

**Option B — Docker Only (No .NET SDK on Host):**
Start the database container first, then execute the test suite inside the .NET SDK container attached to the Compose network:
```bash
docker compose up -d db
docker run --rm --network host -v "${PWD}:/work" -w /work -e TEST_DB_CONNECTION_STRING="Host=localhost;Port=5432;Database=school_admission_test;Username=postgres;Password=postgres" mcr.microsoft.com/dotnet/sdk:10.0 dotnet test backend/AdmissionSystem.slnx --logger "console;verbosity=detailed"
```

### 2. Frontend Component & Timer Tests (Vitest + React Testing Library)

Verifies 17-digit Student ID validation/`localStorage` persistence, zero-reload timer transition to `EXPIRED` disabling the fee payment button, and Bengali admin form validation.

**Option A — Native Host (Node 22+):**
```bash
cd frontend
npm ci
npm run lint
npm run build
npm test
```

**Option B — Docker Only (No Node.js on Host):**
```bash
docker run --rm -v "${PWD}/frontend:/app" -w /app node:22-alpine sh -c "npm ci && npm run lint && npm run build && npm test"
```

---

## Multi-Process Concurrency Bonus Mode

To run **two independent backend processes** simultaneously on ports `8080` and `8081` sharing the same PostgreSQL database:
```bash
docker compose --profile multiprocess up --build
```
- Instance 1: `http://localhost:8080`
- Instance 2: `http://localhost:8081`

Both instances enforce `heldSeats + confirmedSeats <= totalSeats` cleanly through database-level row locking (`SELECT ... FOR UPDATE`). See [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) for architectural details.

---

## Repository Structure

```text
.
├── backend/
│   ├── src/AdmissionSystem.Api/      # .NET Web API, EF Core models, migrations, services, controllers
│   ├── tests/AdmissionSystem.Tests/  # xUnit integration & concurrency tests
│   ├── Dockerfile                    # Multi-stage .NET 10 build -> runtime
│   └── ROADMAP.md                    # Backend phased implementation roadmap
├── frontend/
│   ├── src/                          # React 19 + TypeScript + Tailwind Bengali UI
│   ├── Dockerfile                    # Multi-stage Node 22 build -> Nginx with runtime env injection
│   ├── nginx.conf                    # SPA fallback + no-cache headers for env-config.js
│   └── ROADMAP.md                    # Frontend phased implementation roadmap
├── docker-compose.yml                # Single-command stack orchestration
├── ASSUMPTIONS.md                    # Domain & concurrency design decisions
├── AI_USAGE.md                       # AI tooling usage & verified corrections log
└── README.md                         # Setup, URLs, and test execution guide
```

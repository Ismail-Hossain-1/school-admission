# AI Tool Usage Report

## 1. AI Tools Used & Where Applied
* **Tool:** Google Antigravity (Gemini) coding assistant
* **Areas Used:**
  * Requirement analysis and phased roadmap planning (`backend/ROADMAP.md`, `frontend/ROADMAP.md`).
  * Backend architecture scaffolding (.NET 10 Web API, EF Core PostgreSQL schema & migrations, row-level `FOR UPDATE` concurrency logic, `PeriodicTimer` background expiry worker, global 4xx error boundary, xUnit + Testcontainers integration tests).
  * Frontend React 19 + TypeScript + Tailwind CSS Bengali UI implementation, Axios error translator, live polling/countdown hooks, Vitest component tests, and multi-stage Docker/Nginx setup.

---

## 2. Mistakes Caught & How They Were Fixed

1. **EF Core Subquery Wrapping on `FromSqlInterpolated(... FOR UPDATE)`:**
   * *Issue:* Initial code chained `.FirstOrDefaultAsync(ct)` directly onto `FromSqlInterpolated("SELECT * FROM classes WHERE id = {classId} FOR UPDATE")`. In EF Core, composing `.FirstOrDefaultAsync()` wraps the raw SQL in an outer subquery (`SELECT ... FROM (SELECT ... FOR UPDATE) LIMIT 1`).
   * *Fix:* Refactored to `.ToListAsync(ct)` followed by `.FirstOrDefault()` in C# so PostgreSQL executes the `FOR UPDATE` row lock directly on the target table without subquery wrapping.

2. **Hardcoded `UseUrls("http://0.0.0.0:8080")` Breaking Multi-Process Port Overrides:**
   * *Issue:* Hardcoding `builder.WebHost.UseUrls("http://0.0.0.0:8080")` in `Program.cs` caused `ASPNETCORE_URLS` overrides (needed when running a second backend process on port `8081` for the bonus requirement) to be ignored.
   * *Fix:* Updated `Program.cs` to apply port `8080` only as a fallback when `ASPNETCORE_URLS`, `ASPNETCORE_HTTP_PORTS`, and `--urls` are unset.

3. **EF Core Package Version Conflict in Test Project (`CS1705`):**
   * *Issue:* Referencing `Microsoft.EntityFrameworkCore.Design` `9.0.2` (with `PrivateAssets="all"`) alongside `Npgsql.EntityFrameworkCore.PostgreSQL` `9.0.4` (which pulled `9.0.1` transitively into the test project) caused compile error `CS1705` in `AdmissionSystem.Tests`.
   * *Fix:* Aligned `Microsoft.EntityFrameworkCore.Design` to `9.0.1` in `AdmissionSystem.Api.csproj` so both API and test assemblies unified cleanly with zero warnings.

4. **React Compiler / `oxlint` Violations (`refs` During Render & `set-state-in-effect`):**
   * *Issue:* Updating `activeIdRef.current` directly during render in `StudentContext.tsx` and calling `setRemainingSeconds(0)` synchronously inside `useEffect` in `useCountdown.ts` triggered React Compiler / `oxlint` warnings (`react(refs)`, `react(set-state-in-effect)`, `react(only-export-components)`).
   * *Fix:* Split `useStudent` into its own module, registered the resolver inside `useEffect` and event handlers without render-time ref mutations, and moved countdown state updates strictly into timer callbacks while deriving inactive state during render.

5. **Docker Node Engine Compatibility & Windows CRLF Shell Script Risk:**
   * *Issue:* `frontend/ROADMAP.md` initially assumed `node:20-alpine`, whereas Vite `8.3.7` strictly requires `node: "^20.19.0 || >=22.12.0"` (`package.json` `engines`). Additionally, `docker-entrypoint.sh` edited on Windows could carry CRLF (`\r\n`) endings that fail inside Alpine `/bin/sh`.
   * *Fix:* Used `node:22-alpine` in `frontend/Dockerfile` and added `sed -i 's/\r$//'` before `chmod +x` on `/docker-entrypoint.sh`.

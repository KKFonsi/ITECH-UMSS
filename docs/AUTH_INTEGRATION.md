# Supabase authentication and work-order integration

## Configuration

The active checkout is `Main/`. Configure `backend/.env` and `frontend/.env` separately using their `.env.example` files. Existing environment files are ignored by Git and are not overwritten by this implementation.

Backend configuration:

- `DATABASE_URL`: the PostgreSQL connection string from Supabase's Connect dialog. URL-encode password characters. Use the database pooler hostname here, not in `SUPABASE_URL`.
- `SUPABASE_URL`: the Auth project URL, `https://<project-ref>.supabase.co`. A copied `/rest/v1/` suffix is normalized to the project origin before constructing the Auth client.
- `SUPABASE_PUBLISHABLE_KEY`: the project's `sb_publishable_…` key. A secret/service-role key is neither needed nor accepted.
- `ALLOWED_ORIGINS`: comma-separated explicit frontend origins.
- `PG_POOL_MAX`: defaults to five connections, maximum twenty. Connection acquisition and statements have bounded timeouts.
- TLS verifies both certificate and hostname. The downloaded database CA is automatically read from `backend/certs/supabase-ca.crt`. Alternatively use `PG_CA_CERT` (PEM text) or `PG_CA_CERT_PATH` (relative to `backend/`, or absolute). Plaintext PostgreSQL is permitted only for localhost via `PGSSL_MODE=disable`.

Frontend configuration:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`: the same public Auth settings.
- `VITE_API_BASE_URL`: optional API origin. Omit it to use `/api` on the same origin. Existing `VITE_API_URL` is supported as a fallback. Development and preview proxy `/api` to port 3000.
- Restart Vite after editing its environment. Rebuild production assets after changing public deployment settings.
- Database credentials and privileged Supabase keys must never use a `VITE_` variable. The Vite configuration rejects obvious private settings and strips malformed/privileged values from the public-key setting before bundling.

## Authorization and schema

Express calls Supabase `auth.getUser(accessToken)` and then reads the safe profile fields from PostgreSQL on every protected request. The database profile determines role and active status. Neither URL query parameters, role selectors, nor JWT user metadata grant permissions. Missing or invalid sessions return 401; inactive/missing profiles and disallowed roles return 403.

Profiles are created by the existing database trigger. This application has no signup, profile-creation, or role-assignment endpoint. Provision privileged accounts through your trusted administrative process. The user-management prototype does not modify real accounts.

The SQL was aligned with the existing schema through read-only inspection:

- `work_orders`: UUID `id`, generated `ticket_number`, `location_text` and optional `location_id`, `reported_by`, `assigned_to`, `source`, timestamps and `resolved_at`.
- Database statuses: `Pending`, `In Progress`, `Resolved`; API statuses: `pending`, `in_progress`, `resolved`.
- Database priorities: `Low`, `Medium`, `High`; API priorities: `low`, `medium`, `high`.
- `work_order_updates`: `work_order_id`, verified `actor_id`, `old_status`, `new_status`, and `note`.
- `locations`: `building`, optional `room` and `floor`, `is_active`. Locations may be selected from the catalog or entered as specific free text, which the schema supports.

No tables, triggers, functions, grants, profiles, roles, or RLS policies are created or modified. All eight listed public tables were confirmed to have RLS enabled with zero policies. Business data goes through Express and the server-only PostgreSQL connection, never the browser Data API.

## API

| Endpoint | Allowed roles and behavior |
| --- | --- |
| `GET /api/healthz` | Public liveness check, unchanged |
| `GET /api/auth/me` | All four authenticated roles; safe profile only |
| `GET /api/work-orders?limit=100&offset=0` | Students: own reports; technicians: assigned reports; admins/superadmins: all reports. Maximum page size 100 |
| `POST /api/work-orders` | Student/admin/superadmin; derives reporter, source and initial status on the server |
| `PATCH /api/work-orders/:id` | Admin/superadmin: validated report fields, location, priority, assignment and status. Technician: status and notes only on assigned work orders |
| `GET /api/locations` | All four authenticated roles; active location catalog |
| `GET /api/technicians` | Admin/superadmin; safe active-technician choices |

Create bodies accept `title`, `description`, `category`, `priority`, and either `location_id` or `location`. Reporter IDs, initial status, source, role and unknown fields are rejected. Patch bodies accept only the server allowlist. Assignments must reference an active technician. Technician transitions may start or resolve a task, but may not reset it to pending. Notes must accompany a status change.

Updates lock the work-order row, check ownership while locked, validate assignment, and commit status plus history on the same checked-out connection. A history failure rolls back the status change. SQL values are parameterized. Logs do not serialize request bodies, authorization headers, SQL errors, passwords, access tokens or connection strings.

## Frontend behavior

The existing student and staff layouts remain. Email/password authentication uses the Supabase SDK; `/api/auth/me` resolves the verified dashboard. Sessions restore through `onAuthStateChange`, token refresh is handled by the SDK/API client, and an unrecoverable 401 clears the local session. The GSO student shortcut now explains technician-account access instead of accepting a simulated authenticator code.

Work orders are loaded from the API, paginated across available pages, and displayed without fallback seed reports. Students submit real maintenance reports. Staff can assign actual technician UUIDs. Technicians start and resolve their assigned orders with transaction-backed notes/history. Successful writes update the displayed data; errors are shown without claiming success.

QR reviews, room reservations, equipment requests, FAQ assistant, directory management, and audit previews remain prototype features. A visible demo notice identifies them. Their session-only activity is separated from the student's persistent maintenance reports. Demo management actions never create an Auth user or change a verified role.

## Verification

From the repository root:

```powershell
npm.cmd --prefix backend run typecheck
npm.cmd --prefix frontend run typecheck
npm.cmd --prefix backend test
npm.cmd --prefix backend run build
npm.cmd --prefix frontend run build
```

`backend/test/api.test.ts` runs real HTTP requests through Express with isolated Auth/SQL fixtures. It verifies missing/forged sessions, inactive accounts, profile-derived roles, ownership filters, reporter spoofing, invalid fields, role restrictions, cross-technician updates, assignment validation, parameterized SQL, history writes, and rollback. `backend/test/navigation.test.ts` verifies frontend role routing.

Additional browser verification against the isolated local Auth/API fixture covered:

- Email/password sign-in and keyboard submission; attempted URL role escalation remains a student session.
- Logout remains logged out after reload; authenticated sessions restore after reload.
- Submission appears again after reload; assignment and technician status updates survive reload in the fixture server.
- Expired API sessions return to sign-in.
- Staff tables at 320, 768, and 1440 pixels, plus the technician queue at 320 pixels, have no horizontal overflow.

These browser checks exercise the real Supabase SDK and application code against **test fixtures**, not the live Supabase Auth service or persistent PostgreSQL rows. The test server lives only in `backend/test/browserFixture.ts` and is excluded from the production entry and bundle. To reproduce, run `npm.cmd --prefix backend run test:browser-fixture`, then start Vite with process-only overrides pointing `VITE_SUPABASE_URL` and `VITE_API_BASE_URL` at `http://127.0.0.1:3099` and `VITE_SUPABASE_PUBLISHABLE_KEY` at `sb_publishable_browser_fixture_only`. Fixture emails are `<role>@example.test`, with password `fixture-only-password`. Never deploy the fixture server.

### Live checks

Final live verification passed against the configured Supabase development project with all four active role profiles and five campus locations. No account emails, passwords or tokens are included in this report.

| Live check | Result |
| --- | --- |
| Password login and safe /auth/me profile for all four roles | Passed |
| Missing/forged sessions | 401, as expected |
| Student POST and server-derived reporter | Passed; spoofed reporter rejected with 400 |
| Student PATCH / technician POST | 403, as expected |
| Admin assignment to active technician | Passed; student assignee rejected with 400 |
| Technician updating an unassigned/other order or restricted fields | 403, as expected |
| Technician status changes and verified-actor history | Passed |
| PostgreSQL persistence and restored Supabase session | Passed |
| Logout for all four SDK test sessions | Passed |
| Actual browser student report, admin assignment, technician start/resolution, and page reload | Passed |
| Actual browser student/admin/technician/superadmin navigation and logout | Passed |
| Health route in the production server | 200 |
| Real SQL insert/status-history transaction followed by complete rollback | Passed |
| Verification-ticket cleanup | Passed; only test-created tickets removed |

The first live login attempt returned 404 because both configured URLs included a REST endpoint suffix. Normalizing URLs to the project origin fixed the issue; a regression test covers this. Browser automation also required waiting for live network responses before checking role navigation or order rows. There are no remaining implementation failures or credential blockers from the final run.

The isolated HTTP/navigation suite contains 13 passing tests. Both frontend/backend TypeScript checks and production builds pass. The Supabase SDK is split into its own frontend chunk, so the final build has no oversized-chunk warning. The ignored test-credential file is untracked, and a scan of source files and build artifacts found no database connection string or supplied test credentials. A production smoke test also confirmed graceful shutdown after fixing forced process termination during Windows handle cleanup.

For repeatable live verification, create `backend/.env.test.local` (ignored by Git) with disposable existing accounts:

```dotenv
TEST_STUDENT_EMAIL=
TEST_STUDENT_PASSWORD=
TEST_TECHNICIAN_EMAIL=
TEST_TECHNICIAN_PASSWORD=
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
TEST_SUPERADMIN_EMAIL=
TEST_SUPERADMIN_PASSWORD=
```

Run `npm.cmd --prefix backend run test:live`. The script checks actual password login, verified profiles, session restoration, ownership, unauthorized requests, assignment, status history, PostgreSQL persistence and logout. It creates clearly titled verification tickets and removes only those tickets in cleanup. It never creates accounts, promotes roles or changes the schema. The browser reload checks above were completed against the live project as well.

## Changed files for this phase

Modified:

- `.env.example`, `README.md`
- `backend/package.json`, `backend/src/app.ts`, `backend/src/index.ts`, `backend/src/lib/logger.ts`, `backend/src/routes/index.ts`
- `frontend/vite.config.ts`, `frontend/src/components/umss/UMSS.tsx`, `frontend/src/components/umss/WorkOrderTable.tsx`

Added:

- `backend/.env.example`, `backend/src/config.ts`, `backend/src/types.ts`
- `backend/src/lib/db.ts`, `backend/src/lib/errors.ts`, `backend/src/lib/supabase.ts`
- `backend/src/middleware/auth.ts`, `backend/src/routes/auth.ts`, `backend/src/routes/workOrders.ts`, `backend/src/routes/catalog.ts`, `backend/src/services/workOrders.ts`
- `backend/test/api.test.ts`, `backend/test/navigation.test.ts`, `backend/test/browserFixture.ts`, `backend/scripts/verify-live.ts`
- `frontend/.env.example`, `frontend/src/lib/supabase.ts`, `frontend/src/lib/api.ts`, `frontend/src/lib/auth.tsx`, `frontend/src/lib/navigation.ts`, `frontend/src/lib/workOrders.tsx`
- `frontend/src/components/umss/LiveReportForm.tsx`, `frontend/src/components/umss/LiveTechnicianQueue.tsx`
- `docs/AUTH_INTEGRATION.md`

The CA certificate under `backend/certs/` was supplied during setup. Dependency additions and lockfile changes already present before this phase were preserved. `mockData.ts`, the responsive layout components, and the database schema were not changed.

## References

- [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Supabase auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase database TLS verification](https://supabase.com/docs/guides/platform/ssl-enforcement)
- [node-postgres pooling](https://node-postgres.com/apis/pool)

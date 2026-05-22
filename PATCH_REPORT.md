# Scope Connect v2 Patch Report

## Completed UI Patches
- Compared `scope-connect-v2/frontend/src` against the active `frontend/src`; the active app already contained the v2 route/component set plus newer backend integrations, so no broad replacement was done.
- Restored the v2 theme UX into the active frontend:
  - Added system/light/dark theme support in `frontend/src/hooks/use-theme.ts`.
  - Added the quick theme toggle to `frontend/src/components/site/NavbarShell.tsx`.
  - Added theme selection controls to `frontend/src/routes/settings.tsx`.
  - Updated app boot in `frontend/src/routes/__root.tsx` to apply the saved theme instead of forcing light mode.
- Preserved existing backend-backed auth, project, feed, CRM, events, opportunity, portfolio, feedback, waitlist, and reporting integrations rather than downgrading to v2 mock/localStorage behavior.

## Backend Features Implemented
- Added daily reporting persistence:
  - `backend/src/models/DailyReport.js`
  - `backend/src/models/ReportRecoveryRequest.js`
- Added report endpoints to `backend/src/routes/reports.js`:
  - `GET /api/v1/reports/my`
  - `POST /api/v1/reports`
  - `GET /api/v1/reports/team`
  - `POST /api/v1/reports/recover`
  - `PATCH /api/v1/reports/recover/:id`
- Enforced server-side IST day keys for daily report submissions.
- Added duplicate protection for one daily report per user/assignment/day and one recovery request per user/project/day.
- Added reviewer workflow for recovery requests with notification feedback to students.
- Added unversioned compatibility mounts for plan-style endpoints such as `/api/auth`, `/api/users`, `/api/projects`, `/api/reports`, and `/api/crm`.
- Added CRM stage compatibility endpoint: `PATCH /api/crm/:id/stage`.

## Existing Features Preserved
- JWT auth, refresh token handling, password reset routes, and existing frontend token storage were preserved.
- Existing `/api/v1/*` API contract remains intact.
- Existing frontend routes were not replaced with v2 mock implementations.
- Existing backend CRM, institutions, users, projects, feed, opportunities, notifications, analytics, upload, config, and public submission routes were retained.

## Routes Added or Changed
- Added report APIs listed above.
- Added unversioned aliases in `backend/src/app.js`.
- Changed institution document sharing permission from `manage_crm` to the existing `manage_partnerships` permission.
- Added `PATCH /api/v1/institutions/crm/:id/stage` and alias-compatible `/api/crm/:id/stage`.

## Models Added or Changed
- Added `DailyReport`.
- Added `ReportRecoveryRequest`.
- Exported both models from `backend/src/models/index.js`.
- Extended `Notification.kind` to allow `opportunity_application_received` and `opportunity_application_status_changed`, matching the existing opportunity application code.

## Env Vars Required
- Frontend: `VITE_API_BASE_URL` should continue pointing at the backend, currently `http://localhost:5050`.
- Backend existing env remains unchanged: `MONGODB_URI`, JWT secrets, CORS origins, SMTP settings where applicable.
- Optional backend tuning remains available: `MONGO_CONNECT_MAX_ATTEMPTS`, `MONGO_SERVER_SELECTION_TIMEOUT_MS`, `MONGO_RETRY_DELAY_MS`.

## Verification
- `npm.cmd run build` in `frontend` completed successfully.
- `npm.cmd run lint` in `backend` completed successfully (`node --check src/server.js`).
- Additional syntax checks passed for changed backend files:
  - `backend/src/app.js`
  - `backend/src/routes/reports.js`
  - `backend/src/routes/institutions.js`
  - `backend/src/models/DailyReport.js`
  - `backend/src/models/ReportRecoveryRequest.js`
  - `backend/src/models/Notification.js`
- Backend startup was verified on a spare port with `GET /api/health` returning `{"success":true,"data":{"status":"ok"}}`.

## Known Issues
- Port `5050` was already occupied during verification, so backend startup was checked on spare ports.
- Vite build reports pre-existing warnings about large chunks and a duplicate `Live Chapter` case in `frontend/src/lib/crm-store.ts`.
- Wrangler attempts to write debug logs outside the sandbox during build and prints an EPERM log-writing warning, but the Vite build exits successfully.
- A background frontend dev server could not be kept alive from this sandboxed command session, although Vite reached the "ready" state before the spawned process exited.

## Next Steps
- Add a dedicated daily reporting frontend page/workflow if product wants students to submit daily updates outside profile/project flows.
- Add scheduled penalty evaluation for missed reports once the reporting SLA and trust-score deduction rules are finalized.
- Clean up the duplicate `Live Chapter` case warning in `crm-store.ts`.
- Run browser navigation smoke tests in a persistent local terminal with backend on `5050` and frontend on a Vite port.

# Scope Connect v2 Patch Report

## Completed UI Patches
- Preserved the existing `frontend` app as the runnable frontend and kept the already-merged v2 UI surfaces from `scope-connect-v2`.
- Resolved the generated TanStack route tree conflict by preserving both v2 `/innovation-lab` and existing password recovery routes `/forgot-password` and `/reset-password`.
- Added frontend API helpers for v2-backed runtime config and challenge data.
- Updated store hydration so events, opportunities, and curated challenges can sync from backend APIs instead of staying mock-only after backend data has loaded.
- Removed localStorage submission mirrors from waitlist and feedback flows; those forms now rely on backend persistence.

## Backend Features Implemented / Patched
- Mounted existing but previously unreachable backend routers:
  - `GET/POST /api/v1/challenges`
  - `GET/PATCH /api/v1/config`
- Exported `Challenge` and `PlatformConfig` models from the central model index.
- Expanded `PlatformConfig` to store the frontend runtime config shape (`brand`, `contact`, `features`, `campuses`) without dropping operator-managed fields.
- Updated config defaults to match frontend expectations.
- Re-enabled public waitlist persistence at `POST /api/v1/public/waitlist`, including duplicate-email handling.

## Existing Features Preserved
- Existing auth/session/token flow in `frontend/src/lib/api/client.ts`.
- Existing forgot/reset password UI and backend endpoint usage.
- Existing backend-connected projects, applications, portfolio, feed, notifications, events, reports, institutions, users, and opportunities logic.
- Existing RBAC guards for protected admin config and challenge creation.

## Routes Added / Changed
- Mounted `backend/src/routes/challenges.js` at `/api/v1/challenges`.
- Mounted `backend/src/routes/config.js` at `/api/v1/config`.
- Patched `POST /api/v1/public/waitlist` to persist `PublicSubmission` records instead of returning a closed response.
- Resolved frontend route tree entries for `/innovation-lab`, `/forgot-password`, and `/reset-password`.

## Models Added / Changed
- `PlatformConfig`: changed to flexible mixed subdocuments for runtime config compatibility.
- `Challenge`: exported from `backend/src/models/index.js` so controller imports work.
- `PublicSubmission`: reused for waitlist persistence.

## Environment Variables Required
- Backend: `MONGODB_URI`, `PORT`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, optional SMTP vars for password reset email.
- Frontend: `VITE_API_BASE_URL`; when targeting the local backend, the existing Vite proxy keeps API calls relative.

## Verification
- `frontend`: `npm.cmd run build` completed successfully.
- `backend`: `npm.cmd run lint` completed successfully (`node --check src/server.js`).
- Backend startup: confirmed DB connection and Express startup with an ephemeral listen port. Normal `npm start` reached listen but port `5050` was already occupied.
- `frontend`: `npm.cmd run lint` was run but failed on repository-wide Prettier CRLF/style issues already present across many files.

## Known Issues
- Frontend build reports non-blocking Vite warnings about dynamic/static import chunking and an existing duplicate `case "Live Chapter"` in `src/lib/crm-store.ts`.
- Wrangler tries to write logs under `C:\Users\Administrator\AppData\Roaming\xdg.config\.wrangler\logs` and reports `EPERM`, but Vite still exits successfully.
- Full browser/network verification was not run in this pass because the request scope was code patch plus command-line validation.

## Next Steps
- Free or change backend port `5050` before running `npm.cmd start` normally.
- Normalize frontend line endings / Prettier formatting in a dedicated pass if lint cleanliness is required.
- Seed MongoDB with real challenge/config/opportunity records so v2 pages show live backend content immediately after login.

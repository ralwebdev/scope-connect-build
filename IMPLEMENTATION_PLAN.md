# IMPLEMENTATION PLAN — Scope Connect MERN Conversion

This document outlines the comprehensive plan to convert the Scope Connect frontend into a full-stack MERN application, ensuring all features are backed by a production-ready Node.js/Express/MongoDB environment.

## 1. Project Overview
- **Description**: Scope Connect is an Indian campus innovation network facilitating collaboration between student builders, faculty coordinators, and institution admins. It tracks project momentum, rewards participation with XP, and manages campus expansion via a CRM.
- **Main User Roles**:
    - `student`: Builder, applicant, feed contributor.
    - `faculty`: Campus coordinator, project/member reviewer.
    - `institution_admin`: Campus-level reporting and communications.
    - `scope_admin`: Platform manager, CRM operator, opportunity curator.
    - `super_admin`: Full system access, RBAC auditor, platform config.
- **Core Modules**: Workspace (Dashboard/XP), Activity Feed, Project Discovery, Builder Portfolio, Curated Opportunities, Challenges, Admin CRM.
- **Frontend Structure**: Vite + React + TanStack Router. State is managed via local-first stores (`scope-store.ts`, `crm-store.ts`, `config-store.ts`) that synchronize with the backend.

## 2. Frontend Analysis
### Pages & Routes
- **Public**: `/` (Home), `/about`, `/contact`, `/waitlist`, `/auth` (Login/Signup).
- **Core (Auth Required)**: `/dashboard` (Role-gated), `/projects` (Discovery), `/feed` (Social), `/events` (Campus events), `/portfolio` (Personal projects), `/profile` (User settings), `/campus` (Chapter hub), `/leaderboards`, `/notifications`.
- **Opportunities**: `/opportunities` (Gated marketplace for verified builders).
- **Admin CRM**: `/scope-admin` (Command center), `/scope-admin/institutions` (Lead management), `/scope-admin/mou-pipeline`, `/scope-admin/visits`.
- **System Admin**: `/admin/config` (Platform branding), `/scope-super-admin/rbac-audit`.

### Major Components
- **Reusable UI**: Radix-based components in `@/components/ui` (Buttons, Cards, Dialogs, Tables, Forms).
- **Shells**: `AppShell` (Main navigation), `LegalShell` (Policy pages).
- **Forms**: `SignupForm`, `ProjectForm`, `PortfolioItemForm`, `WaitlistForm`, `ContactForm`, `FeedbackWidget`.
- **Dashboards**: `MemberStats`, `CrmMetrics`, `InstitutionAnalytics`.

### State & Data Requirements
- **User Session**: JWT stored in `localStorage`, handled by `tokenStore` in `client.ts`.
- **Hydration**: Stores must fetch data from backend on boot/login.
- **Local-first Persistence**: UI updates immediately; backend sync happens in the background.

## 3. Backend Requirements
### Core Features
1. **Server-side XP & Streaks**:
    - **Endpoint**: `POST /api/v1/users/me/streak-tick` and `POST /api/v1/users/me/xp`.
    - **Requirement**: Prevent client-side manipulation. Verify last login date for streaks.
2. **Gated Opportunities**:
    - **Requirement**: Backend check for `opportunitiesVerified` status and XP thresholds before returning full details or allowing application.
3. **Public Lead Capture**:
    - **Requirement**: Ensure `/api/v1/public/waitlist` and `/api/v1/public/contact` are accessible without auth but rate-limited.
4. **Platform Configuration**:
    - **Requirement**: A singleton collection to store branding, feature flags, and campus lists.

## 4. MongoDB Database Design
### Key Mongoose Schemas

#### User & Profile
- **User**: `email`, `passwordHash`, `role`, `institution` (ref), `studentStatus`.
- **Profile**: `user` (ref), `bio`, `skills`, `xp`, `streakDays`, `unlockedOpportunities` (ref array).

#### Project & Application
- **Project**: `title`, `description`, `createdBy` (ref), `institution` (ref), `status`, `votes`.
- **Application**: `project` (ref), `user` (ref), `status`, `fitNote`, `submissionUrls`.

#### Opportunity & OpportunityApplication
- **Opportunity**: `title`, `company`, `minXpRequired`, `requiredSkills`.
- **OpportunityApplication**: `opportunity` (ref), `user` (ref), `profileType`, `fitNote`, `resumeUrl`.

#### CRM & Metadata
- **Institution**: `name`, `slug`, `pipelineStage`, `contactPerson`, `totalStudentXp`.
- **CrmVisit**: `institution` (ref), `owner` (ref), `date`, `status`.
- **PublicSubmission**: `kind` (waitlist/feedback/contact), `email`, `message`, `status`.
- **PlatformConfig**: `brand` (object), `features` (flags), `campuses` (string array).

## 5. REST API Plan
| Endpoint | Method | Purpose | Auth | FE Store/Page |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth/signup` | POST | Register user | No | `auth.signup` |
| `/api/v1/users/me/xp` | POST | Add XP | Yes | `xp.add` |
| `/api/v1/projects` | GET | List projects | Yes | `projects.all` |
| `/api/v1/opportunities`| GET | List opps | Yes | `opportunities.all` |
| `/api/v1/public/waitlist`| POST | Join waitlist | No | `/waitlist` |
| `/api/v1/config` | GET | Get branding | No | `configStore` |

## 6. Authentication & Authorization Plan
- **JWT Strategy**: Rotating refresh tokens. Access token (short-lived) in memory/header, Refresh token (long-lived) in `localStorage`.
- **RBAC Middleware**: `requirePermission(permission)` checks user role against a permission matrix (e.g., `manage_projects` for admins).
- **Session Persistence**: `auth.restoreSession()` calls `GET /api/v1/auth/me` on app load.

## 7. MERN Folder Structure
```
backend/
├── src/
│   ├── config/         # DB, Env, Passport
│   ├── controllers/    # Business logic (e.g., projects.controller.js)
│   ├── middleware/     # Auth, RBAC, Error, RateLimit
│   ├── models/         # Mongoose Schemas
│   ├── routes/         # Express Route definitions
│   ├── utils/          # XP Engine, Validations, Response helpers
│   └── app.js          # Express setup
frontend/
├── src/
│   ├── lib/
│   │   ├── api/        # client.ts (Fetch), endpoints.ts (API definitions)
│   │   ├── scope-store.ts # Central state
│   │   └── ...
```

## 8. Frontend Integration Plan
1. **API Client**: Ensure `client.ts` correctly handles the `/api/v1` prefix and token injection.
2. **Mock Replacement**: Replace `SEED_*` constants in `scope-store.ts` with `syncFromBackend()` calls.
3. **Form Handlers**: Transition `localStorage.setItem` in forms to `await api.post(...)`.
4. **Environment Variables**: Use `VITE_API_BASE_URL` for the API endpoint.

## 9. Implementation Roadmap
- **Phase 1: Backend Controllers**: Refactor all remaining logic from routes into controllers.
- **Phase 2: Database Schema Finalization**: Ensure all fields used in frontend (like `team_members_limit`) are in Mongoose models.
- **Phase 3: Auth Refinement**: Implement rotating refresh tokens if not fully active.
- **Phase 4: XP Engine**: Secure the XP and Streak logic on the server.
- **Phase 5: Frontend Sync**: Update all stores to use the new `endpoints.ts`.
- **Phase 6: Admin Features**: Connect the CRM and Config center to the backend.

## 10. Instructions for Codex

### Step 1: Backend Refinement
1. Refactor `backend/src/routes/projects.js`, `users.js`, and `feed.js` to use the Controller pattern.
2. Create `backend/src/utils/xp-engine.js` to handle all XP awards and streak logic server-side.
3. Ensure `PlatformConfig` model is populated with default values on startup if empty.

### Step 2: Frontend API Connection
1. In `frontend/src/lib/api/endpoints.ts`, export `backendConfig` with `get()` and `update(body)` methods.
2. In `frontend/src/lib/config-store.ts`, update `hydration.boot()` to call `syncFromBackend()`.
3. In `frontend/src/lib/scope-store.ts`, update `opportunities.syncFromBackend()` and `curated.all()` to use real data.

### Step 3: Persistence
1. Update `Waitlist.tsx`, `Contact.tsx`, and `FeedbackWidget.tsx` to use `backendPublic` endpoints.
2. Remove all `localStorage` logic for data that now lives on the backend.

## 11. Environment Variables
### Backend (.env)
- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: Secret for signing access tokens.
- `JWT_REFRESH_SECRET`: Secret for refresh tokens.
- `PORT`: 5050 (Default).

### Frontend (.env)
- `VITE_API_BASE_URL`: http://127.0.0.1:5050 (Dev).

## 12. Package Dependencies
- **Backend**: `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `zod`, `cors`, `helmet`, `morgan`, `compression`.
- **Frontend**: `tanstack/react-router`, `tanstack/react-query`, `lucide-react`, `recharts`, `radix-ui`, `zod`, `react-hook-form`.

## 13. Testing Checklist
- [ ] Verify signup/login flow with JWT.
- [ ] Verify XP award logic (Server-side check).
- [ ] Verify Project CRUD and Applications.
- [ ] Verify CRM lead management (Stage transitions).
- [ ] Verify Opportunity gating (Locked for low XP users).

## 14. Deployment Plan
- **Database**: MongoDB Atlas (Free/Shared tier).
- **API**: Host on Render/Railway. Configure CORS to allow frontend domain.
- **Frontend**: Host on Vercel or Cloudflare Pages.
- **SSL**: Ensure HTTPS for all API calls in production.

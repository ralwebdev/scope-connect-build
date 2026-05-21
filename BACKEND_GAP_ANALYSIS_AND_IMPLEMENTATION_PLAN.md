# BACKEND GAP ANALYSIS AND IMPLEMENTATION PLAN

## 1. Project Overview
- **Description**: Scope Connect is a MERN-based campus innovation network designed for builders (students), faculty coordinators, and institution/platform administrators in the Indian ecosystem. It facilitates project collaboration, challenge participation, and campus expansion tracking.
- **Frontend Structure**: React (Vite) + TanStack Router + Tailwind CSS. Component architecture uses a mix of shared UI components and role-specific views. State management is centralized in `scope-store.ts` and `crm-store.ts` using a "local-first" pattern with backend synchronization.
- **Backend Structure**: Node.js + Express + MongoDB (Mongoose). Authentication uses JWT with rotating refresh tokens. Current architecture has most logic in route files, but is transitioning to a Controller pattern.
- **Main Features/Modules**:
  - Member Dashboard & XP/Level System
  - Activity Feed & Reactions
  - Project Discovery & Applications
  - Builder Portfolio & Skills Mapping
  - Curated Challenges & Chapter Wars (Partially Mocked)
  - Opportunities Marketplace (Mocked)
  - Admin CRM for Institution Onboarding
  - RBAC (Role-Based Access Control) Audit & Management
- **User Roles**: `student`, `faculty`, `institution_admin`, `scope_admin`, `super_admin`, `viewer`.

## 2. Frontend Feature Inventory
### All Pages/Routes
- **Public**: `/`, `/about`, `/contact`, `/waitlist`, `/auth`, `/unauthorized`, `/privacy`, `/terms`.
- **Workspace (Auth Required)**: `/dashboard`, `/projects`, `/feed`, `/events`, `/portfolio`, `/profile`, `/campus`, `/leaderboards`, `/notifications`, `/settings`.
- **Institution Admin**: `/institution-admin`, `/institution-admin/members`, `/institution-admin/analytics`, `/institution-admin/communications`.
- **Scope Admin**: `/scope-admin`, `/admin`, `/admin/config`, `/admin/campuses/new`.
- **Super Admin**: `/scope-super-admin`, `/scope-super-admin/rbac-audit`, `/ops`.

### Components & Features
- **Forms**: Signup/Login, Profile Editor (Bio, Skills, Links), Portfolio Item Add/Edit, Project Creation, Waitlist Signup, Contact Form, Feedback Widget, Admin Broadcast Form, Institution Lead Form.
- **Tables/Lists**: Project List, Member Leaderboard, Campus Leaderboard, Feed Posts, Notification Center, CRM Institution Table, RBAC Audit Matrix.
- **Dashboards**: Member Stats (XP, Streak), CRM Command Center, Institution Analytics.
- **Uploads**: Avatar and cover image placeholders (Backend has `/api/upload` but frontend integration is sparse).
- **Search/Filter**: Project search, Institution CRM search, Leaderboard filtering.

### API & Data Status
- **Real API Integration**: Auth (login/signup), Users (profile update), Notifications (list/read), Projects (list/create/apply), Feed (list/post/react), Portfolio Items (CRUD), Institutions (public list/CRM).
- **Mock/Static Data**:
  - `opportunities.all()` in `scope-store.ts` (Marketplace items).
  - `curated.all()` in `scope-store.ts` (Curated challenges).
  - `upcomingEvents` in `mock-data.ts`.
  - `testimonials` and `liveMetrics` in `mock-data.ts`.
  - Waitlist, Feedback, and Contact form submissions (currently saved to `localStorage` or toast-only).
  - `configStore` (Platform branding/features) is `localStorage` only.

## 3. Backend Inventory
### Existing Components
- **Routes**: `auth.js`, `users.js`, `institutions.js`, `projects.js`, `notifications.js`, `analytics.js`, `feed.js`, `upload.js`, `health.js`, `events.js`, `portfolio-items.js`.
- **Models**: `User`, `Profile`, `Institution`, `Project`, `Application`, `Notification`, `Event`, `PortfolioItem`, `PortfolioLink`, `FeedPost`, `AnalyticsEvent`, `CrmVisit`, `LaunchChecklist`, `Session`, `FileAsset`, `ProfileActivity`.
- **Middleware**: `auth.js` (JWT), `rbac.js` (Permissions), `rate-limit.js`, `error-handler.js`, `request-id.js`, `validate.js` (Zod).
- **Controllers**: `portfolio-items.controller.js` (The only feature using the clean controller pattern).

## 4. Frontend-to-Backend Mapping

| Frontend Page/Component | Feature/Action | Required Backend API | Existing Backend API? | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/opportunities` | View/Save Opps | `GET /api/opportunities` | No | Missing | Currently uses `SEED_OPPS` |
| `/challenges` | View Challenges | `GET /api/challenges` | No | Missing | Currently uses `SEED_CURATED` |
| `/waitlist` | Submit Waitlist | `POST /api/waitlist` | No | Frontend-only | Saves to `localStorage` |
| `/contact` | Submit Inquiry | `POST /api/contact` | No | Frontend-only | Toast only |
| `/feedback` | Submit Feedback | `POST /api/feedback` | No | Frontend-only | Saves to `localStorage` |
| `/admin/config` | Update Branding | `PATCH /api/config` | No | Frontend-only | Saves to `localStorage` |
| `/dashboard` | XP/Streak Tick | `POST /api/users/me/tick` | Partial | Needs validation | XP logic in FE; backend has fields |
| `/events` | RSVP to Event | `POST /api/events/:id/rsvp`| No | Missing | `localStorage` RSVPs |
| `/scope-admin` | Upsert Admin | `POST /api/admin/admins` | No | Missing | `crm.upsertAdmin` is FE-only |
| `/feed` | Comment on Post | `POST /api/feed/:id/comment`| Yes | Complete | |

## 5. Missing Backend Components
### New Routes & Controllers
- **Waitlist**: `POST /api/waitlist` (Public) - For capturing leads.
- **Contact**: `POST /api/contact` (Public) - For inquiries.
- **Feedback**: `POST /api/feedback` (Authed) - For user suggestions.
- **Opportunities**: `GET /api/opportunities`, `POST /api/opportunities` (Admin) - Full CRUD.
- **Challenges**: `GET /api/challenges`, `POST /api/challenges` (Admin) - Full CRUD.
- **Platform Config**: `GET /api/config`, `PATCH /api/config` (Super Admin) - For branding/feature toggles.

### Logic Requirements
- **XP/Streak Sync**: A dedicated service to handle XP awards and streak increments on the server to prevent local manipulation.
- **Event RSVPs**: Needs a join table/model to track which users are attending which events.
- **Admin Management**: Endpoints to manage the `admins` array currently returned in the CRM payload.

## 6. Database Gap Analysis
### Missing Models
- **Waitlist**: `email`, `name`, `campus`, `interests[]`, `at`.
- **ContactMessage**: `name`, `email`, `reason`, `message`, `status` (open/resolved).
- **Feedback**: `user` (ref), `rating`, `type`, `text`, `status`.
- **Opportunity**: `title`, `by`, `campus`, `category`, `description`, `matchScore` (base).
- **Challenge**: `scope` (campus/global), `title`, `category`, `difficulty`, `seatsTotal`, `seatsFilled`, `reward`.
- **PlatformConfig**: Singleton model for `brand`, `contact`, `features`, `campuses`.
- **EventRSVP**: `user` (ref), `event` (ref).

### Schema Adjustments
- **Profile**: Ensure `xp`, `level`, and `streakDays` are updated via server-side events, not just patches from the frontend.
- **Institution**: Add `email` and `phone` if not already present in the Mongoose model (synced with `crm-store.ts`).

## 7. API Gap Analysis

| Method | Endpoint | Purpose | Exists? | Controller? | Model? | FE Connected? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/waitlist` | Lead capture | No | No | No | No |
| POST | `/api/contact` | Support inquiries | No | No | No | No |
| POST | `/api/feedback` | User feedback | No | No | No | No |
| GET | `/api/opportunities`| List marketplace | No | No | No | No (Mock) |
| GET | `/api/challenges` | List challenges | No | No | No | No (Mock) |
| GET | `/api/config` | Platform settings | No | No | No | No (LS) |
| POST | `/api/events/:id/rsvp`| Attend event | No | No | Yes | No (LS) |

## 8. Auth & Authorization Gap Analysis
- **Current State**: Backend uses `authMiddleware` for identity and `requirePermission` for RBAC.
- **Gaps**:
  - New public routes (`/waitlist`, `/contact`) need to be explicitly excluded from auth.
  - New admin routes (`/config`, `/challenges` creation) need `manage_features` or `manage_projects` permissions.
  - Role-based visibility for `Opportunities` (e.g., student-only) needs backend enforcement.

## 9. Frontend Integration Gap Analysis
- **Service Layer**: `frontend/src/lib/api/endpoints.ts` needs new methods for all missing APIs.
- **Store Sync**:
  - `scope-store.ts`: Replace `SEED_OPPS`, `SEED_CURATED`, and `SEED_EVENTS` with `async` fetchers.
  - `config-store.ts`: Replace `localStorage` logic with a backend fetch in `hydration.boot()`.
  - `crm-store.ts`: Add `upsertAdmin` and `setAdminStatus` API calls.
- **Forms**: Update `Waitlist`, `Contact`, and `Feedback` components to use the `api` client instead of `localStorage`.

## 10. Implementation Plan

### Phase 1: Backend Foundation Fixes
- Create `backend/src/controllers` structure for all modules.
- Refactor existing routes (Users, Projects, Feed) to use Controllers.
- Implement the `PlatformConfig` singleton model and GET/PATCH endpoints.

### Phase 2: Missing Database Models
- Create models for `Waitlist`, `ContactMessage`, `Feedback`.
- Create models for `Opportunity` and `Challenge`.
- Create `EventRSVP` join model.

### Phase 3: Missing API Routes/Controllers
- Implement `WaitlistController`, `ContactController`, `FeedbackController`.
- Implement `OpportunityController` and `ChallengeController`.
- Implement `EventRSVP` logic in `EventsController`.

### Phase 4: Auth & Authorization Completion
- Verify all new admin routes have `requirePermission` middleware.
- Ensure public routes are accessible without tokens.

### Phase 5: Frontend API Integration
- Update `backendAuth`, `backendUsers`, etc. in `endpoints.ts`.
- Refactor `scope-store.ts` to hydrate `opportunities`, `challenges`, and `events` from backend.
- Connect `Waitlist.tsx`, `Contact.tsx`, and `Feedback.tsx` to backend.

### Phase 6: Validation & Error Handling
- Add Zod schemas for all new POST/PATCH bodies.
- Ensure consistent error response format across all new controllers.

### Phase 7: Testing
- Run `npm run test:integration` (backend).
- Verify data persistence for all forms.
- Manual RBAC testing for admin routes.

### Phase 8: Deployment Readiness
- Ensure all environment variables (`MONGODB_URI`, etc.) are documented.
- Run `npm run build` for both Frontend and Backend.

## 11. Instructions for Codex
### Core Directives
1. **Controller Pattern**: Do not add logic to `routes/*.js`. Create a matching file in `controllers/*.controller.js` and call it from the route.
2. **Preserve UI**: Do not change the Tailwind classes or Radix components in the frontend. Only change the data-fetching logic and state hydration.
3. **Mock Replacement**: Systematically replace `SEED_*` constants in `scope-store.ts` with backend data. Use the `mapBackend...` pattern already present for Projects/Notifications.
4. **Validation**: Use `backend/src/utils/validate.js` with Zod schemas for every new endpoint.
5. **Auth**: Always use `authMiddleware` for protected resources and `requirePermission` for any action involving `institution_admin` or above.

## 12. Final Checklist
- [ ] All forms (Waitlist, Contact, Feedback) save to MongoDB.
- [ ] Opportunities and Challenges are dynamic and admin-manageable.
- [ ] Platform Config (branding/features) persists in the database.
- [ ] XP and Streaks have server-side verification/increments.
- [ ] Event RSVPs are tracked per-user in the database.
- [ ] All admin actions are protected by RBAC middleware.
- [ ] Frontend uses real API calls for all features previously using mock data.

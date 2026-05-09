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

### Waitlist
- **Required Route**: `POST /api/waitlist`
- **HTTP Method**: `POST`
- **Controller Function**: `WaitlistController.create`
- **Mongoose Model/Schema Needed**: `Waitlist`
- **Request Body**: `{ name: string, email: string, campus: string, interests: string[] }`
- **Response Body**: `{ success: true, data: { id, name, email, campus, interests, at } }`
- **Auth Requirement**: None (Public)
- **Validation Rules**: Zod schema validating email format, name min length, campus required.
- **Error Handling**: 400 for validation errors, 409 for duplicate emails.
- **Related Frontend File**: `frontend/src/routes/waitlist.tsx`

### Contact Inquiry
- **Required Route**: `POST /api/contact`
- **HTTP Method**: `POST`
- **Controller Function**: `ContactController.submit`
- **Mongoose Model/Schema Needed**: `ContactMessage`
- **Request Body**: `{ name: string, email: string, reason: string, message: string }`
- **Response Body**: `{ success: true, message: "Inquiry received" }`
- **Auth Requirement**: None (Public)
- **Validation Rules**: Zod schema validating email format, message min 10 chars.
- **Error Handling**: 400 for validation errors.
- **Related Frontend File**: `frontend/src/routes/contact.tsx`

### User Feedback
- **Required Route**: `POST /api/feedback`
- **HTTP Method**: `POST`
- **Controller Function**: `FeedbackController.create`
- **Mongoose Model/Schema Needed**: `Feedback`
- **Request Body**: `{ rating: number, type: string, text: string }`
- **Response Body**: `{ success: true, data: { id, rating, type, text, status, user_id } }`
- **Auth Requirement**: JWT Required
- **Validation Rules**: Rating 1-5, type enum, text min 10 chars.
- **Error Handling**: 401 Unauthenticated, 400 Validation.
- **Related Frontend File**: `frontend/src/routes/feedback.tsx`

### Opportunities Marketplace
- **Required Route**: `GET /api/opportunities`, `POST /api/opportunities`
- **HTTP Method**: `GET`, `POST`
- **Controller Function**: `OpportunityController.list`, `OpportunityController.create`
- **Mongoose Model/Schema Needed**: `Opportunity`
- **Request Body (POST)**: `{ title, by, campus, category, description, matchScore }`
- **Response Body (GET)**: `{ success: true, data: { items: Opportunity[] } }`
- **Auth Requirement**: GET (Authed User), POST (Scope Admin)
- **Validation Rules**: Zod schema for required fields.
- **Error Handling**: 403 Forbidden for non-admins on POST.
- **Related Frontend File**: `frontend/src/routes/opportunities.tsx`

### Curated Challenges
- **Required Route**: `GET /api/challenges`, `POST /api/challenges`
- **HTTP Method**: `GET`, `POST`
- **Controller Function**: `ChallengeController.list`, `ChallengeController.create`
- **Mongoose Model/Schema Needed**: `Challenge`
- **Request Body (POST)**: `{ scope, title, category, difficulty, seatsTotal, reward, description }`
- **Response Body (GET)**: `{ success: true, data: { items: Challenge[] } }`
- **Auth Requirement**: GET (Authed User), POST (Scope Admin)
- **Validation Rules**: Zod schema for required fields.
- **Error Handling**: 403 Forbidden for non-admins on POST.
- **Related Frontend File**: `frontend/src/routes/challenges.tsx`

### Platform Config
- **Required Route**: `GET /api/config`, `PATCH /api/config`
- **HTTP Method**: `GET`, `PATCH`
- **Controller Function**: `ConfigController.get`, `ConfigController.update`
- **Mongoose Model/Schema Needed**: `PlatformConfig`
- **Request Body (PATCH)**: `{ brand: Partial<BrandConfig>, features: Partial<FeatureFlags>, campuses: CampusEntry[] }`
- **Response Body**: `{ success: true, data: RuntimeConfig }`
- **Auth Requirement**: GET (Public/Authed), PATCH (Super Admin)
- **Validation Rules**: Strict Zod schema for config structure.
- **Error Handling**: 403 Forbidden for non-super-admins on PATCH.
- **Related Frontend File**: `frontend/src/routes/admin.config.tsx`

## 6. Database Gap Analysis

### Existing Models
- `User`, `Profile`, `Institution`, `Project`, `Application`, `Notification`, `Event`, `PortfolioItem`, `PortfolioLink`, `FeedPost`, `AnalyticsEvent`, `CrmVisit`, `LaunchChecklist`, `Session`, `FileAsset`, `ProfileActivity`.

### Missing Models
- **Waitlist**: For lead capture.
  - *Indexes*: `{ email: 1 }` (Unique).
  - *Example*: `{ name: "John Doe", email: "john@example.com", campus: "IITB", interests: ["AI", "Web3"], at: Date }`
- **ContactMessage**: For tracking support/partnership inquiries.
  - *Indexes*: `{ status: 1, createdAt: -1 }`.
  - *Example*: `{ name: "Admin", email: "admin@college.edu", reason: "Campus partnership", message: "Interested in launching...", status: "open" }`
- **Feedback**: For user-submitted improvement suggestions.
  - *Indexes*: `{ user: 1, type: 1 }`.
  - *Example*: `{ user: ObjectId, rating: 5, type: "Bug report", text: "Profile sync failed once.", status: "pending" }`
- **Opportunity**: For the builder marketplace.
  - *Indexes*: `{ category: 1, matchScore: -1 }`.
  - *Example*: `{ title: "UI Designer", by: "HealthTech", campus: "IITB", category: "Design", description: "...", matchScore: 92 }`
- **Challenge**: For curated platform/campus challenges.
  - *Indexes*: `{ scope: 1, status: 1 }`.
  - *Example*: `{ scope: "global", title: "AI Planner", reward: 300, difficulty: "Advanced", status: "live" }`
- **PlatformConfig**: Singleton for dynamic branding and feature flags.
  - *Example*: `{ brand: { name: "Scope Connect" }, features: { feed: true, projects: true }, campuses: [...] }`
- **EventRSVP**: Join model for user-event attendance.
  - *Indexes*: `{ user: 1, event: 1 }` (Unique).
  - *Example*: `{ user: ObjectId, event: ObjectId, at: Date }`

### Schema Gaps
- **Profile**: Missing strict server-side validation for `xp` and `level` (should not be directly patchable).
- **Institution**: Needs `email` and `phone` fields to match CRM requirements.
- **User**: Add `lastLoginAt` for better streak tracking verification.

## 7. API Gap Analysis

| Method | Endpoint | Purpose | Exists? | Controller Exists? | Model Exists? | Frontend Connected? | Required Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/waitlist` | Lead capture | No | No | No | No | Create model, controller, route |
| POST | `/api/contact` | Support inquiries | No | No | No | No | Create model, controller, route |
| POST | `/api/feedback` | User feedback | No | No | No | No | Create model, controller, route |
| GET | `/api/opportunities`| List marketplace | No | No | No | No (Mock) | Create model, controller, route, connect FE |
| GET | `/api/challenges` | List challenges | No | No | No | No (Mock) | Create model, controller, route, connect FE |
| GET | `/api/config` | Platform settings | No | No | No | No (LS) | Create model, controller, route, connect FE |
| POST | `/api/events/:id/rsvp`| Attend event | No | No | Yes | No (LS) | Create join model, controller logic |
| POST | `/api/users/me/tick`| XP/Streak update | No | No | Yes | No (FE-only) | Create secure server-side logic |

## 8. Auth & Authorization Gap Analysis
- **JWT backend exists**: Uses `access_token` and `refresh_token` in `localStorage`.
- **Role-based Access Control (RBAC)**: Middleware `requirePermission` exists but is not consistently applied to all routes.
- **Gaps**:
  - New public routes (`/waitlist`, `/contact`) must bypass `authMiddleware`.
  - `Opportunities` should be filtered by role (e.g., student-only) at the database query level.
  - Admin management in CRM (`crm.upsertAdmin`) is currently frontend-only and needs a backend counterpart with `manage_users` permission.

## 9. Frontend Integration Gap Analysis
- **API Client**: `frontend/src/lib/api/client.ts` is solid.
- **Endpoints**: `frontend/src/lib/api/endpoints.ts` needs a major update to include all missing CRUD operations.
- **State Hydration**:
  - `scope-store.ts` needs to move from `SEED_*` constants to `async` fetchers during `restoreSession` or app boot.
  - `config-store.ts` should fetch from `/api/config` instead of relying solely on `platform-config.ts` defaults.
- **Components**: `Waitlist.tsx`, `Contact.tsx`, and `Feedback.tsx` need to call the API and handle loading/error states.

## 10. Implementation Plan

### Phase 1: Backend Foundation Fixes
- **Task 1.1**: Create `backend/src/controllers` directory and structure.
  - *Files*: `controllers/auth.controller.js`, `controllers/user.controller.js`, etc.
  - *Purpose*: Separation of concerns.
  - *Priority*: High | *Dependencies*: None
- **Task 1.2**: Refactor existing routes to use Controllers.
  - *Files*: `routes/users.js`, `routes/projects.js`, `routes/feed.js`.
  - *Purpose*: Architectural consistency.
  - *Priority*: Medium | *Dependencies*: 1.1
- **Task 1.3**: Implement secure XP/Streak Service.
  - *Files*: `services/gamification.service.js`.
  - *Purpose*: Prevent XP manipulation from frontend.
  - *Priority*: High | *Dependencies*: None

### Phase 2: Missing Database Models
- **Task 2.1**: Create models for Waitlist, Contact, Feedback.
  - *Files*: `models/Waitlist.js`, `models/ContactMessage.js`, `models/Feedback.js`.
  - *Priority*: High | *Dependencies*: None
- **Task 2.2**: Create models for Opportunity, Challenge.
  - *Files*: `models/Opportunity.js`, `models/Challenge.js`.
  - *Priority*: High | *Dependencies*: None
- **Task 2.3**: Create `EventRSVP` and `PlatformConfig` models.
  - *Files*: `models/EventRSVP.js`, `models/PlatformConfig.js`.
  - *Priority*: Medium | *Dependencies*: None

### Phase 3: Missing API Routes/Controllers
- **Task 3.1**: Implement Public Controllers (Waitlist, Contact).
  - *Files*: `controllers/waitlist.controller.js`, `controllers/contact.controller.js`.
  - *Priority*: High | *Dependencies*: 2.1
- **Task 3.2**: Implement Marketplace Controllers (Opportunity, Challenge).
  - *Files*: `controllers/opportunity.controller.js`, `controllers/challenge.controller.js`.
  - *Priority*: High | *Dependencies*: 2.2
- **Task 3.3**: Implement Config & Event RSVP Controllers.
  - *Files*: `controllers/config.controller.js`, `controllers/event.controller.js`.
  - *Priority*: Medium | *Dependencies*: 2.3

### Phase 4: Auth and Authorization Completion
- **Task 4.1**: Audit and apply `requirePermission` to all admin routes.
  - *Files*: `routes/admin.js`, `routes/institutions.js`.
  - *Priority*: High | *Dependencies*: 3.2
- **Task 4.2**: Implement Role-based visibility filtering in controllers.
  - *Files*: `controllers/opportunity.controller.js`.
  - *Priority*: Medium | *Dependencies*: 3.2

### Phase 5: Frontend API Integration
- **Task 5.1**: Update `lib/api/endpoints.ts` with new backend methods.
  - *Files*: `frontend/src/lib/api/endpoints.ts`.
  - *Priority*: High | *Dependencies*: Phase 3
- **Task 5.2**: Refactor `scope-store.ts` for async hydration.
  - *Files*: `frontend/src/lib/scope-store.ts`.
  - *Priority*: High | *Dependencies*: 5.1
- **Task 5.3**: Connect form components to API.
  - *Files*: `Waitlist.tsx`, `Contact.tsx`, `Feedback.tsx`.
  - *Priority*: Medium | *Dependencies*: 5.1

### Phase 6: Validation and Error Handling
- **Task 6.1**: Implement Zod schemas for all new inputs.
  - *Files*: `backend/src/utils/validate.js`.
  - *Priority*: High | *Dependencies*: Phase 3
- **Task 6.2**: Add global error handlers for unique database constraints.
  - *Files*: `backend/src/middleware/error-handler.js`.
  - *Priority*: Medium | *Dependencies*: None

### Phase 7: Testing
- **Task 7.1**: Write integration tests for new endpoints.
  - *Files*: `backend/src/scripts/integration-test.js`.
  - *Priority*: High | *Dependencies*: Phase 3
- **Task 7.2**: End-to-end flow testing for student and admin roles.
  - *Priority*: High | *Dependencies*: Phase 5

### Phase 8: Deployment Readiness
- **Task 8.1**: Environment variable documentation and validation.
  - *Files*: `backend/.env.example`.
  - *Priority*: Medium | *Dependencies*: None

## 11. Instructions for Codex
### Core Directives
1. **Do not rewrite working code unnecessarily**: If a model like `User` works, only add missing fields.
2. **Preserve existing frontend UI**: Maintain all Tailwind styles and Radix UI structures.
3. **Controller Pattern**: Every new route must have a matching controller in `backend/src/controllers`.
4. **Validation**: Use `backend/src/utils/validate.js` for all incoming POST/PATCH data.
5. **Sync Logic**: When replacing mock data in `scope-store.ts`, ensure you use the `writeNow` or `write` helpers to maintain compatibility with the existing local state engine.
6. **Error States**: Ensure frontend forms show toast errors returned from the backend.

## 12. Final Checklist
- [ ] Backend APIs: All mocked features have real endpoints.
- [ ] MongoDB schemas: All new models are defined with correct types and indexes.
- [ ] Auth: Public routes are open, admin routes are gated by RBAC.
- [ ] Frontend integration: All `SEED_*` data is replaced with API calls.
- [ ] Environment variables: `.env` is updated for new features.
- [ ] Testing: Integration tests pass for all new routes.
- [ ] Deployment: Build scripts run successfully for both apps.

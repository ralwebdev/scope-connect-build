# Scope Connect Implementation Audit

Date: 2026-06-13
Workspace: `d:\RAL Website\Scope Connect\scope-connect-build`

## Scope and method

This audit was done by tracing code paths, not by assuming behavior:

`Frontend route/component -> frontend API client/store -> backend route -> controller/route handler -> Mongoose model/query`

What was verified:

- Frontend route inventory, major workflows, and state sources
- Shared frontend API layer in `frontend/src/lib/api/endpoints.ts`
- Local-only stores in `frontend/src/lib/scope-store.ts`, `frontend/src/lib/crm-store.ts`, and `frontend/src/lib/config-store.ts`
- Mounted backend routers in `backend/src/app.js`
- Backend route files, controllers, serializers, DB models, auth, and validation

What was not fully runtime-verified:

- I did not stand up MongoDB/Redis and execute the app against live data in this session.
- Therefore "database status" below means "code path is wired to Mongoose models" unless explicitly marked as runtime-verified.

## Executive findings

### Critical / high-risk findings

1. Department management is under-protected.
   - File: `backend/src/routes/departments.js`
   - Problem: `POST /api/v1/departments`, `PATCH /api/v1/departments/:id`, and `DELETE /api/v1/departments/:id` have `authMiddleware` only and no role/permission middleware or Zod validation.
   - Impact: any authenticated user tied to an institution can create, update, or delete departments for that institution.
   - Status: implemented, but insecure.

2. Link checking endpoint is an SSRF risk.
   - File: `backend/src/routes/public.js`
   - Route: `GET /api/v1/public/check-link`
   - Problem: server performs `fetch(urlString)` against arbitrary user-supplied URLs.
   - Impact: backend can be used to probe internal/private network targets.
   - Status: implemented, but unsafe.

### Major implementation gaps

1. Ambassador application UI is wired, but backend behavior is intentionally disabled.
   - Frontend: `frontend/src/routes/ambassador.tsx`
   - Backend: `backend/src/routes/public.js`
   - Route: `POST /api/v1/public/ambassador`
   - Actual behavior: always returns HTTP 403 with "Ambassador registration is currently closed."
   - Audit status: `NOT IMPLEMENTED` for live submissions.

2. Challenge UI is not connected to the backend challenge system.
   - Frontend: `frontend/src/routes/challenges.tsx`
   - Backend exists: `backend/src/routes/challenges.js`, `backend/src/controllers/challenges.controller.js`, models `Challenge` and `ChallengeParticipation`
   - Frontend behavior: weekly challenges are computed locally from `scope-store`, localStorage, and mock chapter data.
   - Audit status: frontend `NOT IMPLEMENTED` against backend.

3. Several admin-facing pages are demo/local-only.
   - Local/demo routes:
     - `frontend/src/routes/admin.tsx`
     - `frontend/src/routes/ops.tsx`
     - `frontend/src/routes/campus-leader.tsx`
     - `frontend/src/routes/announcements.tsx`
     - `frontend/src/routes/updates.tsx`
     - `frontend/src/routes/u.$handle.tsx`
   - These pages rely on localStorage, seeded data, or hardcoded arrays instead of backend APIs.

4. Settings is only partially real.
   - File: `frontend/src/routes/settings.tsx`
   - Real: account name/email/phone save through `auth.updateProfile()`
   - Not real: notification preferences, premium waitlist, and "danger zone" are local UI actions only.

5. Public/campus/project views mix real data with mock fallback data.
   - `frontend/src/routes/campus.tsx`: real top campuses are padded with `campusPartners` mock entries.
   - `frontend/src/routes/projects.tsx`: if backend global projects are empty, page falls back to `featuredProjects` mock seeds.
   - `frontend/src/routes/institution-admin.tsx`: retains localStorage fallbacks and dead member seed helpers beside live API flows.

6. Service layer is mostly absent.
   - Most backend route files talk directly to Mongoose models.
   - The only clear reusable service layer is notification dispatch in `backend/src/services/notification-dispatcher.js`.
   - Audit implication: business logic is spread across routers/controllers, which increases regression risk.

### Dead / legacy backend code

- `backend/src/routes/contact.js`
- `backend/src/routes/feedback.js`
- `backend/src/routes/waitlist.js`

These route files exist but are not mounted in `backend/src/app.js`. The live app uses `backend/src/routes/public.js` instead.

## Step 1: Frontend inventory

### Registered routes

- Registered routes found: 59
- Backend-connected route modules: 19
- Mixed route modules: 10
- Local-only/static route modules: 30

### Interactive route inventory

| Page / Route | File | Feature summary | API used | State source | Mock/local data | CRUD / workflow status |
| --- | --- | --- | --- | --- | --- | --- |
| `/auth` | `frontend/src/routes/auth.tsx` | Login/signup | `backendAuth` via `auth` store | `scope-store` + local component state | No | Create account + login live |
| `/forgot-password` | `frontend/src/routes/forgot-password.tsx` | Password reset request | `backendAuth.forgotPassword` | local state | No | Live |
| `/reset-password` | `frontend/src/routes/reset-password.tsx` | Reset password with token | `backendAuth.resetPassword` | local state | No | Live |
| `/contact` | `frontend/src/routes/contact.tsx` | Public contact form | `backendPublic.submitContact` | local state | No | Create live |
| `/feedback` | `frontend/src/routes/feedback.tsx` | Public feedback form | `backendPublic.submitFeedback` | local state | No | Create live |
| `/waitlist` | `frontend/src/routes/waitlist.tsx` | Waitlist form | `backendPublic.joinWaitlist` | local state + `seedInterests` | Partial | Create live, interests are locally seeded |
| `/support` | `frontend/src/routes/support.tsx` | FAQ + support issue + contact + user ticket history | `backendPublic.submitContact`, `backendPublic.submitSupportIssue`, `backendUsers.listMyFeedback` | local state + `scope-store` auth | Yes (`FAQS`) | Mixed: tickets/forms live, FAQ static |
| `/ambassador` | `frontend/src/routes/ambassador.tsx` | Ambassador application form | `backendPublic.submitAmbassador` | local state | No | Frontend wired, backend closed -> `NOT IMPLEMENTED` |
| `/dashboard` | `frontend/src/routes/dashboard.tsx` | User dashboard, KPIs, rank, applications, events, portfolio, feed | `backendUsers`, `backendProjects`, `backendEvents`, `backendNotifications`, `backendFeed`, `backendPortfolio`, `backendApplications` | local state + `scope-store` auth | Partial | Read live, some presentation data also comes from local stores |
| `/applications` | `frontend/src/routes/applications.tsx` | My project applications | `backendApplications.listMe`, `backendProjects.list` | local state + `scope-store` auth | No | Read/search live |
| `/feed` | `frontend/src/routes/feed.tsx` | Feed list, react, comment | `backendFeed.list/react/comment` | local state | No | Read/update/create comment live |
| `/events` | `frontend/src/routes/events.tsx` | Event list and RSVP | `backendEvents.list`, `backendEvents.rsvp` | local state + `scope-store` RSVP helper | Partial | Read + RSVP live |
| `/faculty` | `frontend/src/routes/faculty.tsx` | Faculty review dashboard | `backendReports.facultyOverview`, `backendUsers.updateMemberStatus` | local state | No | Read + approve/reject live |
| `/leaderboards` | `frontend/src/routes/leaderboards.tsx` | Student/campus/chapter rankings | `backendUsers.listStudentsByXp`, `listCampusesByMembers`, `listChaptersByXp` | local state | No | Read live |
| `/notifications` | `frontend/src/routes/notifications.tsx` | Notification inbox | `backendNotifications` through `scope-store.notifications` | `scope-store` | Yes (seeded role alerts merged with backend) | Mixed: read/mark live, list is merged real + local seed |
| `/portfolio` | `frontend/src/routes/portfolio.tsx` | Portfolio CRUD + link validation | `backendPortfolio`, `backendPublic.checkLink` | local state | No | Full CRUD live |
| `/profile` | `frontend/src/routes/profile.tsx` | Profile edit, avatar upload, verification, portfolio list | `backendAuth.me`, `backendUsers`, `backendInstitutions`, `backendDepartments`, `backendPortfolio`, `backendUpload` | mixed local state + `scope-store` | Partial | Most profile/portfolio actions live; some presentation still leans on local store snapshots |
| `/projects` | `frontend/src/routes/projects.tsx` | Project catalog, apply, save, room, tasks, grievances, proposal submit, work submission | `backendProjects`, `backendApplications`, `backendReports`, `backendUpload`, `backendProposals`, `backendUsers` | local state + `scope-store` auth | Yes (`featuredProjects` fallback) | Mixed but mostly live; global project area falls back to mock data when backend is empty |
| `/opportunities` | `frontend/src/routes/opportunities.tsx` | Opportunity board, unlock, apply | `backendOpportunities`, `backendOpportunityApplications`, `backendUpload` | `scope-store.opportunities` + local state | Partial | Read/apply live, list is cached through local store |
| `/campus` | `frontend/src/routes/campus.tsx` | Campus hub, member leaderboard, campus feed, events, create project, join chapter | `backendInstitutions`, `backendUsers`, `backendFeed`, `backendProjects`, `backendEvents` | local state + `scope-store.auth` | Yes (`campusPartners` padding) | Mixed: core reads/writes live, campus ranking block supplements with mock campuses |
| `/institution-admin` | `frontend/src/routes/institution-admin.tsx` | Institution overview, members, faculty, departments, analytics, communications, projects, events, application review | `backendUsers`, `backendProjects`, `backendEvents`, `backendReports`, `backendAnalytics`, `backendNotifications`, `backendInstitutions`, `backendAdminUsers`, `backendDepartments`, `backendApplications` | mixed local state + `crm-store` + some localStorage fallback | Partial | Mostly live CRUD, but file still contains local seed/fallback code |
| `/institution/reports` | `frontend/src/routes/institution.reports.tsx` | Institutional reporting dashboard and exports | `backendReports.institution` | local state | No | Read live; file/CSV exports are client-generated |
| `/scope-admin` | `frontend/src/routes/scope-admin.tsx` | CRM + analytics + member review + opportunities + events + projects + docs + proposals + feedback | `backendAnalytics`, `backendUsers`, `backendAdminUsers`, `backendOpportunityApplications`, `backendEvents`, `backendProjects`, `backendApplications`, `backendInstitutions`, `backendDocuments`, `backendProposals` plus `crm-store` | mixed local state + `crm-store` + `scope-store.opportunities` | Partial | Core data is live, but CRM stage/visit/launch tools are optimistic local cache wrappers |
| `/scope-admin/dashboard` | `frontend/src/routes/scope-admin.dashboard.tsx` | Lightweight dashboard page | `crm-store` only | `crm-store` | Partial | Read via CRM cache only |
| `/scope-admin/institutions` | `frontend/src/routes/scope-admin.institutions.tsx` | Lightweight institutions table | `crm-store` only | `crm-store` | Partial | Search/filter controls are rendered but not wired |
| `/scope-admin/mou-pipeline` | `frontend/src/routes/scope-admin.mou-pipeline.tsx` | Lightweight MoU board | `crm-store` only | `crm-store` | Partial | Read-only board over CRM cache |
| `/scope-admin/reports` | `frontend/src/routes/scope-admin.reports.tsx` | Lightweight report view | `crm-store` only | `crm-store` | Partial | "PDF" export is a text blob, not a real backend/report pipeline |
| `/scope-admin/visits` | `frontend/src/routes/scope-admin.visits.tsx` | Lightweight visits calendar/log | `crm-store` only | `crm-store` | Partial | Calendar is static UI, not real scheduling logic |
| `/scope-super-admin` | `frontend/src/routes/scope-super-admin.tsx` | HQ command center, create scope admins, create institution admins, feature flags | `backendSuperAdmin`, `backendAdminUsers`, `configStore.syncFromBackend/update` | local state + `crm-store` types + `config-store` | Partial | Command center live; feature toggles are synced through config store |
| `/scope-super-admin/rbac-audit` | `frontend/src/routes/scope-super-admin.rbac-audit.tsx` | RBAC dashboard | `backendSuperAdmin.rbacAudit` | local state | No | Read live |
| `/settings` | `frontend/src/routes/settings.tsx` | Account settings, notification toggles, export, reset | `auth.updateProfile` only | local state + `scope-store` | Yes (`PREMIUM`) | Partial: account save live; prefs, premium waitlist, reset are local-only |

### Local-only / static routes

| Route | File | Observed status |
| --- | --- | --- |
| `/` | `frontend/src/routes/index.tsx` | Marketing/landing page uses static mock data sections |
| `/about` | `frontend/src/routes/about.tsx` | Static |
| `/announcements` | `frontend/src/routes/announcements.tsx` | Static hardcoded `ITEMS` |
| `/broken-link` | `frontend/src/routes/broken-link.tsx` | Local utility page |
| `/campus-leader` | `frontend/src/routes/campus-leader.tsx` | Local seeded metrics only |
| `/challenges` | `frontend/src/routes/challenges.tsx` | Local-only weekly challenge logic; not backend challenge system |
| `/community-guidelines` | `frontend/src/routes/community-guidelines.tsx` | Static |
| `/cookie-policy` | `frontend/src/routes/cookie-policy.tsx` | Static |
| `/dev/build-diagnostics` | `frontend/src/routes/dev.build-diagnostics.tsx` | Local route inventory diagnostics only |
| `/faqs` | `frontend/src/routes/faqs.tsx` | Static |
| `/forms/$formSlug` | `frontend/src/routes/forms.$formSlug.tsx` | Registry-based local form shell, no submit backend |
| `/innovation-lab` | `frontend/src/routes/innovation-lab.tsx` | Static |
| `/admin` | `frontend/src/routes/admin.tsx` | Demo/local admin console using `scope-store` and localStorage |
| `/admin/config` | `frontend/src/routes/admin.config.tsx` | Local config editor with async backend sync |
| `/admin/campuses/new` | `frontend/src/routes/admin.campuses.new.tsx` | Mostly local launch simulator; does not create real institution records |
| `/ops` | `frontend/src/routes/ops.tsx` | Local-only operations console |
| `/privacy` | `frontend/src/routes/privacy.tsx` | Static |
| `/refer` | `frontend/src/routes/refer.tsx` | Local referral/share page |
| `/terms` | `frontend/src/routes/terms.tsx` | Static |
| `/u/$handle` | `frontend/src/routes/u.$handle.tsx` | Public profile works only for current local user/device |
| `/unauthorized` | `frontend/src/routes/unauthorized.tsx` | Static |
| `/updates` | `frontend/src/routes/updates.tsx` | Static seeded updates |

### Wrapper / alias routes

These routes simply render the parent page and do not add their own data layer:

- `frontend/src/routes/institution-admin.members.tsx`
- `frontend/src/routes/institution-admin.analytics.tsx`
- `frontend/src/routes/institution-admin.communications.tsx`
- `frontend/src/routes/institution-admin.reports.tsx`

## Step 2: Backend inventory

### Mounted backend modules

| Module | Mounted from | Models touched | Validation | Auth/RBAC | Service layer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | `backend/src/routes/auth.js` | `User`, `Profile`, `Session`, `Institution`, `ProfileActivity` | Zod | public + `authMiddleware` for `/me` | none | Fully implemented |
| Users | `backend/src/routes/users.js` | `User`, `Profile`, `PortfolioLink`, `Department`, `AnalyticsEvent`, `PublicSubmission`, `Session` | Partial Zod | `authMiddleware` + permission checks | notification service for some flows | Mostly implemented |
| Admin users | `backend/src/routes/users.js` (`adminUsersRouter`) | `User`, `Profile`, `Department`, `Session`, `PublicSubmission` | Create validated; patch path is largely manual and lacks schema enforcement | `authMiddleware` + custom role checks | notification service for status flows | Partially implemented |
| Institutions / CRM | `backend/src/routes/institutions.js` | `Institution`, `CrmVisit`, `LaunchChecklist`, `Project`, `User` | Zod | `authMiddleware` + `requirePermission("manage_partnerships")` on CRM routes | notification + email utility on document send | Mostly implemented |
| Projects | `backend/src/routes/projects.js` | `Project`, `Application`, `Profile`, `ProjectRoom`, `ProjectTask`, `DailyReport`, `XpTransaction`, `ProfileActivity` | Zod | `authMiddleware`, optional auth, permission checks | notification service + XP helpers | Fully implemented in code |
| Applications | `backend/src/routes/projects.js` (`applicationsRouter`) | `Application`, `Project`, XP-related models through helpers | Zod | `authMiddleware` + reviewer/applicant checks | notification service + XP helpers | Fully implemented in code |
| Opportunities | `backend/src/routes/opportunities.js` | `Opportunity`, `OpportunityApplication`, `Profile`, `User` | Zod | `authMiddleware`, permission checks | notification service | Mostly implemented |
| Notifications | `backend/src/routes/notifications.js` | `Notification`, `Communication`, `User` | Zod | `authMiddleware`, permission checks | `notification-dispatcher` service | Fully implemented |
| Analytics | `backend/src/routes/analytics.js` | `AnalyticsEvent`, `User`, `Institution`, `Project`, `Application` | None | `authMiddleware`, permission checks | none | Implemented |
| Feed | `backend/src/routes/feed.js` | `FeedPost`, `User`, `Profile`, `Institution` | Zod | `authMiddleware` | notification service | Fully implemented |
| Upload / files | `backend/src/routes/upload.js` | `FileAsset` + filesystem | Multer + manual checks | upload auth for POST/list, conditional auth for private GET | none | Fully implemented |
| Events | `backend/src/routes/events.js` | `Event`, `ProfileActivity` | Zod | `authMiddleware`, `requirePermission("manage_events")` for create/delete | XP helpers | Fully implemented |
| Portfolio items | `backend/src/routes/portfolio-items.js` + controller | `PortfolioItem`, `ProfileActivity` | Zod | `authMiddleware` | none | Fully implemented |
| Reports | `backend/src/routes/reports.js` | `Institution`, `User`, `Project`, `AnalyticsEvent`, `Application`, `Event`, `DailyReport`, `ReportRecoveryRequest`, `Profile` | Zod | `authMiddleware`, permission checks | notification service | Mostly implemented |
| Departments | `backend/src/routes/departments.js` | `Department`, `User` | None | `authMiddleware` only | none | Implemented but insecure / under-validated |
| Public submissions | `backend/src/routes/public.js` | `PublicSubmission` | Zod | optional auth on some paths | none | Mostly implemented |
| Proposals | `backend/src/routes/proposals.js` | `Proposal`, `User` | Zod | `authMiddleware`, permission checks | notification service | Fully implemented |
| Challenges | `backend/src/routes/challenges.js` + controller | `Challenge`, `ChallengeParticipation` | Zod | `authMiddleware`, permission checks | XP helpers | Implemented but largely unused by UI |
| Config | `backend/src/routes/config.js` + controller | `PlatformConfig` | Zod on PATCH | public GET, permissioned PATCH | none | Fully implemented |
| Super admin | `backend/src/routes/super-admin.js` + controller | `Institution`, `CrmVisit`, `LaunchChecklist`, `User`, `Profile`, `ScopeAdminProfile`, `RbacPolicy`, `AnalyticsEvent` | Zod inside controller | `authMiddleware`, HQ checks in controller | none | Mostly implemented |
| Health | `backend/src/routes/health.js` | none | none | public | none | Implemented |

### Legacy backend modules present but not mounted

| Route file | Intended purpose | Actual app status |
| --- | --- | --- |
| `backend/src/routes/contact.js` | Contact form | Dead code, not mounted |
| `backend/src/routes/feedback.js` | Feedback API | Dead code, not mounted |
| `backend/src/routes/waitlist.js` | Waitlist API | Dead code, not mounted |

### Backend implementation notes

- Conventional service layer: mostly absent.
- Direct DB access pattern: dominant.
- Shared helpers/services do exist for:
  - notifications: `backend/src/services/notification-dispatcher.js`
  - XP economy: `backend/src/utils/xp-engine.js`
  - achievements: `backend/src/utils/achievement-engine.js`
  - serialization: `backend/src/utils/serializers.js`

## Step 3: Frontend to backend mapping

| Frontend feature | Frontend file | API endpoint(s) | Backend status | Connected? | Remarks |
| --- | --- | --- | --- | --- | --- |
| Auth login/signup | `frontend/src/routes/auth.tsx` | `/api/v1/auth/signup`, `/api/v1/auth/login` | Implemented | Yes | Live through `scope-store.auth` |
| Forgot/reset password | `frontend/src/routes/forgot-password.tsx`, `reset-password.tsx` | `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password` | Implemented | Yes | Email send depends on backend email utility |
| Dashboard hydration | `frontend/src/routes/dashboard.tsx` | `/users`, `/projects`, `/events`, `/notifications`, `/feed`, `/portfolio-items/me`, `/applications`, `/users/me/rank` | Implemented | Yes | Read-heavy live dashboard |
| Contact form | `frontend/src/routes/contact.tsx` | `/public/contact` | Implemented | Yes | Writes `PublicSubmission` |
| Feedback form/widget | `frontend/src/routes/feedback.tsx`, `components/site/FeedbackWidget.tsx` | `/public/feedback` | Implemented | Yes | Writes `PublicSubmission` |
| Waitlist | `frontend/src/routes/waitlist.tsx` | `/public/waitlist` | Implemented | Yes | Writes `PublicSubmission` |
| Ambassador form | `frontend/src/routes/ambassador.tsx` | `/public/ambassador` | Stub/closed | No | Endpoint exists but always 403 |
| Support ticket history | `frontend/src/routes/support.tsx` | `/users/me/feedback` | Implemented | Yes | Reads user-scoped `PublicSubmission` records |
| Feed page | `frontend/src/routes/feed.tsx`, `components/site/FeedComposer.tsx` | `/feed`, `/feed/:id/react`, `/feed/:id/comment`, `/upload` | Implemented | Yes | Live CRUD except delete not present |
| Events page | `frontend/src/routes/events.tsx` | `/events`, `/events/:id/rsvp` | Implemented | Yes | Live read + RSVP |
| Portfolio CRUD | `frontend/src/routes/portfolio.tsx` | `/portfolio-items/me`, `/portfolio-items`, `/portfolio-items/:id`, `/public/check-link` | Implemented | Yes | CRUD live, link checking has SSRF risk |
| Profile editor | `frontend/src/routes/profile.tsx` | `/auth/me`, `/users/:id`, `/users/profile`, `/users/me/student-verification`, `/users/me/opportunity-verification`, `/institutions/public`, `/departments`, `/upload` | Implemented | Yes | Live, but page also keeps local store shadow state |
| Projects catalog and apply | `frontend/src/routes/projects.tsx` | `/projects`, `/projects/:id/join`, `/applications`, `/users/me/saved-projects` | Implemented | Yes | Global listing may fall back to mock seeds |
| Project room/tasks/grievances | `frontend/src/routes/projects.tsx` | `/projects/:id/room`, `/tasks`, `/tasks/:taskId`, `/room/grievance`, `/abuse-check`, `/applications/:id/submission` | Implemented | Yes | Strongest end-to-end workflow in app |
| Proposal submit | `frontend/src/routes/projects.tsx` | `/proposals` | Implemented | Yes | Live create |
| Opportunity board | `frontend/src/routes/opportunities.tsx` | `/opportunities`, `/opportunities/:id/unlock`, `/opportunities/:id/apply`, `/opportunities/applications` | Implemented | Yes | Uses local store cache for list |
| Campus hub | `frontend/src/routes/campus.tsx` | `/institutions/public`, `/institutions/me/campus-summary`, `/users`, `/feed`, `/events`, `/projects`, `/users/join-chapter` | Implemented | Partial | Real data is mixed with mock campus ranking fallback |
| Institution admin overview | `frontend/src/routes/institution-admin.tsx` | `/users`, `/projects`, `/events`, `/reports/institution/:id`, `/institutions/:id` | Implemented | Yes | Core views are live |
| Institution member/faculty/department management | `frontend/src/routes/institution-admin.tsx` | `/users/:id/member-status`, `/admin/users`, `/admin/users/:id`, `/departments` | Implemented | Yes | Backend exists; departments auth is weak |
| Institution communications | `frontend/src/routes/institution-admin.tsx` | `/notifications/institution` | Implemented | Yes | Live create/read of `Communication` records |
| Institution analytics | `frontend/src/routes/institution-admin.tsx` | `/analytics/institution/:id/*` | Implemented | Yes | Live |
| Institution projects/events/app review | `frontend/src/routes/institution-admin.tsx` | `/projects`, `/events`, `/applications/:id`, `/applications/:id/submission-review` | Implemented | Yes | Live CRUD/review |
| Scope admin CRM | `frontend/src/routes/scope-admin.tsx`, `lib/crm-store.ts` | `/institutions/crm`, `/institutions/crm/institutions`, `/institutions/crm/visits`, `/institutions/crm/launches/:institutionId` | Implemented | Yes | Optimistic local cache wrapped over real APIs |
| Scope admin analytics and operations | `frontend/src/routes/scope-admin.tsx` | `/analytics/*`, `/events`, `/projects`, `/applications`, `/documents`, `/proposals`, `/admin/users/feedback` | Implemented | Yes | Large mixed portal, mostly live |
| Scope admin lightweight pages | `frontend/src/components/scope-admin/ScopeAdminPages.tsx` | `crm-store` only | Partial | Partial | Backed only by cached CRM store; several controls are cosmetic |
| Super admin command center | `frontend/src/routes/scope-super-admin.tsx` | `/super-admin/command-center`, `/super-admin/scope-admins`, `/admin/users`, `/config` | Implemented | Yes | Live |
| RBAC audit dashboard | `frontend/src/routes/scope-super-admin.rbac-audit.tsx` | `/super-admin/rbac-audit` | Implemented | Yes | Live read |
| Challenge page | `frontend/src/routes/challenges.tsx` | none to challenge backend | Backend exists, frontend missing | No | Frontend is local-only |
| Public profile page | `frontend/src/routes/u.$handle.tsx` | none | Backend missing for this UI | No | Works only for current local user/device |

## Step 4: Database verification

| Module | Database backing | Status | Notes |
| --- | --- | --- | --- |
| Auth | `User`, `Profile`, `Session` | Live code path | Signup/login/refresh/logout/reset are DB-backed |
| Public submissions | `PublicSubmission` | Live code path | Contact, feedback, waitlist, support issue, opportunity verification, student verification requests |
| Users/profile | `User`, `Profile`, `PortfolioLink`, `Department`, `ProfileActivity` | Live code path | Most profile/account edits persist |
| Institutions/CRM | `Institution`, `CrmVisit`, `LaunchChecklist`, `ScopeAdminProfile` | Live code path | CRM store syncs to DB via mounted APIs |
| Projects | `Project`, `Application`, `ProjectRoom`, `ProjectTask`, `DailyReport`, `XpTransaction` | Live code path | Strong CRUD coverage |
| Feed | `FeedPost` | Live code path | Create/read/react/comment persist |
| Events | `Event` | Live code path | Create/delete/RSVP persist |
| Portfolio | `PortfolioItem` | Live code path | CRUD persists |
| Opportunities | `Opportunity`, `OpportunityApplication`, `Profile` | Live code path | Unlock/apply/review persist |
| Notifications | `Notification`, `Communication`, `NotificationOutbox` | Live code path | Personal and institution notifications persist |
| Reports | `DailyReport`, `ReportRecoveryRequest`, `AnalyticsEvent` | Live code path | Reporting/recovery/analytics persist |
| Proposals | `Proposal` | Live code path | Idea suggestions persist |
| Challenges backend | `Challenge`, `ChallengeParticipation` | Live code path | Backend persists, but frontend challenge page does not use it |
| Platform config | `PlatformConfig` | Live code path | Config center persists brand/contact/features/campuses |
| Ambassador submissions | none | Missing | No DB write because endpoint returns 403 |
| Settings notification prefs | none | Missing | No backend model or API for these toggles |
| Admin demo / ops demo / public profile local mode | localStorage only | Static/local | No DB integration |

## Step 5: Implementation coverage report

Scoring here is module-level and weighted by major user workflows, not by number of buttons.

| Module | Frontend status | Backend status | Database status | Completion |
| --- | --- | --- | --- | --- |
| Authentication | Strong | Strong | Strong | 90% |
| Password recovery | Strong | Strong | Strong | 90% |
| Public contact / feedback / waitlist | Strong | Strong | Strong | 90% |
| Ambassador program | Weak | Stubbed/closed | Missing | 20% |
| Dashboard | Strong | Strong | Strong | 80% |
| Feed | Strong | Strong | Strong | 85% |
| Events | Strong | Strong | Strong | 85% |
| Portfolio | Strong | Strong | Strong | 90% |
| Profile | Mixed | Strong | Strong | 75% |
| Projects and applications | Mixed but substantial | Strong | Strong | 80% |
| Opportunities | Mixed | Strong | Strong | 80% |
| Campus hub | Mixed | Strong | Strong | 70% |
| Institution admin | Mixed but substantial | Strong | Strong | 78% |
| Institution reports | Strong | Strong | Strong | 85% |
| Scope admin CRM/ops | Mixed but substantial | Strong | Strong | 78% |
| Scope admin lightweight pages | Partial UI only | Uses CRM cache | Uses CRM DB indirectly | 55% |
| Super admin command center | Strong | Strong | Strong | 82% |
| RBAC audit | Strong | Strong | Strong | 85% |
| Notifications | Mixed | Strong | Strong | 70% |
| Settings | Partial | Weak | Missing | 35% |
| Challenges | Weak | Strong backend exists | Strong backend exists | 40% |
| Demo admin / ops / campus leader / static announcement flows | Weak/local only | None or not used | None | 20% |

## Step 6: Missing features report

### Missing frontend implementations

- Ambassador submission is not live despite a complete form UI.
  - Frontend: `frontend/src/routes/ambassador.tsx`
  - Backend returns 403 in `backend/src/routes/public.js`

- Weekly challenge UI does not use the challenge backend at all.
  - Frontend: `frontend/src/routes/challenges.tsx`
  - Backend available: `backend/src/routes/challenges.js`

- Public profile page is local-device only, not a real public profile system.
  - Frontend: `frontend/src/routes/u.$handle.tsx`
  - No frontend API call to fetch another user's public profile

- Settings notification toggles are not persisted anywhere.
  - Frontend: `frontend/src/routes/settings.tsx`
  - No corresponding backend endpoint/model

- Scope admin lightweight pages expose controls that are not wired:
  - `frontend/src/components/scope-admin/ScopeAdminPages.tsx`
  - Search input in Institutions page
  - "Status Filter" button
  - Static calendar grid in Visits page
  - Client-generated fake PDF export in Reports page

- `frontend/src/routes/admin.campuses.new.tsx` simulates campus launch through config and local store writes; it does not create a real institution/chapter pipeline record.

### Missing / stubbed backend implementations

- `POST /api/v1/public/ambassador`
  - File: `backend/src/routes/public.js`
  - Current behavior: hardcoded 403 response
  - Needed for live ambassador applications

- Legacy route files exist but are not mounted:
  - `backend/src/routes/contact.js`
  - `backend/src/routes/feedback.js`
  - `backend/src/routes/waitlist.js`

### Missing database implementations

- Ambassador application storage
  - No active DB write path because `/public/ambassador` is disabled

- Notification preference persistence
  - No model/API for email digests, push notifications, or weekly chapter-war preferences from `/settings`

- Public profile retrieval by handle
  - No dedicated public profile endpoint/model projection used by `/u/$handle`

### Hardcoded / mock data found

| File | Variable / pattern | Why it matters | Suggested replacement |
| --- | --- | --- | --- |
| `frontend/src/lib/mock-data.ts` | `campusPartners`, `featuredProjects`, `topBuilders`, `topChapters`, etc. | Seeds multiple pages and fallbacks | Replace with backend-driven content APIs or admin CMS data |
| `frontend/src/routes/announcements.tsx` | `ITEMS` | Announcement feed is static | Add `/public/announcements` or CMS-backed feed |
| `frontend/src/routes/challenges.tsx` | `challenges`, `wars`, `scope_challenges_claimed` localStorage | Not tied to backend challenge system | Use `/api/v1/challenges` and participation endpoints |
| `frontend/src/routes/support.tsx` | `FAQS` | Support knowledge base is static | Move to CMS/config or database table |
| `frontend/src/routes/settings.tsx` | `PREMIUM` and toggle state | Premium/prefs are presentation only | Add backend feature flags + preference model |
| `frontend/src/routes/campus.tsx` | `campusPartners` fallback | Campus leaderboard mixes mock and real rows | Use real campus data only, or label fallback explicitly |
| `frontend/src/routes/projects.tsx` | `featuredProjects` fallback | Global project board can show mock data as if live | Use empty-state when backend has no data |
| `frontend/src/routes/institution-admin.tsx` | `seedMembers()` and localStorage profile fallback | Legacy simulator code beside live admin flows | Remove dead fallback code after backend hardening |
| `frontend/src/routes/campus-leader.tsx` | derived metrics from string seed | KPI values are synthetic | Back with chapter analytics API |
| `frontend/src/routes/admin.tsx` | localStorage admin overlays | Demo-only admin panel | Replace with real admin endpoints or remove |
| `frontend/src/routes/ops.tsx` | local constants, localStorage, hardcoded PIN | Demo-only ops console | Replace with real ops module or remove |

## Step 7: Final audit score

### Count summary

- Registered frontend routes: 59
- Major workflow modules audited: 22
- Fully connected workflow modules: 12
- Partially connected workflow modules: 7
- Unimplemented or local-only workflow modules: 3 core gaps
- Mounted backend feature families: 19
- Legacy/unmounted backend route files: 3
- Backend challenge feature family implemented but not consumed by the main challenge UI: 1

### Overall completion formula

Formula used:

`completion = (full + 0.5 * partial) / total major workflow modules`

Using:

- full = 12
- partial = 7
- total = 22

Result:

- Overall Project Completion = 70.5%

### Final verdict

`WARNING: Partially Implemented`

The application has a real backend, real database models, and several genuinely implemented end-to-end workflows:

- auth
- public submissions
- feed
- events
- portfolio
- projects/applications
- opportunities
- institution admin
- scope admin
- super admin

It is not production ready yet because of:

- one disabled frontend-referenced workflow (`/public/ambassador`)
- one major frontend/backend disconnect (challenge UI vs challenge backend)
- multiple local/demo-only admin-style screens
- mixed mock/live data on important user pages
- missing persistence for settings/preferences
- at least two serious backend hardening issues (`departments` auth/validation and `public/check-link` SSRF)

## Recommended next fixes, in order

1. Lock down `backend/src/routes/departments.js` with role-based permission checks and Zod validation.
2. Remove or harden `GET /api/v1/public/check-link` to prevent SSRF.
3. Decide whether ambassador applications are open; either implement persistence or remove the frontend CTA.
4. Rebuild `frontend/src/routes/challenges.tsx` on top of the real challenge APIs.
5. Remove mock fallback from `projects.tsx` and `campus.tsx`, or label it explicitly as demo data.
6. Add backend persistence for settings/notification preferences.
7. Remove dead local simulator code from `admin.tsx`, `ops.tsx`, `campus-leader.tsx`, and legacy portions of `institution-admin.tsx`.

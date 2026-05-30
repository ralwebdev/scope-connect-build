# API Mapping Directory

This directory provides a comprehensive mapping of the backend API endpoints to their business logic purpose, data requirements, and frontend consumers within the Scope Connect platform.

## API Endpoint Directory

| API Endpoint & Method | Purpose | Connected Pages / Components | Data Transferred |
|:--- |:--- |:--- |:--- |
| **Authentication (`/api/v1/auth`)** | | | |
| `POST /api/v1/auth/signup` | Register a new user account | `AuthPage` | **Req:** User details, interests. **Res:** User object, JWT tokens. |
| `POST /api/v1/auth/login` | Authenticate user and issue tokens | `AuthPage` | **Req:** Email, password, role. **Res:** User object, JWT tokens. |
| `POST /api/v1/auth/logout` | Revoke refresh tokens and logout session | `RetentionLayer`, `useSession` | **Req:** `refresh_token`. **Res:** `revoked` count. |
| `POST /api/v1/auth/refresh` | Rotate and issue new access/refresh tokens | `apiClient` (interceptors) | **Req:** `refresh_token`. **Res:** New JWT tokens. |
| `POST /api/v1/auth/forgot-password` | Send password reset link to user email | `ForgotPasswordPage` | **Req:** `email`. **Res:** `sent` status. |
| `POST /api/v1/auth/reset-password` | Reset password using a valid token | `ResetPasswordPage` | **Req:** `token`, `password`. **Res:** `reset` status. |
| `GET /api/v1/auth/me` | Fetch currently authenticated user profile | `useSession`, `ProfilePage` | **Res:** Hydrated `User` object. |
| **Users & Profiles (`/api/v1/users`)** | | | |
| `GET /api/v1/users` | List users with optional filtering | `InstitutionAdminMembers`, `ScopeAdmin` | **Query:** `institution_id`, `role`. **Res:** `User` list. |
| `GET /api/v1/users/me/rank` | Get user's global and campus leaderboard rank | `Dashboard`, `ProfilePage` | **Res:** `globalRank`, `campusRank`. |
| `PATCH /api/v1/users/:id` | Update user profile details | `ProfilePage`, `Settings` | **Req:** Profile/User fields. **Res:** Updated `User`. |
| `PATCH /api/v1/users/:id/member-status` | Approve/Reject student verification (Admin) | `FacultyPage`, `InstitutionAdminMembers` | **Req:** `student_status`. **Res:** Updated `User`. |
| `POST /api/v1/users/profile` | Batch update portfolio/domain links | `ProfilePage` | **Req:** `portfolio_links` array. **Res:** Updated `User`. |
| `GET /api/v1/users/me/activity` | Get user's recent XP and profile activity log | `ProfilePage`, `Dashboard` | **Res:** `Activity` items list. |
| `GET /api/v1/users/leaderboard/students` | Get top students ranked by XP | `LeaderboardsPage` | **Query:** `institution_id`. **Res:** Sorted `User` list. |
| `GET /api/v1/users/leaderboard/campuses` | Get top campuses by member count | `LeaderboardsPage` | **Res:** Campus list with member counts. |
| `GET /api/v1/users/leaderboard/chapters` | Get top chapters ranked by total XP | `LeaderboardsPage` | **Res:** Chapter list with total accumulated XP. |
| `POST /api/v1/users/me/dashboard-points` | Award XP for completing onboarding segments | `Dashboard` | **Req:** `segments` array. **Res:** `awarded` amount. |
| `POST /api/v1/users/me/xp` | Manually add XP (Sync or Admin action) | `Dashboard` | **Req:** `amount`, `reason`. **Res:** New `xp` total. |
| `POST /api/v1/users/me/streak-tick` | Update daily login streak and award XP | `Dashboard`, `RetentionLayer` | **Res:** `streak` count, `xp` awarded. |
| `GET /api/v1/users/me/weekly-mission-status` | Check current week's mission claim status | `Dashboard` | **Res:** `claimed` status, `week_key`. |
| `POST /api/v1/users/me/weekly-mission-claim` | Claim reward for a completed weekly mission | `Dashboard` | **Req:** `amount`, `mission_title`. **Res:** New `xp` total. |
| `GET /api/v1/users/me/saved-projects` | List IDs of projects saved by the user | `ProjectsPage`, `Dashboard` | **Res:** Array of `saved_projects` IDs. |
| `POST /api/v1/users/me/saved-projects` | Toggle save/unsave state for a project | `ProjectsPage` | **Req:** `id`, `action`. **Res:** Updated `saved_projects` list. |
| `POST /api/v1/users/me/opportunity-verification` | Submit request for industry portfolio verification | `ProfilePage` | **Res:** `submission_id`. |
| `POST /api/v1/users/me/student-verification` | Submit request for institution verification | `ProfilePage` | **Req:** `institution_id`, `department_id`. **Res:** `User` object. |
| `POST /api/v1/users/join-chapter` | Join an institution's chapter/campus | `ProfilePage`, `CampusPage` | **Req:** `institution_id`. **Res:** `User`, `awarded_xp`. |
| `GET /api/v1/users/me/feedback` | Get list of user's submitted support tickets | `SupportPage` | **Res:** `feedback` submissions list. |
| **Admin User Management (`/api/v1/admin/users`)** | | | |
| `POST /api/v1/admin/users` | Create new users or generate invites | `InstitutionAdminMembers`, `ScopeAdmin` | **Req:** User details, role. **Res:** `User`, `invite_token`. |
| `PATCH /api/v1/admin/users/:id` | Update user roles, status, or reset passwords | `InstitutionAdminMembers`, `ScopeAdmin` | **Req:** `role`, `student_status`, `password`. **Res:** `User`. |
| `DELETE /api/v1/admin/users/:id` | Permanently delete a user account | `InstitutionAdminMembers` | **Res:** Success message. |
| `GET /api/v1/admin/users/feedback` | List all feedback and support tickets (Global) | `ScopeAdmin` | **Res:** Normalized list of all `PublicSubmission` items. |
| `PATCH /api/v1/admin/users/feedback/:id` | Update status of a support ticket/verification | `ScopeAdmin` | **Req:** `status`. **Res:** Updated `submission`. |
| `DELETE /api/v1/admin/users/feedback/:id` | Delete a feedback or support submission | `ScopeAdmin` | **Res:** Success message. |
| **Institutions (`/api/v1/institutions`)** | | | |
| `GET /api/v1/institutions/public` | List all institutions for public selection | `ProfilePage`, `WaitlistPage`, `AuthPage` | **Res:** `Institution` list. |
| `GET /api/v1/institutions/me/campus-summary` | Get summary metrics for the user's campus | `Dashboard`, `CampusPage` | **Res:** `active_members`, `leaders`, `projects_shipped`. |
| `GET /api/v1/institutions/me` | Get detailed profile of user's institution | `Settings`, `InstitutionAdmin` | **Res:** `Institution` object. |
| `GET /api/v1/institutions/:id` | Get specific institution by ID | `ProfilePage`, `ScopeAdminInstitutions` | **Res:** `Institution` object. |
| `PATCH /api/v1/institutions/:id` | Update institution details and settings | `Settings`, `InstitutionAdmin`, `ScopeAdmin` | **Req:** Institution fields. **Res:** Updated `Institution`. |
| `POST /api/v1/institutions/:id/documents` | Upload and share documents with institution | `ScopeAdminInstitutions` | **Req:** file details, `kind`. **Res:** `Institution` object. |
| `GET /api/v1/institutions/crm` | Get global CRM dashboard data | `ScopeAdminDashboard` | **Res:** `institutions`, `visits`, `launches`, `admins`. |
| `POST /api/v1/institutions/crm/institutions` | Create a new institution lead in CRM | `ScopeAdminInstitutions` | **Req:** Lead details. **Res:** `Institution` object. |
| `POST /api/v1/institutions/crm/visits` | Schedule a CRM visit for an institution | `ScopeAdminVisits` | **Req:** `date`, `time`, `notes`. **Res:** `Visit` object. |
| `PATCH /api/v1/institutions/crm/launches/:instId` | Update institution launch checklist | `ScopeAdminMOU` | **Req:** `key`, `value`. **Res:** `LaunchChecklist`. |
| **Projects (`/api/v1/projects`)** | | | |
| `GET /api/v1/projects` | List projects with filtering and search | `ProjectsPage`, `Dashboard`, `CampusPage` | **Query:** `status`, `domain`, `institution_id`. **Res:** Project list. |
| `POST /api/v1/projects` | Create/Propose a new project | `ProjectsPage` | **Req:** Project details. **Res:** `Project` object. |
| `GET /api/v1/projects/:id` | Get full details of a specific project | `ProjectsPage`, `ProjectDetail` | **Res:** Serialized `Project` object. |
| `PATCH /api/v1/projects/:id` | Update project metadata or status | `ProjectsPage` | **Req:** Project fields. **Res:** Updated `Project`. |
| `DELETE /api/v1/projects/:id` | Soft-delete (cancel) a project | `ProjectsPage` | **Res:** Success status. |
| `POST /api/v1/projects/:id/vote` | Toggle user vote on a project | `ProjectsPage` | **Res:** `voted` status, total `votes`. |
| `GET /api/v1/projects/:id/room` | Get collaboration room data and participants | `ProjectsPage` (Room Tab) | **Res:** `Room`, `participants`, `grievances`. |
| `PATCH /api/v1/projects/:id/room` | Update room sync notes or member progress | `ProjectsPage` (Room Tab) | **Req:** `notes`, `participant_progress`. **Res:** Updated `Room`. |
| `DELETE /api/v1/projects/:id/room/participants/:uid` | Remove a participant from the project | `ProjectsPage` (Participants) | **Res:** Updated `Room`. |
| `PATCH /api/v1/projects/:id/room/participants/:uid` | Promote leader or update participant role | `ProjectsPage` (Participants) | **Req:** `role`, `isLeader`. **Res:** Updated `Room`. |
| `POST /api/v1/projects/:id/room/grievance` | Submit a grievance/issue to admin | `ProjectsPage` (Grievances) | **Req:** `title`, `description`. **Res:** Updated `Room`. |
| `PATCH /api/v1/projects/:id/room/grievances/:gid` | Respond to and resolve a grievance | `ProjectsPage` (Grievances) | **Req:** `adminResponse`, `status`. **Res:** Updated `Room`. |
| `GET /api/v1/projects/:id/tasks` | List all tasks for a project | `ProjectsPage` (Tasks Tab) | **Res:** `ProjectTask` list. |
| `POST /api/v1/projects/:id/tasks` | Create and assign a project task | `ProjectsPage` (Tasks Tab) | **Req:** Task details. **Res:** `Task` object. |
| `PATCH /api/v1/projects/:id/tasks/:tid` | Update task status (e.g., In Progress, Done) | `ProjectsPage` (Tasks Tab) | **Req:** `status`. **Res:** Updated `Task`. |
| `POST /api/v1/projects/:id/tasks/:tid/evidence` | Submit proof of task completion | `ProjectsPage` (Tasks Tab) | **Req:** `kind`, `value`. **Res:** Updated `Task`. |
| `POST /api/v1/projects/:id/contribution-scores` | Set weighted contribution scores | `ProjectsPage` | **Req:** `scores` mapping. **Res:** Updated `Application` items. |
| `POST /api/v1/projects/:id/complete` | Mark project completed and distribute XP | `ProjectsPage` | **Req:** `final_deliverables`. **Res:** Final `Project` state. |
| `GET /api/v1/projects/:id/abuse-check` | Run anti-abuse analytics for project | `ProjectsPage` (Admin) | **Res:** List of `flags` (inactivity, velocity, etc.). |
| **Applications (`/api/v1/applications`)** | | | |
| `POST /api/v1/projects/:id/join` | Join/Apply to a project (Commit XP) | `ProjectsPage` | **Req:** `message`, `project_role`. **Res:** `Application`. |
| `GET /api/v1/applications` | List user's or project's applications | `ApplicationsPage`, `ProjectsPage` | **Query:** `project_id`, `status`. **Res:** `Application` list. |
| `PATCH /api/v1/applications/:id` | Update application status (Shortlist/Accept) | `ApplicationsPage`, `ProjectsPage` | **Req:** `status`. **Res:** Updated `Application`. |
| `POST /api/v1/applications/:id/submission` | Submit final work for review | `ApplicationsPage` | **Req:** `live_url`, `github_url`, `screenshot`. **Res:** `Application`. |
| `PATCH /api/v1/applications/:id/submission-review` | Pass/Fail a project submission | `ProjectsPage` | **Req:** `review_status`, `comment`. **Res:** `Application`. |
| **Opportunities (`/api/v1/opportunities`)** | | | |
| `GET /api/v1/opportunities` | List industry-led opportunities | `OpportunitiesPage` | **Res:** `Opportunity` list with unlock status. |
| `POST /api/v1/opportunities` | Create industry opportunity (Admin) | `ScopeAdmin` | **Req:** Opportunity details. **Res:** `Opportunity` object. |
| `POST /api/v1/opportunities/:id/unlock` | Unlock an opportunity by meeting XP threshold | `OpportunitiesPage` | **Res:** `Opportunity` object, `current_xp`. |
| `GET /api/v1/opportunities/applications` | List applications for industry roles | `OpportunitiesPage`, `ScopeAdmin` | **Query:** `opportunity_id`, `status`. **Res:** `Application` list. |
| `POST /api/v1/opportunities/:id/apply` | Apply for an unlocked industry role | `OpportunitiesPage` | **Req:** `fit_note`, portfolio/resume URLs. **Res:** `Application`. |
| `PATCH /api/v1/opportunities/applications/:id` | Update industry application status | `ScopeAdmin` | **Req:** `status`, `admin_comment`. **Res:** Updated `Application`. |
| **Feed (`/api/v1/feed`)** | | | |
| `GET /api/v1/feed` | Get unified or campus-only feed posts | `FeedPage`, `CampusPage`, `Dashboard` | **Query:** `scope`, `limit`. **Res:** `FeedPost` list. |
| `POST /api/v1/feed` | Create a new community post | `FeedComposer` | **Req:** `content`, `media`, `target_institution_id`. **Res:** `Post`. |
| `POST /api/v1/feed/:id/react` | Like or Celebrate a feed post | `FeedPage` | **Req:** `reaction` type. **Res:** Updated `Post`. |
| `POST /api/v1/feed/:id/comment` | Add a comment to a feed post | `FeedPage` | **Req:** `text`. **Res:** Updated `Post`. |
| **Notifications (`/api/v1/notifications`)** | | | |
| `GET /api/v1/notifications` | Get personal notifications | `NotificationsPage`, `Dashboard` | **Query:** `unread`, `limit`. **Res:** `Notification` list. |
| `PATCH /api/v1/notifications/:id` | Mark a notification as read | `NotificationsPage` | **Req:** `read: true`. **Res:** Updated `Notification`. |
| `POST /api/v1/notifications/read-all` | Clear all unread notifications | `NotificationsPage` | **Res:** `updated` count. |
| `GET /api/v1/notifications/institution` | Get history of campus-wide broadcasts | `InstitutionAdminCommunications` | **Res:** `Communication` list. |
| `POST /api/v1/notifications/institution` | Send broadcast/email to institution members | `InstitutionAdminCommunications` | **Req:** `channel`, `title`, `body`. **Res:** `created` count. |
| **Analytics (`/api/v1/analytics`)** | | | |
| `GET /api/v1/analytics/dau` | Fetch platform Daily Active Users trend | `ScopeAdminDashboard` | **Res:** 30-day `series` (Date-Value). |
| `GET /api/v1/analytics/wau` | Fetch platform Weekly Active Users trend | `ScopeAdminDashboard` | **Res:** 12-week `series` (Week-Value). |
| `GET /api/v1/analytics/engagement` | Get overall user engagement ratios | `ScopeAdminDashboard` | **Res:** DAU/WAU ratio, top events, activity rates. |
| `GET /api/v1/analytics/global-summary` | Get summary of platform growth and activity | `ScopeAdminDashboard`, `ProjectsPage` | **Res:** Project stats, growth trend, top institutions. |
| `GET /api/v1/analytics/institution/:id/dau` | Campus-scoped Daily Active Users | `InstitutionAdminAnalytics` | **Res:** 30-day `series`. |
| `GET /api/v1/analytics/institution/:id/wau` | Campus-scoped Weekly Active Users | `InstitutionAdminAnalytics` | **Res:** 12-week `series`. |
| `GET /api/v1/analytics/institution/:id/engagement` | Campus-scoped engagement breakdown | `InstitutionAdminAnalytics` | **Res:** Top events, activity rate. |
| **Uploads & Files (`/api/v1/upload` & `/api/v1/files`)** | | | |
| `POST /api/v1/upload` | Upload media (avatar, cover, resume, doc) | `ProfilePage`, `Feed`, `Projects` | **Req:** `file` (FormData), `kind`. **Res:** `File` object + URL. |
| `GET /api/v1/upload/documents` | List user's uploaded documents | `ProfilePage`, `InstitutionAdmin` | **Res:** List of `FileAsset` metadata. |
| `GET /api/v1/files/:id` | Download/Serve an uploaded file asset | Site-wide media | **Res:** Binary file content. |
| **Events (`/api/v1/events`)** | | | |
| `GET /api/v1/events` | List upcoming campus or global events | `EventsPage`, `Dashboard` | **Query:** `institutionId`. **Res:** `Event` list. |
| `POST /api/v1/events` | Create a new community event | `EventsPage` | **Req:** Event details. **Res:** `Event` object. |
| `DELETE /api/v1/events/:id` | Remove an event | `EventsPage` | **Res:** Success status. |
| `POST /api/v1/events/:id/rsvp` | Toggle seat reservation for an event | `EventsPage` | **Res:** `going` status, `rsvpsCount`, XP delta. |
| **Portfolio Items (`/api/v1/portfolio-items`)** | | | |
| `GET /api/v1/portfolio-items/me` | List personal portfolio projects/designs | `PortfolioPage`, `Dashboard` | **Res:** `PortfolioItem` list. |
| `POST /api/v1/portfolio-items` | Add a new piece to portfolio | `PortfolioPage`, `Profile` | **Req:** Details (type, skills, link, cover). **Res:** `Item`. |
| `PATCH /api/v1/portfolio-items/:id` | Update an existing portfolio item | `PortfolioPage` | **Req:** Updated fields. **Res:** Updated `Item`. |
| `DELETE /api/v1/portfolio-items/:id` | Remove a portfolio item | `PortfolioPage` | **Res:** Success status. |
| **Reports (`/api/v1/reports`)** | | | |
| `GET /api/v1/reports/my` | Get personal reporting dashboard | `ProfilePage` (Reports) | **Res:** Active assignments, recent reports, recoveries. |
| `POST /api/v1/reports` | Submit daily activity report | `ProfilePage` (Reports) | **Req:** `today_work`, `hours_spent`, `project_id`. **Res:** `Report`. |
| `GET /api/v1/reports/team` | Review reports from campus members | `FacultyPage` | **Res:** Pending reports and recovery requests. |
| `POST /api/v1/reports/recover` | Request recovery for a missed reporting day | `ProfilePage` (Reports) | **Req:** `day_key`, `reason`. **Res:** `Recovery` request. |
| `PATCH /api/v1/reports/recover/:id` | Review and resolve recovery request | `FacultyPage` | **Req:** `status`, `reviewer_note`. **Res:** Updated `Recovery`. |
| `GET /api/v1/reports/institution/:id` | Get institutional performance report | `InstitutionAdminReports` | **Res:** Metrics, growth trend, skill distribution. |
| `GET /api/v1/reports/global/leaderboard` | Get ranking of top institutions by XP | `ProjectsPage`, `LeaderboardsPage` | **Res:** `Institution` XP leaderboard items. |
| `GET /api/v1/reports/faculty/:id` | Get coordinator overview metrics | `FacultyPage`, `RoleKpiBar` | **Res:** pending reviews, project health checks. |
| **Departments (`/api/v1/departments`)** | | | |
| `GET /api/v1/departments` | List academic departments for an institution | `ProfilePage`, `InstitutionAdmin` | **Query:** `institutionId`. **Res:** `Department` list. |
| `POST /api/v1/departments` | Create a new department (Admin) | `InstitutionAdminMembers` | **Req:** `name`, `code`, `description`. **Res:** `Department`. |
| `PATCH /api/v1/departments/:id` | Update department details | `InstitutionAdminMembers` | **Req:** Updated fields. **Res:** Updated `Department`. |
| `DELETE /api/v1/departments/:id` | Remove a department | `InstitutionAdminMembers` | **Res:** Success message. |
| **Public (`/api/v1/public`)** | | | |
| `POST /api/v1/public/feedback` | Submit feedback from the site | `FeedbackPage`, `FeedbackWidget` | **Req:** `rating`, `message`, `source`. **Res:** `submission_id`. |
| `POST /api/v1/public/waitlist` | Join the Scope Connect waitlist | `WaitlistPage` | **Req:** `name`, `email`, `campus`. **Res:** Status. |
| `POST /api/v1/public/contact` | Submit general contact inquiry | `ContactPage`, `SupportPage` | **Req:** `name`, `email`, `message`. **Res:** `submission_id`. |
| `POST /api/v1/public/support-issue` | Log a platform bug or support ticket | `SupportPage` | **Req:** `message`. **Res:** `submission_id`. |
| `GET /api/v1/public/check-link` | Check if a URL is reachable and valid | `PortfolioPage` | **Query:** `url`. **Res:** `valid` status, `reason`. |
| **Proposals (`/api/v1/proposals`)** | | | |
| `GET /api/v1/proposals` | List all student-proposed project ideas | `ScopeAdmin` (Ideas Tab) | **Res:** `Proposal` list with user data. |
| `POST /api/v1/proposals` | Submit a new project idea/proposal | `ProjectsPage` (Suggest Tab) | **Req:** `title`, `problem`, `why`. **Res:** `Proposal`. |
| `PATCH /api/v1/proposals/:id` | Give feedback or update proposal status | `ScopeAdmin` (Ideas Tab) | **Req:** `status`, `admin_comment`. **Res:** Updated `Proposal`. |
| **Challenges (`/api/v1/challenges`)** | | | |
| `GET /api/v1/challenges` | List active skills challenges | `ChallengesPage` | **Res:** `Challenge` list. |
| `POST /api/v1/challenges` | Create a new challenge (Global/Campus) | `ScopeAdmin` | **Req:** Challenge details. **Res:** `Challenge` object. |
| **Config (`/api/v1/config`)** | | | |
| `GET /api/v1/config` | Fetch dynamic platform configuration | `ConfigStore`, `PlatformConfig` | **Res:** `config` settings object. |
| `PATCH /api/v1/config` | Update brand/feature toggles (Admin) | `AdminConfigPage` | **Req:** Updated `config`. **Res:** Updated `config`. |
| **Super Admin (`/api/v1/super-admin`)** | | | |
| `GET /api/v1/super-admin/command-center` | Global ops and CRM overview | `ScopeAdminDashboard` | **Res:** Full summary of institutions, visits, launches. |
| `POST /api/v1/super-admin/scope-admins` | Provision a new Scope Admin account | `ScopeAdminDashboard` (Admins) | **Req:** Auth details. **Res:** `User` object. |
| `GET /api/v1/super-admin/rbac-audit` | Platform-wide RBAC policy audit | `RbacAuditPage` | **Res:** Roles, permissions, and audit flags. |
| **Health (`/api/health`)** | | | |
| `GET /api/health` | Service health and uptime status | Monitoring | **Res:** `status: ok`, `uptime`. |

## Unused/Internal Endpoints

| API Endpoint & Method | Status / Reason |
|:--- |:--- |
| `POST /api/contact` | **Deprecated:** Superceded by versioned `/api/v1/public/contact`. |
| `POST /api/feedback` | **Deprecated:** Superceded by versioned `/api/v1/public/feedback`. |
| `POST /api/waitlist` | **Deprecated:** Superceded by versioned `/api/v1/public/waitlist`. |
| `POST /api/v1/public/ambassador` | **Inactive:** Ambassador registration is currently closed. |
| `POST /api/v1/projects/:id/apply-legacy-disabled` | **Disabled:** Legacy application flow replaced by "Commit XP" join flow. |
| `POST /api/v1/opportunities/:id/interest` | **Retired:** Legacy interest flow replaced by full application flow. |

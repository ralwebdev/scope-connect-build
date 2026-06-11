# Routing and Component Architecture

This document maps the URL paths to their respective entry files and custom React components within the Scope Connect frontend application. The application utilizes **TanStack Router** for file-based routing.

## Route Mappings

* **`/`** -> `frontend/src/routes/index.tsx`
  * `AppShell`
  * `AdSlot`
  * `Button`
  * `Card`
  * `Badge`
* **`/about`** -> `frontend/src/routes/about.tsx`
  * `AppShell`
  * `TrustFAQ`
  * `Card`
  * `Badge`
  * `Button`
* **`/admin`** -> `frontend/src/routes/admin.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
  * `Checkbox`
* **`/admin/config`** -> `frontend/src/routes/admin.config.tsx`
  * `AppShell`
  * `RoleGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
  * `Switch`
* **`/admin/campuses/new`** -> `frontend/src/routes/admin.campuses.new.tsx`
  * `AppShell`
  * `RoleGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
* **`/ambassador`** -> `frontend/src/routes/ambassador.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
  * `FeatureGate`
* **`/announcements`** -> `frontend/src/routes/announcements.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
* **`/applications`** -> `frontend/src/routes/applications.tsx`
  * `AppShell`
  * `AuthGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
* **`/auth`** -> `frontend/src/routes/auth.tsx`
  * `Button`
  * `Input`
  * `Label`
* **`/broken-link`** -> `frontend/src/routes/broken-link.tsx`
  * `AppShell`
  * `Button`
  * `Card`
* **`/campus-leader`** -> `frontend/src/routes/campus-leader.tsx`
  * `AppShell`
  * `RbacSidebar`
  * `AccessDenied`
  * `AuthGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Progress`
* **`/campus`** -> `frontend/src/routes/campus.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
* **`/challenges`** -> `frontend/src/routes/challenges.tsx`
  * `AppShell`
  * `AuthGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Progress`
* **`/community-guidelines`** -> `frontend/src/routes/community-guidelines.tsx`
  * `AppShell`
  * `LegalShell`
* **`/contact`** -> `frontend/src/routes/contact.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
* **`/cookie-policy`** -> `frontend/src/routes/cookie-policy.tsx`
  * `AppShell`
  * `LegalShell`
* **`/dashboard`** -> `frontend/src/routes/dashboard.tsx`
  * `AppShell`
  * `AuthGate`
  * `AdSlot`
  * `RetentionLayer`
  * `PortfolioSpotlight`
  * `CredibilityPanel`
  * `DropoffNudge`
  * `Card`
  * `Badge`
  * `Button`
  * `Progress`
  * `CountUp`
* **`/dev/build-diagnostics`** -> `frontend/src/routes/dev.build-diagnostics.tsx`
  * `AppShell`
  * `RbacSidebar`
  * `AccessDenied`
  * `Card`
  * `Badge`
  * `Input`
  * `Button`
  * `Tabs`
  * `TabsList`
  * `TabsTrigger`
  * `TabsContent`
* **`/events`** -> `frontend/src/routes/events.tsx`
  * `AppShell`
  * `FeatureGate`
  * `Card`
  * `Badge`
  * `Button`
* **`/faculty`** -> `frontend/src/routes/faculty.tsx`
  * `AppShell`
  * `RbacSidebar`
  * `AccessDenied`
  * `AuthGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Progress`
* **`/faqs`** -> `frontend/src/routes/faqs.tsx`
  * `AppShell`
  * `Badge`
  * `FAQSection`
* **`/feed`** -> `frontend/src/routes/feed.tsx`
  * `AppShell`
  * `AdSlot`
  * `FeatureGate`
  * `FeedComposer`
  * `Card`
  * `Badge`
  * `Button`
* **`/feedback`** -> `frontend/src/routes/feedback.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
  * `Button`
  * `Label`
  * `Textarea`
* **`/forms/$formSlug`** -> `frontend/src/routes/forms.$formSlug.tsx`
  * `AppShell`
  * `AccessDenied`
  * `Card`
  * `Badge`
  * `Button`
* **`/innovation-lab`** -> `frontend/src/routes/innovation-lab.tsx`
  * `AppShell`
  * `Badge`
  * `Button`
  * `Card`
  * `FAQSection`
* **`/institution-admin`** -> `frontend/src/routes/institution-admin.tsx`
  * `AppShell`
  * `RbacSidebar`
  * `AccessDenied`
  * `FeedComposer`
  * `Card`
  * `Button`
  * `Badge`
  * `Input`
  * `Label`
  * `Textarea`
  * `Tabs`
  * `TabsList`
  * `TabsTrigger`
  * `TabsContent`
  * `Dialog`
  * `DialogContent`
  * `DialogHeader`
  * `DialogTitle`
  * `DialogTrigger`
  * `DialogFooter`
  * `Table`
  * `TableBody`
  * `TableCell`
  * `TableHead`
  * `TableHeader`
  * `TableRow`
* **`/institution-admin/analytics`** -> `frontend/src/routes/institution-admin.analytics.tsx`
  * (Inherits UI from `/institution-admin` layout)
* **`/institution-admin/communications`** -> `frontend/src/routes/institution-admin.communications.tsx`
  * (Inherits UI from `/institution-admin` layout)
* **`/institution-admin/members`** -> `frontend/src/routes/institution-admin.members.tsx`
  * (Inherits UI from `/institution-admin` layout)
* **`/institution-admin/reports`** -> `frontend/src/routes/institution-admin.reports.tsx`
  * (Inherits UI from `/institution-admin` layout)
* **`/institution/reports`** -> `frontend/src/routes/institution.reports.tsx`
  * `AppShell`
  * `RbacSidebar`
  * `Badge`
  * `Button`
  * `Card`
* **`/leaderboards`** -> `frontend/src/routes/leaderboards.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
* **`/notifications`** -> `frontend/src/routes/notifications.tsx`
  * `AppShell`
  * `AuthGate`
  * `RoleNotificationCenter`
  * `Badge`
* **`/opportunities`** -> `frontend/src/routes/opportunities.tsx`
  * `AppShell`
  * `AuthGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
  * `Dialog`
  * `DialogContent`
  * `DialogDescription`
  * `DialogFooter`
  * `DialogHeader`
  * `DialogTitle`
* **`/ops`** -> `frontend/src/routes/ops.tsx`
  * `AppShell`
  * `ExportResultsCard`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
* **`/portfolio`** -> `frontend/src/routes/portfolio.tsx`
  * `AppShell`
  * `AuthGate`
  * `FeatureGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
  * `Progress`
* **`/privacy`** -> `frontend/src/routes/privacy.tsx`
  * `AppShell`
  * `LegalShell`
* **`/profile`** -> `frontend/src/routes/profile.tsx`
  * `AppShell`
  * `AuthGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
  * `Progress`
  * `Select`
  * `SelectContent`
  * `SelectItem`
  * `SelectTrigger`
  * `SelectValue`
  * `Tabs`
  * `TabsList`
  * `TabsTrigger`
  * `TabsContent`
* **`/projects`** -> `frontend/src/routes/projects.tsx`
  * `AppShell`
  * `ChallengeCountdown`
  * `TrustFAQ`
  * `ScopeVerifiedBadge`
  * `PublishedStrip`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
  * `Switch`
  * `ConfettiBurst`
* **`/refer`** -> `frontend/src/routes/refer.tsx`
  * `AppShell`
  * `AuthGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
* **`/scope-admin`** -> `frontend/src/routes/scope-admin.tsx`
  * `AppShell`
  * `RbacSidebar`
  * `AccessDenied`
  * `FeedComposer`
  * `Card`
  * `Button`
  * `Badge`
  * `Input`
  * `Label`
  * `Textarea`
  * `Select`
  * `SelectContent`
  * `SelectItem`
  * `SelectTrigger`
  * `SelectValue`
  * `Tabs`
  * `TabsList`
  * `TabsTrigger`
  * `TabsContent`
  * `Dialog`
  * `DialogContent`
  * `DialogHeader`
  * `DialogTitle`
  * `DialogTrigger`
  * `DialogDescription`
* **`/scope-admin/dashboard`** -> `frontend/src/routes/scope-admin.dashboard.tsx`
  * `ScopeAdminDashboardPage`
* **`/scope-admin/institutions`** -> `frontend/src/routes/scope-admin.institutions.tsx`
  * `ScopeAdminInstitutionsPage`
* **`/scope-admin/mou-pipeline`** -> `frontend/src/routes/scope-admin.mou-pipeline.tsx`
  * `ScopeAdminMouPipelinePage`
* **`/scope-admin/reports`** -> `frontend/src/routes/scope-admin.reports.tsx`
  * `ScopeAdminReportsPage`
* **`/scope-admin/visits`** -> `frontend/src/routes/scope-admin.visits.tsx`
  * `ScopeAdminVisitsPage`
* **`/scope-super-admin`** -> `frontend/src/routes/scope-super-admin.tsx`
  * `AppShell`
  * `RbacSidebar`
  * `AccessDenied`
  * `DrilldownCard`
  * `Card`
  * `Button`
  * `Badge`
  * `Switch`
  * `Tabs`
  * `TabsList`
  * `TabsTrigger`
  * `TabsContent`
  * `Input`
  * `Label`
  * `Dialog`
  * `DialogContent`
  * `DialogHeader`
  * `DialogTitle`
  * `DialogTrigger`
* **`/scope-super-admin/rbac-audit`** -> `frontend/src/routes/scope-super-admin.rbac-audit.tsx`
  * `AppShell`
  * `RbacSidebar`
  * `AccessDenied`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Tabs`
  * `TabsList`
  * `TabsTrigger`
  * `TabsContent`
* **`/settings`** -> `frontend/src/routes/settings.tsx`
  * `AppShell`
  * `AuthGate`
  * `Card`
  * `Badge`
  * `Button`
  * `Switch`
  * `Input`
  * `Label`
* **`/support`** -> `frontend/src/routes/support.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `Textarea`
* **`/terms`** -> `frontend/src/routes/terms.tsx`
  * `AppShell`
  * `LegalShell`
* **`/u/$handle`** -> `frontend/src/routes/u.$handle.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
  * `Button`
* **`/unauthorized`** -> `frontend/src/routes/unauthorized.tsx`
  * `AppShell`
  * `Button`
* **`/updates`** -> `frontend/src/routes/updates.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
  * `FeatureGate`
* **`/waitlist`** -> `frontend/src/routes/waitlist.tsx`
  * `AppShell`
  * `Card`
  * `Badge`
  * `Button`
  * `Input`
  * `Label`
  * `FeatureGate`

## Shared Global Components

These components manage the application's shell and state-driven UI across most routes:

* **`AppShell`**: Global layout wrapper containing `Navbar`, `Footer`, and `MobileDock`.
* **`RoleNavbar`**: Role-based navbar dispatcher that renders specific components like `StudentNavbar`, `FacultyNavbar`, etc.
* **`AuthGate`**: Authentication guard for protected routes.
* **`RoleGate` & `AccessDenied`**: Components for enforcing Role-Based Access Control.
* **`FeatureGate`**: Feature flag gate.
* **`FAQSection`**: Reusable FAQ accordion block.
* **`LegalShell`**: Standard template for legal and policy routes.

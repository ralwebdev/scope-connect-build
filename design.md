@@ -0,0 +1,151 @@
# Design Documentation — Scope Connect

## 1. Project Overview
Scope Connect is a curated campus innovation network designed for Gen Z student builders in India. It serves as a comprehensive ecosystem for shipping projects, participating in hackathons, managing campus chapters, and connecting with recruiters. The platform uses a sophisticated gamification system (XP, Streaks, National Ranks) to drive engagement and proof-of-work validation.

Key business domains included:
- **Builder Workspace**: Personal dashboard, project management, and portfolio building.
- **Institutional Hub**: CRM and management portal for university admins and faculty coordinators.
- **Opportunity Engine**: A merit-gated marketplace for internships, research roles, and leadership positions.
- **Daily Reporting**: A trust-first accountability module for tracking ongoing project contributions.
- **Platform Admin**: Command center for global configuration, RBAC audits, and moderation.

---

## 2. Technology Stack
- **Framework**: React 19 (via TanStack Start)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: TanStack Router (File-based routing)
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Radix UI (standardized via shadcn/ui)
- **Icons**: Lucide React
- **Animations**: tw-animate-css, Custom Keyframes (shimmers, pulses, floats)
- **State Management**: TanStack Query (intended for server-state migration)

---

## 3. Folder Structure
```text
src/
  api/              # Pure API call functions (Proposed)
  components/       # React components
    ui/             # shadcn/ui primitives (Button, Card, etc.)
    site/           # Layout chrome (Navbar, AppShell, Footer)
    reporting/      # Domain: Daily reporting dialogs/views
    execution/      # Domain: Project execution panels
    governance/     # Domain: Content moderation & creation
    discoverability/# Domain: Search & SEO blocks
  hooks/            # Custom React hooks (use-rbac, use-session, etc.)
  lib/              # Logic & Configuration
    platform-config.ts # White-label & Feature flag settings
    rbac.ts         # Role definitions & Permissions
    scope-store.ts  # Client-side state logic (to be migrated)
  routes/           # TanStack Router file-based route tree
  styles.css        # Global CSS + Design System Theme
```

---

## 4. Design System

### 4.1 Color Palette (OKLCH)
The system uses the OKLCH color space for perceptual consistency across light and dark modes.

| Variable | HEX (Approx) | Purpose |
| :--- | :--- | :--- |
| `--primary` | `#0B1020` | Deep Navy (Background/Primary Text) |
| `--brand` | `#E63946` | Energetic Red (Buttons, Progress, Alerts) |
| `--cyan` | `#00D1FF` | Accent Glow (Highlight, Verification) |
| `--success` | `#34D399` | Emerald (Approval, Positive Delta) |

### 4.2 Typography
- **Primary Font**: Inter (ui-sans-serif)
- **Features**: Optimized for legibility with `cv02`, `cv03`, `cv04`, `cv11` OpenType features enabled.
- **Heading Style**: Tight tracking (`tracking-tight`), balanced text wraps (`text-balance`).

### 4.3 Layout & UI Logic (Adaptive Floating Glass)
The platform uses an **Adaptive Floating Glass Navbar** (`NavbarShell.tsx`) which is the central design element:
- **Capsule Design**: A rounded-full capsule with `backdrop-blur-xl` and dynamic width.
- **Scroll Behavior**: Collapses into a compact pill when scrolling down; expands when scrolling up or at the top.
- **Role Dispatcher**: The `RoleNavbar.tsx` dynamically mounts a different "Center Brain" (KPI Rail) based on the user's role (e.g., Student sees XP/Streak, Admin sees Chapter count).
- **Identity Glow**: Each role has a unique accent color (glow) applied to the navbar borders and role badges.

---

## 5. Route Registry & User Flows

### 5.1 Route Mapping (TanStack Router)
The platform features a flat, file-based route structure.

| Path | Description | Access Level |
| :--- | :--- | :--- |
| `/` | Landing Page | Public |
| `/auth` | Login / Signup | Public |
| `/dashboard` | Main Builder Hub | Student |
| `/projects` | Project Gallery | Student+ |
| `/feed` | Social Activity Feed | Student+ |
| `/portfolio` | Proof of Work Builder | Student |
| `/profile` | User/Org Profile | Authenticated |
| `/reporting` | Daily Check-ins | Student+ |
| `/opportunities-hub` | Gated Roles/Internships | Student+ |
| `/campus` | Campus Discovery | Student+ |
| `/events` | Event Calendar | Public+ |
| `/leaderboards` | National Rankings | Public+ |
| `/institution-admin` | Institutional Hub | Inst Admin+ |
| `/institution-admin/members` | Member Approval Table | Inst Admin+ |
| `/institution-admin/analytics` | Campus Stats | Inst Admin+ |
| `/institution-admin/communications`| Chapter Broadcasts | Inst Admin+ |
| `/scope-admin` | Territory CRM | Scope Admin+ |
| `/scope-super-admin` | Global Command Center | Super Admin |
| `/scope-super-admin/rbac-audit` | Permission Review | Super Admin |
| `/admin` | General Operations | Admin roles |
| `/admin/config` | Feature Flags | Super Admin |
| `/admin/campuses/new` | Campus Provisioning | Scope Admin+ |
| `/execution` | Project Workspace | Active Builder |
| `/execution/$projectId` | Specific Project Board | Project Member |
| `/challenges` | Chapter Challenges | Student+ |
| `/waitlist` | Early Access Signup | Public |
| `/support` | Help & Documentation | Public |
| `/privacy` | Legal: Privacy | Public |
| `/terms` | Legal: Terms | Public |

### 5.2 User Journeys

#### A. The Builder Onboarding
1. **Public Discovery**: User lands on `/`, explores `/projects` and `/feed` in read-only mode.
2. **Identity Creation**: User signs up at `/auth`, selects interests, and receives a National Rank.
3. **Activation**: User completes profile at `/profile`, joins a chapter at `/campus`, and earns first XP.

#### B. Institutional Provisioning
1. **Sales CRM**: Scope Admin manages lead in `/scope-admin`.
2. **Credential Handover**: Once MoU is signed, credentials generated for Institutional Admin.
3. **Campus Setup**: Inst Admin logs into `/institution-admin`, completes `/institution-admin/profile`, and approves students in `/members`.

#### C. Project Execution & Trust
1. **Discovery**: Student finds opportunity in `/opportunities-hub`.
2. **Collaboration**: Student joins project, appearing in `/execution`.
3. **Accountability**: Student submits daily updates in `/reporting`.
4. **Recognition**: Completed projects automatically populate `/portfolio`.

---

## 6. Implementation Details

### 6.1 Role-Based Access Control (RBAC)
Roles are managed via `src/lib/rbac.ts` and `src/hooks/use-rbac.ts`:
- **Identity Heuristics**: Roles can be derived from email patterns for demo purposes.
- **Permission Gating**: Individual features use `usePermission(key)` to conditionally render UI or block access.

### 6.2 State Hydration
The app uses a `hydration.boot()` sequence in `scope-store.ts` to:
1. Validate `localStorage` schema version.
2. Repair/Purge corrupt JSON slices.
3. Seed default notifications and data if empty.

### 6.3 Animation System
Custom CSS animations are used for feedback loops:
- `animate-xp-burst`: Visual burst when earning points.
- `animate-nav-glow`: Pulsing ring around the active role badge.
- `animate-flame-pulse`: Dynamic effect for hot streaks.
- `nav-shimmer`: Sweep effect on first client-side paint after hydration.
# XP Engine Workflow Audit

## Existing Implemented Features
- Backend Express API with Mongoose models for users, profiles, projects, project applications, challenges, opportunities, opportunity applications, daily reports, notifications, and profile activity.
- `backend/src/utils/xp-engine.js` centralizes most positive and negative XP changes through `awardXp` and `revokeXp`.
- Project creators are gated by `create_project` permission, currently granted to faculty, institution admins, scope admins, and super admins.
- Project applications exist through `POST /api/v1/projects/:id/apply`.
- Project submissions and submission review exist on `Application.submission`.
- Daily report APIs exist under `backend/src/routes/reports.js`.
- Opportunity creation, unlock, application, and status review exist under `backend/src/routes/opportunities.js`.
- Challenge creation/listing exists under `backend/src/routes/challenges.js`.
- Frontend has pages for projects, challenges, opportunities, institution/admin views, reports, and profile.

## Partially Implemented Features
- XP ledger exists as `ProfileActivity(kind: "xp_ledger")`, but it does not provide the required transaction fields consistently and lacks a dedicated collection.
- Projects support core listing/application but not the full v2 project configuration fields, role requirements, daily reporting flags, stake policy, or reward policy.
- Student project entry is still phrased and modeled as application-first; it does not reserve committed XP or create project rooms.
- Daily reporting stores submissions, but missed-report penalty automation is limited.
- Opportunities check XP and profile links but do not fully model challenge score, project completions, institution, skills, or verification criteria.
- Challenges are separate from projects, but participation, staking, submission, scoring, leaderboard, badge, reward, and certificate outputs are missing.

## Missing Features
- Dedicated auditable XP transaction log.
- XP reserve/lock/refund/forfeit actions for project commitments and challenge stakes.
- Project room auto-creation, temporary coordinator assignment, and locked room state.
- Project tasks with lifecycle and evidence.
- Weighted contribution score calculation.
- Project completion settlement with stake refund, reward pool distribution, performance multiplier, low-performer reduction, and inactivity penalties.
- Anti-abuse checks for concurrent project cap, free rider signals, repeated role farming, and suspicious XP velocity.
- Configurable global constants module.

## Broken or Inconsistent Workflow Areas
- Some routes mutate `profile.xp` directly instead of using the XP engine.
- Opportunity unlock/application deducts XP directly and calls it an unlock cost, which is acceptable for opportunities but must still be transaction logged.
- Project application currently grants XP on apply, which conflicts with “Commit XP” project entry semantics.
- Notification schema was narrower than notification kinds used by project/opportunity routes.
- Project submission notification kinds are used but not included in the schema.

## Files That Need Changes
- Backend:
  - `backend/src/utils/xp-engine.js`
  - `backend/src/utils/roles.js`
  - `backend/src/models/index.js`
  - `backend/src/models/Profile.js`
  - `backend/src/models/Project.js`
  - `backend/src/models/Application.js`
  - `backend/src/models/Challenge.js`
  - `backend/src/models/Notification.js`
  - `backend/src/routes/projects.js`
  - `backend/src/routes/challenges.js`
  - `backend/src/routes/opportunities.js`
  - `backend/src/routes/users.js`
  - `backend/src/routes/reports.js`
  - new XP/project workflow models and constants.
- Frontend:
  - `frontend/src/lib/api/endpoints.ts`
  - `frontend/src/routes/projects.tsx`
  - `frontend/src/routes/opportunities.tsx`
  - `frontend/src/routes/scope-admin.tsx`

## Database / Model Gaps
- Need `XpTransaction`.
- Need `ProjectRoom`.
- Need `ProjectTask`.
- Need `ChallengeParticipation`.
- Need profile fields for reserved/staked XP.
- Need application fields for committed XP, project role, contribution score, reward eligibility, settlement state, and coordinator flag.
- Need project fields for full creator configuration and reward/stake rules.

## API Gaps
- Project join/commit endpoint.
- Project room read/update endpoint.
- Project task CRUD and evidence endpoint.
- Project completion/settlement endpoint.
- Challenge join/submit/score/leaderboard endpoints.
- Opportunity eligibility endpoint with structured reasons.
- Anti-abuse/status endpoint.

## Frontend UI Gaps
- Project cards/forms do not expose every v2 project configuration field.
- Project join CTA should say “Commit XP” instead of application/reward-only language where stake is involved.
- Project room and task UX is not a complete dedicated experience yet.
- Challenge participation/scoring/leaderboard UI is still mostly static.

## Permission / Security Gaps
- Task creation needs creator/faculty/coordinator/mentor enforcement.
- Temporary Coordinator must be prevented from editing reward rules, project logic, XP, or creator configuration.
- Project settlement should be restricted to project creator, faculty, institution admin, scope admin, or super admin.
- Anti-abuse checks should block or flag excessive concurrent projects and suspicious XP velocity.

## Suggested Patch Order
1. Add constants and dedicated XP transaction logging.
2. Update XP engine to log every XP movement with before/after balances.
3. Replace direct XP mutations in core routes with XP engine calls.
4. Extend project/application models for commitment, contribution, reward, and project configuration fields.
5. Add project room, task, challenge participation models and route handlers.
6. Add eligibility/anti-abuse helpers and enforce them on project join.
7. Patch frontend wording and API client wrappers.
8. Verify build and backend syntax.

## Patch Implemented
- Added global XP workflow constants and contribution weights in `backend/src/utils/xp-constants.js`.
- Added dedicated `XpTransaction` logging and wired `awardXp`, `revokeXp`, `reserveXp`, `refundReservedXp`, and `forfeitReservedXp`.
- Extended project/application/profile/challenge/daily-report models for XP commitment, reserved XP, project configuration, contribution scoring, challenge scoring, and report deliverables/tomorrow plan.
- Added `ProjectRoom`, `ProjectTask`, and `ChallengeParticipation` models.
- Patched project join flow to validate eligibility, reserve committed XP, create/lock rooms, assign first participant as Temporary Coordinator, and preserve old `/apply` frontend compatibility.
- Added project room update, task lifecycle/evidence, contribution scoring, project completion settlement, and project abuse-check endpoints.
- Added challenge join, stake, submit, score, reward, and leaderboard endpoints without project room/daily reporting coupling.
- Patched opportunities to unlock by eligibility instead of spending XP and added an eligibility endpoint.
- Patched frontend project wording/API to use "Commit XP" and opportunity wording to avoid XP purchase language.

## Follow-up Patch Implemented
- Added frontend project room workspace in `frontend/src/routes/projects.tsx` for accepted participants, including room status, participant progress/score visibility, risk signals, daily sync notes, meeting notes, task creation, task status changes, evidence submission, and access to final submission.
- Added frontend project room/task API wrappers in `frontend/src/lib/api/endpoints.ts`.
- Expanded anti-abuse checks in `backend/src/routes/projects.js` to flag max concurrent projects, repeated same-role participation, 24-hour XP spikes, 7-day XP velocity, no reporting, low deliverables, and low contribution score.
- Added challenge stake refund/forfeit policy fields to `Challenge` and stake settlement fields to `ChallengeParticipation`.
- Added automatic challenge stake settlement on score based on `stakeRefundPolicy` and `minimumScoreToRefund`.
- Added manual challenge stake settlement endpoint `PATCH /api/v1/challenges/:id/stake/:participationId` for refund, forfeit, and partial refund outcomes.

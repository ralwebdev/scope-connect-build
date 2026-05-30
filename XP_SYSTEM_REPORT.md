# Technical Report: XP System Architecture

This report analyzes the Experience Points (XP) system within the Scope Connect platform, focusing on the `xp-engine.js` logic and the `xp-constants.js` configuration.

### 1. High-Level System Overview
The XP (Experience Points) system is a gamification sub-system designed to drive user engagement and progression. It handles the awarding of XP for platform activities, manages user levels based on accumulated points, and supports sophisticated stake/reserve mechanics for projects and challenges to ensure user commitment and accountability.

### 2. File Analysis: `xp-constants.js`
* **Purpose:** This file acts as the central configuration repository for the XP system, defining platform-wide limits, weights for contribution scoring, and standardized action types for auditing.
* **Key Configurations:**
    * `MAX_CONCURRENT_PROJECTS`: Limits students to 3 active projects.
    * `MIN_PROJECT_CONTRIBUTION_SCORE`: Sets the 70% threshold for reward eligibility.
    * `CONTRIBUTION_WEIGHTS`: Defines the balance between deliverables (40%), reporting (20%), reviews (15% each), and attendance (10%).
    * `XP_ACTIONS`: A standardized set of strings (e.g., `PROJECT_STAKE_RESERVED`, `CHALLENGE_REWARD_GRANTED`) used to categorize transactions in the database for auditing and analytics.
* **Design Pattern:** It uses simple object exports (`export const ...`). This provides a clear, immutable-in-practice structure that is easy to import across the backend without complex initialization.

### 3. File Analysis: `xp-engine.js`
* **Purpose:** This file contains the core business logic for the XP system, providing an abstraction layer over Mongoose models to handle XP transactions safely, including level calculations, institution-wide XP tracking, and multi-document updates.
* **Core Functions/Methods:**
    * `awardXp`: The primary entry point for granting points. It takes `userId`, `rule`, and an optional `dedupeKey`. It updates the user's XP, recalculates their level, optionally increments the institution's total XP, and logs both a `ProfileActivity` and an `XpTransaction`.
    * `reserveXp`: Implements "commitment" logic by checking if a user has sufficient points and then moving them from the user's main `xp` balance to a `reservedXp` bucket. This "locks" the points during project or challenge participation.
    * `refundReservedXp` / `forfeitReservedXp`: Handles the resolution of locked XP. `refund` moves points back to the main balance (e.g., project success), while `forfeit` removes them permanently from the `reservedXp` bucket (e.g., project failure or inactivity).
    * `levelFromXp`: A pure utility function that maps XP totals to a discrete level (1-5) based on fixed thresholds (500, 1500, 3500, 6500).
* **State Management:** This engine does not manage its own internal state. It acts as a stateless utility/controller that operates on persistent state stored in MongoDB via Mongoose models (`Profile`, `Institution`, `XpTransaction`).

### 4. Workflow & Data Flow
Lifecycle of a "Project Join" (Commit XP) event:
1. **Trigger:** A user joins a project. The route handler calls `reserveXp` with the project's `xpCommitmentStake`.
2. **Validation:** `reserveXp` fetches the user's `Profile` and validates that `profile.xp >= amount`.
3. **Calculation:** The engine subtracts the amount from `profile.xp`, adds it to `profile.reservedXp`, and recalculates the user's level via `levelFromXp`.
4. **Persistence:** The engine saves the `Profile`, decrements the `Institution.totalStudentXp` (as the XP is no longer "free"), and creates an `XpTransaction` record with `balance_before` and `balance_after`.
5. **Update:** The engine returns the new balances to the caller, allowing the UI to reflect the "Reserved" status of the points.

### 5. Integration Points & API
The module exposes the following asynchronous functions for system-wide use:
* `awardXp(params)`: Grant points for actions defined in `XP_RULES`.
* `revokeXp(params)`: Deduct points (e.g., for cancelling an RSVP).
* `reserveXp(params)`: Lock points for a project or challenge stake.
* `refundReservedXp(params)`: Return locked points to the user's balance.
* `forfeitReservedXp(params)`: Permanently remove locked points as a penalty.
* `levelFromXp(xp)`: Utility to calculate level for a given XP value.
* `XP_RULES`: A configuration object mapping action keys (e.g., `signup_bonus`) to point amounts and labels.

### 6. Vulnerabilities or Code Smells (Optional)
* **Hardcoded Levels:** The `levelFromXp` function uses hardcoded thresholds. These should ideally be moved to `xp-constants.js` to allow for easier tuning without touching logic.
* **Potential Race Conditions:** The engine uses `profile.save()`. In high-concurrency environments, if multiple XP events hit the same user simultaneously, updates could be lost. Using MongoDB's `$inc` operator for the `Profile` update (similar to how `Institution` is handled) would be more robust.
* **Audit Trail Dependency:** `recordTransaction` uses a `.catch(() => null)`, meaning if the transaction log fails, the XP change still persists but the audit trail is lost silently.
* **Deduplication Scope:** `awardXp` supports deduplication via `dedupeKey`, but `reserveXp` only deduplicates against the `action` and `dedupeKey` in `XpTransaction`, not `ProfileActivity`, which could lead to minor logging inconsistencies if reused across different contexts.

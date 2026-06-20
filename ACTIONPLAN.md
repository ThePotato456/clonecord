# ACTIONPLAN.md

Purpose: persistent, low-friction execution tracker for the Clonecord refactor so work can resume cleanly after session interruption or model/provider switch.

## Status legend
- [ ] Not started
- [-] In progress
- [x] Completed
- [!] Blocked / needs decision
- [~] Deferred / later phase

## Tracking rules
- Update this file whenever a task starts, completes, is blocked, or changes scope.
- Keep statuses current before ending a work session.
- Add short notes under each item when implementation details or blockers matter.
- If a task splits, keep the parent item and add indented child items.
- Do not remove completed items; preserve history for handoff continuity.

## Canonical references
- Detailed plan: `.hermes/plans/2026-06-20_170819-clonecord-refactor-plan.md`
- Repository: `clonecord`
- Current goal: refactor the prototype into a safer, more maintainable codebase without losing local functionality

---

# Refactor program status

## Phase 1 — Lock down authorization and add tests

### 1. Backend test harness
- [-] Extract reusable app factory from `src/backend/server.js`
- [ ] Add backend test dependencies and scripts in `package.json`
- [ ] Create isolated backend test setup and seeded datastore helpers
- [ ] Add first backend smoke test
- Notes:
  - This is the first execution milestone because later auth fixes need regression tests.
  - Session started Phase 1.1 implementation on 2026-06-20.

### 2. Centralize access-control helpers
- [ ] Create `src/backend/lib/access.js`
- [ ] Define shared helpers for user/server/channel/message visibility
- [ ] Replace ad hoc membership checks in route modules with helper usage
- Notes:
  - Goal is one authoritative policy surface for permissions.

### 3. Fix channel message read authorization
- [ ] Add failing test for unauthorized `GET /api/messages/channel/:channelId`
- [ ] Require validated server/channel scope on channel message reads
- [ ] Make unauthorized access fail consistently
- [ ] Verify authorized access still succeeds

### 4. Fix single-message read authorization
- [ ] Add failing test for unauthorized `GET /api/messages/:messageId`
- [ ] Enforce channel membership / DM participant rules
- [ ] Reuse shared message visibility helper

### 5. Tighten user data exposure
- [ ] Decide intended visibility policy for user/profile/channel/server metadata
- [ ] Restrict `GET /api/users/:userId`
- [ ] Restrict `GET /api/users/:userId/channels`
- [ ] Restrict `GET /api/users/:userId/servers`
- Notes:
  - May require a product decision on self-only vs same-server visibility.

### 6. Add authz regression coverage
- [ ] Cover same-user vs different-user access
- [ ] Cover same-server vs different-server access
- [ ] Cover channel messages vs DMs
- [ ] Cover valid/missing/invalid token cases

---

## Phase 2 — Validation and backend route cleanup

### 7. Add request validation helpers
- [ ] Create validation helper module(s)
- [ ] Validate params, query, enums, and required body fields consistently
- [ ] Apply validation to auth, server, channel, message, and user routes

### 8. Standardize error response helpers
- [ ] Create shared HTTP/error helper module
- [ ] Normalize bad request / forbidden / not found responses
- [ ] Add safe user serialization helper

### 9. Separate app wiring from boot logic
- [ ] Create `src/backend/app.js`
- [ ] Keep `src/backend/server.js` focused on env/load/listen only
- [ ] Ensure tests can import app without opening a port

---

## Phase 3 — Persistence boundary and datastore migration

### 10. Add repository layer over JSON store
- [ ] Create `src/backend/repositories/`
- [ ] Introduce users/servers/channels/messages repository modules
- [ ] Stop route handlers from mutating raw db collections directly

### 11. Add service layer
- [ ] Create message service
- [ ] Create server service
- [ ] Create user service
- [ ] Move business rules out of route handlers

### 12. Migrate persistence to SQLite
- [ ] Design schema for users, servers, channels, memberships, messages
- [ ] Implement SQLite-backed repositories
- [ ] Add JSON-to-SQLite migration/import path
- [ ] Switch development default to SQLite after parity is verified
- [~] Consider later Postgres path only after SQLite is stable
- Notes:
  - Largest and riskiest refactor item; do not begin before Phase 1 is stable.

---

## Phase 4 — Frontend maintainability refactor

### 13. Centralize API and auth helpers
- [ ] Create `frontend/src/lib/api.ts`
- [ ] Create `frontend/src/lib/auth.ts`
- [ ] Replace repeated fetch/auth header logic in components/pages

### 14. Extract shared hooks
- [ ] Add current-user hook
- [ ] Add servers/channels hooks
- [ ] Add channel-messages and DM-messages hooks
- [ ] Thin out page components after extraction

### 15. Replace prompt/alert UX
- [ ] Replace `window.prompt` create-server flow
- [ ] Replace `window.alert` error flow
- [ ] Add in-app create-server / create-channel UI components

### 16. Consolidate socket event handling
- [ ] Standardize socket subscription lifecycle
- [ ] Reduce repeated `connectSocket(token)` usage across components
- [ ] Consider shared socket hooks/helpers for channels and DMs

---

## Phase 5 — Tooling, dependency, and docs cleanup

### 17. Remove unused dependencies
- [ ] Verify Redis libraries are unused
- [ ] Remove `ioredis` and `redis` if confirmed unnecessary
- [ ] Regenerate lockfile and verify app still builds/runs

### 18. Add quality gates and CI
- [ ] Add or tighten lint/test scripts
- [ ] Add backend test command to routine checks
- [ ] Add CI workflow for tests + frontend build

### 19. Plan frontend tooling migration
- [ ] Create separate CRA → Vite migration plan
- [~] Execute only after functional/security refactors settle

---

# Open decisions / blockers
- [!] Decide visibility policy for user profile and metadata routes
- [!] Decide whether DMs should require shared-server membership or allow any registered user
- [!] Decide whether this refactor targets production readiness or remains local/demo-first

---

# Current session snapshot
- Current state: planning complete, execution not yet started
- Highest-priority next action: begin Phase 1, item 1 (backend test harness)
- Last updated: 2026-06-20

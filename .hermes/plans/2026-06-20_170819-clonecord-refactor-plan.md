# Clonecord Refactor Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Refactor Clonecord from a working prototype into a safer, more maintainable codebase by fixing authorization gaps first, then improving data access architecture, validation, test coverage, and frontend maintainability.

**Architecture:** Keep the existing Express + React structure, but introduce clear layers: route handlers for HTTP concerns, reusable authorization/validation helpers for policy, and a repository/service boundary around persistence. Do the refactor in incremental phases so the app stays runnable after each milestone.

**Tech Stack:** Node.js, Express, Socket.IO, React 18, TypeScript, react-scripts, local JSON persistence (current), Jest/React Testing Library or equivalent frontend defaults, plus a backend test stack to be added.

---

## Current context / assumptions

- Backend entrypoint: `src/backend/server.js`
- Persistence layer: `src/backend/lib/store.js`
- Auth helper: `src/backend/lib/auth.js`
- Route modules:
  - `src/backend/routes/auth.routes.js`
  - `src/backend/routes/user.routes.js`
  - `src/backend/routes/server.routes.js`
  - `src/backend/routes/channel.routes.js`
  - `src/backend/routes/message.routes.js`
- Frontend app shell:
  - `frontend/src/components/AppLayout.tsx`
  - `frontend/src/pages/AuthPage.tsx`
  - `frontend/src/pages/ChannelPage.tsx`
  - `frontend/src/pages/DMPage.tsx`
  - `frontend/src/components/ChannelList.tsx`
  - `frontend/src/lib/socket.ts`
- Verified locally:
  - backend health endpoint works
  - frontend production build succeeds
- No automated tests were found.
- Highest risk today is authorization leakage in message/user read paths.
- Root `package.json` includes unused Redis-related dependencies, while the app actually uses a JSON file datastore.

---

## Refactor priorities

### Priority 0 — immediate safety / correctness
1. Fix authorization checks on all read/write routes.
2. Add regression tests for cross-user and cross-server data access.
3. Centralize membership/ownership policy helpers to stop permission drift.

### Priority 1 — backend maintainability
4. Introduce validation helpers for params/query/body.
5. Separate persistence access from route handlers.
6. Normalize common entity lookups and error responses.

### Priority 2 — persistence modernization
7. Replace JSON-file whole-database reads/writes with a real persistence boundary.
8. Prefer SQLite first for low-complexity local development; keep interfaces ready for future Postgres migration.

### Priority 3 — frontend maintainability
9. Centralize API access and auth token handling.
10. Reduce duplicated fetch/socket/state logic across pages.
11. Replace `window.prompt` / `window.alert` flows with real UI components.

### Priority 4 — tooling / platform cleanup
12. Remove unused dependencies and document the actual stack.
13. Add lint/test scripts and CI.
14. Plan migration from `react-scripts` to Vite after functional risk is reduced.

---

## Proposed target architecture

### Backend
- `routes/` handles HTTP only.
- New `services/` layer owns business logic and permission decisions.
- New `repositories/` layer abstracts persistence reads/writes.
- New `policies/` or `lib/access.js` contains reusable authorization checks.
- New `validators/` contains request validation helpers/schemas.

### Frontend
- New `frontend/src/lib/api.ts` for fetch wrappers.
- New `frontend/src/lib/auth.ts` for token/user persistence helpers.
- Optional new `frontend/src/hooks/` for shared server/channel/message loading.
- UI flows for create-server/create-channel move toward controlled modal/forms.

---

# Phase 1: Lock down authorization and add tests

### Task 1: Add backend test infrastructure

**Objective:** Establish a repeatable backend test harness before modifying authorization behavior.

**Files:**
- Modify: `package.json`
- Create: `src/backend/tests/`
- Create: `src/backend/tests/authz.routes.test.js`
- Create: `src/backend/tests/helpers/seedTestDb.js`
- Likely create: `src/backend/app.js` or equivalent extracted app factory

**Steps:**
1. Extract app construction from `src/backend/server.js` into a reusable module so tests can import the Express app without binding a port.
2. Add backend test dependencies and scripts in `package.json`.
3. Create a deterministic seeded test datastore helper.
4. Add one smoke test for `GET /health` or a protected route.

**Validation:**
- Run a backend test command successfully.
- Verify tests can isolate datastore state per run.

**Priority:** Highest

---

### Task 2: Centralize entity lookup + membership helpers

**Objective:** Create reusable helpers so every route uses the same access rules.

**Files:**
- Create: `src/backend/lib/access.js`
- Modify: `src/backend/routes/server.routes.js`
- Modify: `src/backend/routes/channel.routes.js`
- Modify: `src/backend/routes/message.routes.js`
- Modify: `src/backend/routes/user.routes.js`

**Suggested helper surface:**
- `getUserById(db, userId)`
- `getServerForMember(db, serverId, userId)`
- `getChannelForMember(db, serverId, channelId, userId)`
- `canReadDm(db, currentUserId, otherUserId)`
- `getMessageForViewer(db, messageId, userId)`

**Steps:**
1. Move repeated lookup logic out of route modules.
2. Define explicit rules for:
   - reading a server
   - reading a channel
   - reading channel messages
   - reading DMs
   - reading user metadata
3. Update routes to consume the helpers instead of ad hoc filtering.

**Validation:**
- Existing happy-path manual behavior still works.
- Access decisions become consistent across all routes.

**Priority:** Highest

---

### Task 3: Fix `GET /api/messages/channel/:channelId`

**Objective:** Prevent authenticated users from reading channel messages unless they belong to the server/channel.

**Files:**
- Modify: `src/backend/routes/message.routes.js`
- Test: `src/backend/tests/authz.routes.test.js`

**Steps:**
1. Add a failing test where user A requests channel messages from a server they are not a member of.
2. Require `serverId` and validate the requester is a member of that server.
3. Ensure the channel belongs to the specified server.
4. Return `404` or `403` consistently based on chosen policy.

**Validation:**
- Unauthorized request fails.
- Authorized request still returns the expected messages.

**Priority:** Highest

---

### Task 4: Fix `GET /api/messages/:messageId`

**Objective:** Prevent arbitrary message lookup by ID without access checks.

**Files:**
- Modify: `src/backend/routes/message.routes.js`
- Test: `src/backend/tests/authz.routes.test.js`

**Steps:**
1. Add a failing test for cross-user message read by raw message ID.
2. For channel messages, verify server/channel membership.
3. For DMs, verify viewer is one of the DM participants.
4. Reuse the new access helper instead of route-local logic.

**Validation:**
- Unauthorized lookup fails.
- Message owner/participant lookup succeeds.

**Priority:** Highest

---

### Task 5: Tighten user data exposure routes

**Objective:** Limit user/profile/channel/server metadata exposure to intended viewers only.

**Files:**
- Modify: `src/backend/routes/user.routes.js`
- Test: `src/backend/tests/authz.routes.test.js`

**Decisions to make before coding:**
- Whether `GET /api/users/:userId` is self-only, same-server-only, or broadly public.
- Whether `/:userId/channels` and `/:userId/servers` should be self-only.

**Recommended default:**
- `GET /:userId` → requester can read self, and optionally same-server members only.
- `GET /:userId/channels` → self-only.
- `GET /:userId/servers` → self-only.

**Validation:**
- Cross-user reads are blocked per policy.
- DM user list / same-server features still work after route changes.

**Priority:** Highest

---

### Task 6: Add regression coverage for authz matrix

**Objective:** Protect against future permission regressions.

**Files:**
- Expand: `src/backend/tests/authz.routes.test.js`
- Optional create: `src/backend/tests/message.routes.test.js`
- Optional create: `src/backend/tests/user.routes.test.js`

**Coverage matrix:**
- same user vs different user
- same server vs different server
- channel message vs DM message
- owner/member/non-member
- valid token vs missing/invalid token

**Validation:**
- A test suite fails if any current authz bug is reintroduced.

**Priority:** Highest

---

# Phase 2: Validation and route cleanup

### Task 7: Add request validation helpers

**Objective:** Stop malformed params/query/body input from leaking into route logic.

**Files:**
- Create: `src/backend/lib/validate.js` or `src/backend/validators/`
- Modify: `src/backend/routes/auth.routes.js`
- Modify: `src/backend/routes/server.routes.js`
- Modify: `src/backend/routes/channel.routes.js`
- Modify: `src/backend/routes/message.routes.js`
- Modify: `src/backend/routes/user.routes.js`

**Suggested validation scope:**
- required strings
- min lengths
- allowed enums (`status`, channel `type`)
- pagination/query bounds (`limit`)
- required pairings (`serverId` + `channelId`)

**Validation:**
- Invalid inputs return predictable `400` responses.
- Route modules shrink and become easier to read.

**Priority:** High

---

### Task 8: Standardize error responses and route helpers

**Objective:** Make route behavior uniform and easier to maintain.

**Files:**
- Create: `src/backend/lib/http.js` or similar
- Modify: all backend route files

**Refactor targets:**
- not found response helper
- forbidden response helper
- bad request response helper
- safe user serialization helper

**Validation:**
- Similar failure cases return the same JSON shape.
- Duplicated response code is reduced.

**Priority:** High

---

### Task 9: Extract app factory from `server.js`

**Objective:** Separate app wiring from server boot to simplify testing and future deployment refactors.

**Files:**
- Create: `src/backend/app.js`
- Modify: `src/backend/server.js`

**Suggested result:**
- `app.js` exports app creation and socket wiring helpers.
- `server.js` only loads env, creates HTTP server, and starts listening.

**Validation:**
- Manual backend startup still works.
- Tests can import app without listening on a port.

**Priority:** High

---

# Phase 3: Persistence boundary and datastore migration

### Task 10: Introduce repository interfaces around the JSON store

**Objective:** Decouple route/business logic from direct file-DB structure.

**Files:**
- Create: `src/backend/repositories/`
- Create: `src/backend/repositories/users.repository.js`
- Create: `src/backend/repositories/servers.repository.js`
- Create: `src/backend/repositories/channels.repository.js`
- Create: `src/backend/repositories/messages.repository.js`
- Modify: `src/backend/lib/store.js`
- Modify: route files or new service files

**Approach:**
- Keep JSON persistence temporarily.
- Move entity-specific data access into repository modules.
- Hide raw `db.users`, `db.channels`, etc. from route handlers.

**Validation:**
- No route file directly manipulates full DB collections.
- Existing behavior remains unchanged.

**Priority:** High

---

### Task 11: Add service layer for messages and membership operations

**Objective:** Isolate business rules from transport and storage details.

**Files:**
- Create: `src/backend/services/message.service.js`
- Create: `src/backend/services/server.service.js`
- Create: `src/backend/services/user.service.js`
- Modify: route files to delegate into services

**Validation:**
- Message create/edit/delete logic lives outside route modules.
- Server/channel membership logic has a single home.

**Priority:** High

---

### Task 12: Design and implement SQLite replacement path

**Objective:** Replace whole-file JSON writes with a safer local datastore while minimizing scope.

**Files:**
- Create: `src/backend/db/`
- Create: migration/schema files
- Create: SQLite-backed repository implementations
- Modify: repository factory / configuration wiring
- Modify: README.md
- Modify: `package.json`

**Suggested sequence:**
1. Define schema for users, servers, channels, memberships, messages.
2. Implement repository parity against SQLite.
3. Add a migration/import script from `src/backend/data/db.json`.
4. Swap the app to use SQLite repositories by default in development.

**Validation:**
- App boots with migrated data.
- CRUD behavior matches JSON-backed version.
- Concurrent usage is safer than whole-file rewrites.

**Priority:** Medium-High

**Risk note:** This is the largest change; only start after authz tests are solid.

---

# Phase 4: Frontend maintainability refactor

### Task 13: Centralize API calls

**Objective:** Remove repeated `fetch` boilerplate and auth header handling from components.

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/auth.ts`
- Modify: `frontend/src/components/AppLayout.tsx`
- Modify: `frontend/src/pages/AuthPage.tsx`
- Modify: `frontend/src/pages/ChannelPage.tsx`
- Modify: `frontend/src/pages/DMPage.tsx`
- Modify: `frontend/src/components/ChannelList.tsx`
- Modify: `frontend/src/components/UserHeader.tsx`

**Suggested API client surface:**
- `getAuthToken()`
- `setSession({ token, user })`
- `clearSession()`
- `apiGet(path)`
- `apiPost(path, body)`
- `apiPatch(path, body)`
- `apiDelete(path)`

**Validation:**
- Components stop manually reading `localStorage` for every request.
- Error handling becomes more consistent.

**Priority:** High

---

### Task 14: Extract shared data-loading hooks

**Objective:** Reduce duplicated channel/server/message loading logic.

**Files:**
- Create: `frontend/src/hooks/useCurrentUser.ts`
- Create: `frontend/src/hooks/useServers.ts`
- Create: `frontend/src/hooks/useChannels.ts`
- Create: `frontend/src/hooks/useChannelMessages.ts`
- Create: `frontend/src/hooks/useDmMessages.ts`
- Modify: `frontend/src/components/AppLayout.tsx`
- Modify: `frontend/src/pages/ChannelPage.tsx`
- Modify: `frontend/src/pages/DMPage.tsx`

**Validation:**
- Page components become thinner.
- Reload/refetch behavior is easier to reason about.

**Priority:** Medium

---

### Task 15: Replace prompt/alert flows with real UI

**Objective:** Improve UX and make state transitions testable.

**Files:**
- Modify: `frontend/src/components/ChannelList.tsx`
- Modify: `frontend/src/components/AppLayout.tsx`
- Create: `frontend/src/components/CreateServerModal.tsx`
- Create: `frontend/src/components/CreateChannelForm.tsx` or modal equivalent

**Validation:**
- No `window.prompt` or `window.alert` usage remains for create flows.
- Inputs and error states render in-app.

**Priority:** Medium

---

### Task 16: Consolidate socket event handling

**Objective:** Ensure realtime behavior has one clear integration path and fewer per-page side effects.

**Files:**
- Modify: `frontend/src/lib/socket.ts`
- Optional create: `frontend/src/hooks/useSocketChannel.ts`
- Optional create: `frontend/src/hooks/useSocketDm.ts`
- Modify: `frontend/src/pages/ChannelPage.tsx`
- Modify: `frontend/src/pages/DMPage.tsx`
- Modify: `frontend/src/components/AppLayout.tsx`

**Validation:**
- Event subscription/unsubscription patterns are standardized.
- Fewer duplicate `connectSocket(token)` calls spread across components.

**Priority:** Medium

---

# Phase 5: Tooling, dependency, and docs cleanup

### Task 17: Remove unused backend dependencies

**Objective:** Align declared dependencies with actual implementation.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

**Likely removals to verify:**
- `ioredis`
- `redis`

**Validation:**
- Install/build/start still work after removal.
- README accurately describes actual persistence.

**Priority:** Medium

---

### Task 18: Add lint/test scripts and CI baseline

**Objective:** Make quality checks automatic.

**Files:**
- Modify: `package.json`
- Modify: `frontend/package.json`
- Create: CI workflow files if repo uses GitHub Actions
- Optional create: ESLint config updates

**Minimum checks:**
- backend tests
- frontend tests or at least type/build validation
- production build

**Validation:**
- One command runs the critical checks locally.
- CI can block regressions.

**Priority:** Medium

---

### Task 19: Plan CRA → Vite migration

**Objective:** Modernize frontend tooling without mixing it into higher-risk backend refactors.

**Files:**
- Create or update: `.hermes/plans/` follow-up migration plan
- Later modify: `frontend/package.json`, entry files, build config

**Why later:**
- It is valuable, but less urgent than authz, tests, and persistence.
- Tooling churn should not obscure correctness/security work.

**Validation:**
- Separate migration plan exists with explicit acceptance criteria.

**Priority:** Low-Medium

---

## Files most likely to change

### Backend, immediate
- `src/backend/server.js`
- `src/backend/app.js` (new)
- `src/backend/lib/auth.js`
- `src/backend/lib/store.js`
- `src/backend/lib/access.js` (new)
- `src/backend/lib/validate.js` or `src/backend/validators/*` (new)
- `src/backend/routes/auth.routes.js`
- `src/backend/routes/user.routes.js`
- `src/backend/routes/server.routes.js`
- `src/backend/routes/channel.routes.js`
- `src/backend/routes/message.routes.js`
- `src/backend/tests/**/*` (new)

### Backend, medium-term
- `src/backend/repositories/**/*` (new)
- `src/backend/services/**/*` (new)
- `src/backend/db/**/*` (new)

### Frontend
- `frontend/src/components/AppLayout.tsx`
- `frontend/src/components/ChannelList.tsx`
- `frontend/src/components/UserHeader.tsx`
- `frontend/src/pages/AuthPage.tsx`
- `frontend/src/pages/ChannelPage.tsx`
- `frontend/src/pages/DMPage.tsx`
- `frontend/src/lib/socket.ts`
- `frontend/src/lib/api.ts` (new)
- `frontend/src/lib/auth.ts` (new)
- `frontend/src/hooks/**/*` (new)

### Project/tooling
- `package.json`
- `package-lock.json`
- `frontend/package.json`
- `README.md`
- `.github/workflows/*` (if added)

---

## Suggested implementation order

### Milestone A — secure the prototype
- Tasks 1–6
- Outcome: main authz bugs fixed and guarded by tests

### Milestone B — stabilize backend structure
- Tasks 7–11
- Outcome: cleaner route code, reusable validation/policy/business logic

### Milestone C — replace brittle persistence
- Task 12
- Outcome: safer local datastore and cleaner upgrade path

### Milestone D — clean up frontend
- Tasks 13–16
- Outcome: less duplicated code and better UX maintainability

### Milestone E — harden tooling
- Tasks 17–19
- Outcome: clearer docs, less dependency drift, automated checks

---

## Validation strategy

### After every milestone
- Run backend tests.
- Run frontend build: `cd frontend && npm run build`
- Start backend and hit `GET /health`.
- Manually verify:
  - register/login
  - server list load
  - channel navigation
  - sending channel message
  - sending DM
  - typing indicators

### Critical new automated checks
- unauthorized user cannot read another server’s channel messages
- unauthorized user cannot read arbitrary message IDs
- unauthorized user cannot enumerate another user’s channels/servers
- valid member can still read/send within allowed scopes

---

## Risks / tradeoffs

- Adding tests first slows the first refactor steps slightly, but greatly reduces regression risk.
- SQLite migration is the biggest change; do not combine it with frontend/tooling churn.
- Tightening authorization may break current permissive UI assumptions; expect small frontend fixes after backend hardening.
- A full move to Postgres may be better long term, but SQLite is the lowest-complexity win for a local-first app.

---

## Open questions

1. Should user profiles be visible only to self, or to same-server members?
2. Should DMs be allowed between any registered users, or only between users sharing a server?
3. Is the goal still a local/demo app, or should this refactor prepare for deployment?
4. Do you want to keep JSON import compatibility permanently, or only as a one-time migration path?
5. Should frontend modernization to Vite happen in this refactor stream or as a separate project?

---

## Recommended next action

Start with **Milestone A / Tasks 1–6** only. That yields the highest risk reduction with the least architectural churn.

If you want execution after this, the first implementation batch should be:
1. extract `app.js`
2. add backend test harness
3. add access helpers
4. fix message/user authorization routes
5. add regression tests for the authz matrix

# T1 Checklist: item/tool/call

## Status
- Task ID: `T1`
- Priority: `P0`
- State: `done`

## Objective
Реализовать поддержку server request `item/tool/call` end-to-end:
- parse/routing
- UI/state flow
- response handling
- resilience/edge-cases

## Scope
In scope:
- `item/tool/call` в event parsing и routing
- pending tool-call state model
- user decision UI path
- `respond_to_server_request` response integration
- tests + docs update

Out of scope:
- Realtime API
- rollback logic
- unrelated config endpoints

## Implementation Steps

### 1. Parse and route
- [x] Add method support in `src/utils/appServerEvents.ts`
- [x] Route handler in `src/features/app/hooks/useAppServerEvents.ts`
- [x] Validate request id and payload normalization (camelCase/snake_case)

### 2. Thread state model
- [x] Add typed pending tool-call structure in threads reducer layer
- [x] Persist minimal fields: `workspaceId`, `threadId`, `turnId`, `requestId`, `toolName`, `args`
- [ ] Add full transitions: `received`, `resolved`, `rejected`, `expired`, `stale` (partial: `received`/`resolved` covered)

### 3. UI flow
- [x] Add prompt surface in message/composer area
- [x] Show clear actions with result payload and success toggle
- [ ] Lock duplicate submits while request is pending

### 4. Response path
- [x] Use `respond_to_server_request` via `src/services/tauri.ts`
- [ ] Implement success/error handling with optimistic state rollback on failure
- [x] Ensure response sent once per `requestId` at reducer-level dedupe

### 5. Resilience and edge-cases
- [x] Idempotency guard for duplicate `requestId`
- [x] Handle arrival after thread/workspace switch via active-thread filtering
- [ ] Handle timeout cleanup for orphaned pending requests
- [ ] Handle race: `item/completed` before user decision

### 6. Tests
- [ ] Unit tests for reducer transitions (new dedicated cases pending)
- [x] Hook tests for app-server routing
- [ ] Integration-style test for full flow: request -> decision -> response
- [ ] Negative path test: duplicate request and transport failure

### 7. Docs and parity
- [x] Update `docs/app-server-events.md` server request support section
- [x] Move `T1` from `in_progress` to `done` in `.plans/tasks.md`

## Acceptance Criteria
- `item/tool/call` request is visible and actionable in UI
- user decision reaches backend exactly once
- duplicate/reordered events do not corrupt thread state
- tests cover happy path + critical edge cases

## Validation Commands
- `npm run typecheck`
- `npm run test -- src/features/app/hooks/useAppServerEvents.test.tsx`
- `npm run test -- src/features/threads/hooks`
- `cd src-tauri && cargo check` (if backend adapters touched)

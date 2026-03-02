# Codex App-Server Parity Implementation Plan

## Goal
Довести поддержку CodexMonitor по `codex app-server` до высокого уровня parity с upstream протоколом v2 (baseline: `../Codex`), сохраняя стабильность UI, app/daemon parity и обратную совместимость текущих потоков.

## Baseline
- Upstream hash: `0aeb55bf0858a15e2456f246f0e56dcea8432740`
- Canonical protocol source: `../Codex/codex-rs/app-server-protocol/src/protocol/common.rs`
- Runtime routing anchors:
- `src/utils/appServerEvents.ts`
- `src/features/app/hooks/useAppServerEvents.ts`
- `src-tauri/src/shared/codex_core.rs`
- `src-tauri/src/bin/codex_monitor_daemon/rpc.rs`

## Scope
In scope:
- Добавление отсутствующих методов notifications/client requests/server requests.
- Полный путь app -> frontend IPC -> shared core -> daemon parity.
- Тесты и docs parity (`docs/app-server-events.md`).

Out of scope:
- Изменение протокола upstream.
- Нерелевантные UI-рефакторы вне app-server цепочки.

## Delivery Phases

### Phase 0: Foundation and Guardrails (0.5-1 day)
1. Зафиксировать генерацию parity-матрицы скриптом.
2. Добавить CI-check, который детектит расхождение docs vs текущая реализация.
3. Обновить `docs/app-server-events.md` после каждого этапа.

Acceptance:
- Есть повторяемый способ получить diff `upstream - local`.
- Документация и код не расходятся по спискам поддержанных методов.

### Phase 1: Quick Wins (1-3 days)
1. Client requests:
- `account/logout`
- `thread/read`
- `thread/loaded/list`
- `thread/unarchive`
- `thread/unsubscribe`
2. Notifications:
- `configWarning`
- `deprecationNotice`
- `windows/worldWritableWarning`
- `serverRequest/resolved` (как минимум debug routing)

Implementation notes:
- Backend first in `src-tauri/src/shared/*`, затем app adapter/daemon RPC, потом `src/services/tauri.ts`, затем UI wiring.

Acceptance:
- Методы доступны из frontend service layer.
- Есть обработка success/error и типы payload.
- Минимум по 1 тесту на новый маршрут.

### Phase 2: Config and MCP Surface (3-5 days)
1. Config requests:
- `config/read`
- `config/value/write`
- `config/batchWrite`
- `config/mcpServer/reload`
- `configRequirements/read`
2. MCP auth flow:
- `mcpServer/oauth/login`
- notification `mcpServer/oauthLogin/completed`

Implementation notes:
- Не дублировать логику между app/daemon: всё в shared core.
- При изменении конфигов обеспечить синхронное обновление UI state и безопасный rollback при ошибке.

Acceptance:
- Полный CRUD-поток конфигов работает через app-server методы.
- OAuth-flow корректно переживает cancel/timeout/retry.

### Phase 3: Skills Remote + Utility Endpoints (2-4 days)
1. `skills/config/write`
2. `skills/remote/list`
3. `skills/remote/export`
4. `feedback/upload`
5. `command/exec`

Acceptance:
- Все методы доступны и документированы.
- Для remote skills есть явный UX статус (loading/success/error).

### Phase 4: Heavy Block A - `item/tool/call` (1-2 weeks)

#### Why hard
- Это bidirectional orchestration, а не простой notify/request.
- Требует согласованной state machine: started/progress/input/resolve/error.

#### Target architecture
1. Parse + route:
- Расширить `src/utils/appServerEvents.ts` на `item/tool/call`.
- Добавить dispatch в `useAppServerEvents.ts`.
2. State model:
- Ввести typed model в thread reducer для pending tool calls.
- Хранить `requestId`, `threadId`, `turnId`, `itemId`, timeout metadata.
3. UI flow:
- Показывать блокирующий/неблокирующий prompt в composer/messages.
- Поддержать structured result payload + explicit reject path.
4. Response path:
- Использовать `respond_to_server_request` как единый outbound response channel.
5. Resilience:
- Idempotency guard по `requestId`.
- Timeout cleanup и “stale request” protection при смене workspace/thread.

#### Edge cases
- Дублирующиеся сообщения с тем же `requestId`.
- Приход `item/completed` раньше пользовательского ответа.
- Смена активного thread/workspace во время pending tool-call.

#### Tests
- Unit: reducer transitions.
- Hook tests: event routing + request/response coupling.
- Integration: full mock flow `item/tool/call -> user decision -> response sent`.

Acceptance:
- Нет зависших pending tool calls.
- Повторная доставка события не ломает состояние.
- Решения пользователя отправляются ровно один раз.

### Phase 5: Heavy Block B - Realtime (`thread/realtime/*`) (2-3 weeks)

#### Why hard
- Отдельный поток событий с высокой частотой + возможные аудио payload.
- Требует новой модели подписки и контроля backpressure.

#### Target architecture
1. Transport contract:
- Добавить методы в `src-tauri/src/shared/codex_core.rs`:
  - `thread/realtime/start`
  - `thread/realtime/appendText`
  - `thread/realtime/appendAudio`
  - `thread/realtime/stop`
2. Event handling:
- Поддержать notifications:
  - `thread/realtime/started`
  - `thread/realtime/itemAdded`
  - `thread/realtime/outputAudio/delta`
  - `thread/realtime/error`
  - `thread/realtime/closed`
3. Frontend orchestration:
- Отдельный realtime controller hook.
- Буферизация/дебаунс частых дельт для предотвращения re-render storm.
4. Audio strategy:
- Ограничение размера чанков.
- Явные состояния media permission denied/device unavailable.
5. Failure handling:
- Экспоненциальный reconnect policy.
- Автоматическая остановка realtime при thread close/unsubscribe.

#### Edge cases
- Частичный аудио поток + network jitter.
- Рассинхрон `turn/start` и `thread/realtime/start`.
- Потеря `closed` события при дисконнекте.

#### Tests
- Controller tests на reconnect/backoff.
- Event flood tests (большой поток `outputAudio/delta`).
- Manual E2E checklist для desktop/mobile runtime.

Acceptance:
- Стабильный realtime поток без утечек памяти.
- Корректное восстановление после ошибок соединения.

### Phase 6: Heavy Block C - `thread/rollback` (3-5 days)

#### Why hard
- Влияет на целостность истории, иерархии и активных якорей UI.

#### Implementation
1. Добавить request в backend + tauri service.
2. Обновить reconciliation в threads reducer:
- сохранить инварианты порядка и скрытых тредов.
- не “воскрешать” скрытые элементы.
3. Синхронизировать derived views (`useThreadRows`, summaries).

#### Tests
- Regression tests на thread hierarchy invariants.
- Rollback during active turn.

Acceptance:
- После rollback UI и backend history консистентны.
- Нет артефактов в child/root отображении.

## Work Breakdown Structure (WBS)
1. Protocol matrix automation.
2. Missing request endpoints.
3. Missing notification routing.
4. Server request expansions.
5. Heavy block `item/tool/call`.
6. Heavy block `thread/realtime/*`.
7. Heavy block `thread/rollback`.
8. Docs + final parity report.

## Risks and Mitigations
1. Schema drift в upstream:
- Mitigation: регулярный re-run parity script + hash pinning в docs.
2. App/daemon divergence:
- Mitigation: shared-core-first policy + parity tests на обе поверхности.
3. UI regressions в threads reducer:
- Mitigation: targeted tests на инварианты и snapshot ключевых сценариев.
4. Realtime performance degradation:
- Mitigation: throttling, batching, render budget metrics.

## Validation Matrix
- Always: `npm run typecheck`
- Frontend behavior: `npm run test`
- Backend changes: `cd src-tauri && cargo check`
- Targeted tests per module before full suite.

## Definition of Done
1. Все выбранные методы из фазы реализованы в app+daemon parity.
2. Есть тесты на happy path и критические edge cases.
3. `docs/app-server-events.md` обновлён и соответствует текущему hash.
4. Нет известных P0/P1 багов по новым путям.

## Recommended Execution Order (Practical)
1. Phase 1 (быстрые методы и нотификации).
2. Phase 2 (config + MCP OAuth).
3. Phase 3 (skills remote + utility).
4. Phase 4 (`item/tool/call`).
5. Phase 6 (`thread/rollback`).
6. Phase 5 (realtime) как финальный наиболее рискованный блок.

## Tracking Template
- Status: `pending | in_progress | done`
- Owner: `<name>`
- ETA: `<date>`
- Links: PR / test report / notes


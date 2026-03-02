# App-Server Tasks Board

## Baseline
- Codex protocol hash: `0aeb55bf0858a15e2456f246f0e56dcea8432740`
- Canonical source: `../Codex/codex-rs/app-server-protocol/src/protocol/common.rs`
- Detailed implementation roadmap: `.plans/tasks/codex-app-server-parity-implementation.md`

## Priority Legend
- `P0`: critical parity gap or high-impact core flow
- `P1`: important capability gap with moderate user impact
- `P2`: quality/completeness gap, lower immediate impact

## done

### D1. Existing Notifications/Event Routing
- Status: `done`
- Priority: `P0`
- Includes:
- `app/list/updated`
- `account/login/completed`
- `account/rateLimits/updated`
- `account/updated`
- `error`
- `turn/started`
- `turn/completed`
- `turn/plan/updated`
- `turn/diff/updated`
- `thread/started`
- `thread/archived`
- `thread/closed`
- `thread/name/updated`
- `thread/status/changed`
- `thread/tokenUsage/updated`
- `thread/unarchived`
- `item/started`
- `item/completed`
- `item/agentMessage/delta`
- `item/plan/delta`
- `item/reasoning/summaryTextDelta`
- `item/reasoning/summaryPartAdded`
- `item/reasoning/textDelta`
- `item/commandExecution/outputDelta`
- `item/commandExecution/terminalInteraction`
- `item/fileChange/outputDelta`

### D2. Existing Server Requests Handling
- Status: `done`
- Priority: `P0`
- Includes:
- `*requestApproval` (wildcard, включая `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`)
- `item/tool/requestUserInput`

### D3. Existing Client Requests (CodexMonitor -> app-server)
- Status: `done`
- Priority: `P0`
- Includes:
- `thread/start`
- `thread/resume`
- `thread/fork`
- `thread/list`
- `thread/archive`
- `thread/compact/start`
- `thread/name/set`
- `turn/start`
- `turn/steer`
- `turn/interrupt`
- `review/start`
- `model/list`
- `experimentalFeature/list`
- `collaborationMode/list`
- `mcpServerStatus/list`
- `account/login/start`
- `account/login/cancel`
- `account/rateLimits/read`
- `account/read`
- `skills/list`
- `app/list`

### D4. Non-v2/Bespoke Notifications
- Status: `done`
- Priority: `P2`
- Includes:
- `codex/connected`
- `codex/backgroundThread`
- `codex/event/skills_update_available`

### D5. `item/tool/call` (server request)
- Status: `done`
- Priority: `P0`
- Complexity: `High`
- Notes:
- End-to-end flow implemented: event parse/routing -> pending state -> UI request card -> submit response via `respond_to_server_request` -> cleanup.
- Manual validation completed in app via injected `item/tool/call` events and successful submit behavior.

## in_progress

- _empty_

## todo

### T2. Realtime API: `thread/realtime/start|stop|appendText|appendAudio` + события `thread/realtime/*`
- Priority: `P0`
- Complexity: `High`
- Comment: новый поток данных в реальном времени, аудио/текст пайплайн, UX и устойчивость к обрывам.

### T3. Thread rollback: `thread/rollback`
- Priority: `P0`
- Complexity: `Medium-High`
- Comment: меняет семантику истории turn-ов, риск регрессий в reducer/иерархии потоков.

### T4. Config API: `config/read`, `config/value/write`, `config/batchWrite`, `config/mcpServer/reload`, `configRequirements/read`
- Priority: `P1`
- Complexity: `Medium-High`
- Comment: аккуратная синхронизация с текущими локальными настройками, миграции и валидация контрактов.

### T5. `mcpServer/oauth/login` + `mcpServer/oauthLogin/completed`
- Priority: `P1`
- Complexity: `Medium-High`
- Comment: OAuth-флоу, callback-обработка, состояние авторизации и edge cases.

### T6. `account/chatgptAuthTokens/refresh` (server request)
- Priority: `P1`
- Complexity: `Low-Medium`
- Comment: в основном RPC + безопасное обновление auth-состояния.

### T7. `externalAgentConfig/detect`, `externalAgentConfig/import`
- Priority: `P1`
- Complexity: `Medium`
- Comment: требуется импорт/маппинг внешних конфигов и безопасные преобразования.

### T8. Skills remote: `skills/remote/list`, `skills/remote/export`, `skills/config/write`
- Priority: `P1`
- Complexity: `Medium`
- Comment: добавляется новый UX-поток для remote skills и запись конфига.

### T9. Thread ops bundle: `thread/unarchive`, `thread/unsubscribe`, `thread/read`, `thread/loaded/list`, `thread/backgroundTerminals/clean`
- Priority: `P1`
- Complexity: `Low-Medium`
- Comment: относительно прямые RPC-методы, но нужны корректные обновления локального состояния.

### T10. Notifications bundle (not routed): `configWarning`, `deprecationNotice`, `item/mcpToolCall/progress`, `model/rerouted`, `rawResponseItem/completed`, `serverRequest/resolved`, `windows/worldWritableWarning`, `windowsSandbox/setupCompleted`, `thread/compacted`
- Priority: `P1`
- Complexity: `Low-Medium`
- Comment: чаще всего это парсинг + роутинг + UI-отображение (toast/panel/debug).

### T11. `command/exec`
- Priority: `P1`
- Complexity: `Medium`
- Comment: отдельный путь выполнения команд вне turn/thread, важны безопасность и ограничения.

### T12. `windowsSandbox/setupStart` (client request)
- Priority: `P2`
- Complexity: `Medium`
- Comment: platform-specific поведение, особенно тестирование и UX на non-Windows.

### T13. `feedback/upload`
- Priority: `P2`
- Complexity: `Low-Medium`
- Comment: в основном запрос + UI-форма + обработка статусов.

### T14. `account/logout`
- Priority: `P2`
- Complexity: `Low`
- Comment: простой request + обновление auth-state в UI.

## Next Suggested Start Order
1. `T1` -> `T2` -> `T3`
2. `T4` + `T5`
3. `T6` + `T9` + `T10`
4. `T8` + `T11`
5. `T7` + `T12` + `T13` + `T14`

## Notes
- Source of truth for parity lists: `docs/app-server-events.md`
- This board is the execution tracker (status + priority) for implementation work.

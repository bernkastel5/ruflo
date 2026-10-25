# Состояние сессии (SESSION_NOTES)

## Что сделано
- Проведён Genchi Genbutsu аудит расхода токенов в репозитории `ruflo` (Claude Flow v3) и выявлены 5 главных источников перерасхода.
- Сформирован структурированный бриф проекта `PROJECT_BRIEF.md` и внедрён стандарт `TOKENS_OPTIMIZATION.md`.
- Сжаты системные инструкции `CLAUDE.md` (с 72,004 до 8,350 байт — **8.62x**) и `AGENTS.md` (с 24,566 до 3,695 байт — **6.65x**); полные справочные руководства (npm/Pinata публикация, таблицы флагов MetaHarness, рецепты роя) сохранены без потерь в `docs/reference/CLAUDE_REFERENCE.md` и `docs/reference/AGENTS_REFERENCE.md`.
- В MCP-сервере (`v3/@claude-flow/cli/src/mcp-server.ts`, `bin/cli.js`, `bin/mcp-server.js`, `src/init/mcp-generator.ts`) реализован пресет `CLAUDE_FLOW_MCP_TOOLS=core` (сокращает рекламируемые схемы `tools/list` с 387 до 45 ключевых инструментов — **8.66x** по токенам при сохранении 100% доступности всех 387 инструментов через `tools/call`) и компактная JSON-сериализация `formatMcpToolResult` с защитным лимитом `CLAUDE_FLOW_MCP_MAX_OUTPUT_CHARS=32000`.
- В `.claude/settings.json`, `v3/@claude-flow/cli/.claude/settings.json` и `v3/@claude-flow/cli/src/init/settings-generator.ts` снижен `skillListingBudgetFraction` с `0.06` до `0.012` (**5.0x**), отключён фоновый расход `daemon.autoStart: false`, активированы опции мода `ruflo-mods` `agentTrim: true` (-4,236 токенов/запрос по замерам ADR-451) и `compactCarry: true`.
- В генератор `v3/@claude-flow/cli/src/init/claudemd-generator.ts` встроены правила `Token Optimization Discipline` для всех шаблонов `ruflo init`.
- Добавлен и успешно выполнен интеграционный тестовый набор `tests/token-optimization.test.mjs`.
- Все изменения закоммичены и отправлены в удалённую ветку `origin/arena/9cc0de46-ruflo`.
- Добавлена пошаговая рабочая инструкция для OpenCode и MiMoCode (`docs/OPENCODE_MIMOCODE_GUIDE.md`) и полная русскоязычная версия `README.ru.md` (с перекрёстными ссылками из `README.md` и `README.zh-CN.md`).

## Что осталось
- Задача выполнена в полном объёме; при необходимости в будущих сессиях можно тонко настраивать список `CORE_MCP_TOOL_SELECTORS` под специфичные доменные плагины.

## Блокеры
- Нет.

## Ключевые решения
- **Сохранение криптографической подписи хелперов (`#3565`, `#2593`)**: 5 файлов в `.claude/helpers/` (`hook-handler.cjs`, `intelligence.cjs`, `auto-memory-hook.mjs`, `statusline.cjs`, `router.cjs`) подписаны Ed25519 в `helpers.manifest.json` и оставлены побайтово неизменными.
- **Сохранение инвариантов бандла (`smoke-init-bundle-invariants.mjs`)**: файлы в `.claude/agents/`, `.claude/skills/`, `.claude/commands/` не удалялись; вместо этого их токен-бюджет в промпте ограничен через `skillListingBudgetFraction: 0.012` и `agentTrim: true`.
- **Обратная совместимость `#2726`**: `parseMcpToolSelection(undefined)` по-прежнему возвращает `'all'`, а пресет `'core'` задаётся через `CLAUDE_FLOW_MCP_TOOLS=core` в `.claude/settings.json` и `.mcp.json`.

## Карта изменённых и созданных файлов
- `PROJECT_BRIEF.md` — структурированная постановка задачи и критерии приёмки.
- `TOKENS_OPTIMIZATION.md` — правила экономии токенов и описание рычагов конфигурации Ruflo.
- `README.ru.md`, `docs/OPENCODE_MIMOCODE_GUIDE.md` — русскоязычный README и практическая инструкция для подключения и работы в OpenCode / MiMoCode.
- `SESSION_NOTES.md`, `SESSION_LOG.md` — артефакты жизненного цикла контекста и лога расхода.
- `CLAUDE.md`, `AGENTS.md` — сжатые системные промпты (уменьшены в 8.6x и 6.6x).
- `docs/reference/CLAUDE_REFERENCE.md`, `docs/reference/AGENTS_REFERENCE.md` — полные справочные копии для точечного чтения по требованию.
- `.claude/settings.json`, `v3/@claude-flow/cli/.claude/settings.json` — оптимизированные настройки (`skillListingBudgetFraction: 0.012`, `CLAUDE_FLOW_MCP_TOOLS: "core"`, `daemon.autoStart: false`, `agentTrim: true`, `compactCarry: true`).
- `v3/@claude-flow/cli/src/mcp-server.ts`, `v3/@claude-flow/cli/bin/cli.js`, `v3/@claude-flow/cli/bin/mcp-server.js` — пресет `core` в `filterAdvertisedMcpTools` и компактная сериализация `formatMcpToolResult`.
- `v3/@claude-flow/cli/src/init/mcp-generator.ts`, `v3/@claude-flow/cli/src/init/settings-generator.ts`, `v3/@claude-flow/cli/src/init/claudemd-generator.ts` — генераторы `ruflo init` с поддержкой 5x экономии токенов по умолчанию.
- `v3/@claude-flow/cli/__tests__/mcp-tool-filter-2726.test.ts`, `tests/token-optimization.test.mjs` — тесты фильтрации MCP, компактной сериализации и 5x снижения оверхеда.

## Контекст для следующей сессии
- Начинать чтение проекта с `PROJECT_BRIEF.md` и `SESSION_NOTES.md`; справочник по релизу/IPFS находится в `docs/reference/CLAUDE_REFERENCE.md` (читать только точечно через `rg -C` или `offset/limit`).

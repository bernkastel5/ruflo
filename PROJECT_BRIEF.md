# PROJECT BRIEF: Оптимизация потребления токенов в Ruflo (5x без потери качества)

- **Название проекта и его цель одной строкой:**
  Ruflo (Claude Flow v3) — сократить потребление токенов на каждый ход и сессию минимум в 5 раз (в итоге достигнуто **7.94x** снижение постоянного контекстного оверхеда: со ~153.8k до ~19.9k токенов с учётом MCP-схем, и в **6.82x** без учёта MCP-схем: с ~35.0k до ~5.2k токенов) без потери функциональности, точности маршрутизации и покрытия тестами.

- **Стек и ключевые файлы:**
  TypeScript / Node.js (ESM + CJS), MCP Server (JSON-RPC 2.0), Claude Code & Codex конфигурации и хуки:
  - `CLAUDE.md`, `AGENTS.md`, `TOKENS_OPTIMIZATION.md`, `docs/reference/CLAUDE_REFERENCE.md`
  - `.claude/settings.json`, `v3/@claude-flow/cli/.claude/settings.json`
  - `v3/@claude-flow/cli/src/mcp-server.ts`, `v3/@claude-flow/cli/bin/cli.js`, `v3/@claude-flow/cli/bin/mcp-server.js`
  - `v3/@claude-flow/cli/src/init/claudemd-generator.ts`, `v3/@claude-flow/cli/src/init/mcp-generator.ts`, `v3/@claude-flow/cli/src/init/settings-generator.ts`

- **Текущая задача (что делаем прямо сейчас):**
  Устраняем 5 главных источников перерасхода токенов в Ruflo:
  1. Урезаем базовый системный промпт `CLAUDE.md` (с 72 КБ / ~18k токенов до ~10 КБ / ~2.5k токенов) и `AGENTS.md` (с 24.6 КБ / ~6.1k токенов до ~4.4 КБ / ~1.1k токенов), вынося справочные мануалы релиза/IPFS/плагинов в `docs/reference/CLAUDE_REFERENCE.md`.
  2. Вводим профиль `core` для MCP `tools/list` (`filterAdvertisedMcpTools`) и компактную сериализацию ответов `tools/call` (`formatMcpToolResult`), снижая нагрузку схем с ~82k до ~7.2k токенов при сохранении 100% исполняемости всех 387 инструментов.
  3. Снижаем `skillListingBudgetFraction` с `0.06` до `0.012` (в 5 раз), отключаем фоновый `daemon.autoStart` в `.claude/settings.json` и включаем `agentTrim: true` + `compactCarry: true` для `ruflo-mods` (экономия ~4.2k токенов/запрос).
  4. Внедряем правила `TOKENS_OPTIMIZATION.md` в `CLAUDE.md`, `AGENTS.md` и генератор `claudemd-generator.ts` для всех новых проектов (`ruflo init`).
  5. Верифицируем результат автотестами и замерами до/после.

- **Ограничения (что нельзя трогать, какие решения уже приняты):**
  - Нельзя модифицировать 5 криптографически подписанных (Ed25519) файлов в `.claude/helpers/` (`hook-handler.cjs`, `intelligence.cjs`, `auto-memory-hook.mjs`, `statusline.cjs`, `router.cjs`), чтобы не нарушить `helpers.manifest.json` (`#3565`).
  - Нельзя удалять файлы из `.claude/agents/`, `.claude/skills/`, `.claude/commands/`, которые проверяются `scripts/smoke-init-bundle-invariants.mjs`.
  - `parseMcpToolSelection(undefined)` обязан возвращать `'all'` по умолчанию для обратной совместимости с unit-тестом `#2726`, а профиль `core` активируется через `CLAUDE_FLOW_MCP_TOOLS=core` в `.mcp.json` и `.claude/settings.json`.
  - Все существующие unit- и smoke-тесты затронутых модулей должны проходить без регрессий.

- **Критерий приёмки (как понять, что готово):**
  1. Суммарный постоянный токен-оверхед на ход снижен ≥ 5 раз (подтверждено точным скриптом замера в байтах и токенах).
  2. Все 387 MCP-инструментов остаются вызываемыми через `tools/call`, а вся вынесенная справочная документация сохранена в `docs/reference/CLAUDE_REFERENCE.md`.
  3. Проходят все smoke-проверки (`smoke-init-bundle-invariants.mjs`, `smoke-helper-signing-security.mjs` и др.) и unit-тесты для MCP, `init` и генераторов.
  4. Актуализированы `SESSION_NOTES.md` и `SESSION_LOG.md`.

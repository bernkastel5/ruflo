<div align="center">

<a href="https://cognitum.one/agentic-engineering"><img src="ruflo/assets/ruflo-neon-flicker.gif" alt="Ruflo animated neon sign" width="100%"></a>

**Мета-платформа оркестрации ИИ-агентов (meta-harness) для Claude Code, Codex, OpenCode и MiMoCode.**

[![npm version (ruflo)](https://img.shields.io/npm/v/ruflo?label=npx%20ruflo&style=for-the-badge&logo=npm&color=cb3837)](https://www.npmjs.com/package/ruflo)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Star on GitHub](https://img.shields.io/github/stars/ruvnet/claude-flow?style=for-the-badge&logo=github&color=gold)](https://github.com/ruvnet/claude-flow)
[![Follow @rUv on X](https://img.shields.io/badge/Follow-@rUv-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/rUv)

# Ruflo

[English](README.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md)

[![RuFlo Explained — соберите ИИ-команду, которая планирует, помнит, тестирует и совершенствуется](docs/assets/ruflo-explained/ch14.jpg)](docs/ruflo-explained.md)

**[📖 RuFlo в деталях — как собрать ИИ-команду, которая планирует, помнит, тестирует и обучается](docs/ruflo-explained.md)**  
**[⚡ Инструкция для OpenCode и MiMoCode (режим 5x экономии токенов)](docs/OPENCODE_MIMOCODE_GUIDE.md)**

</div>

> **Агент = Модель + Обвязка (Harness).** Модель пишет код; обвязка даёт ей инструменты, память, циклы проверки, песочницы и контроль безопасности. **Ruflo — это обвязка** вокруг Claude Code, Codex, OpenCode и MiMoCode: 100+ специализированных агентов, координируемые рои (swarms), самообучающаяся векторная память, защищённая федерация между машинами и строгий контроль бюджета токенов.

---

## ⚡ Режим 5x–8x экономии токенов (встроен по умолчанию в эту сборку)

В этой версии репозитория устранены главные причины быстрого сгорания лимита токенов без потери качества:

| Компонент | Было (токенов/ход) | Стало (токенов/ход) | Экономия | Как это работает |
|---|---:|---:|---:|---|
| **Схемы MCP (`tools/list`)** | 118 886 (387 инстр.) | **13 726** (45 `core`-инстр.) | **8.66x** | В `tools/list` отдаются только 45 ключевых инструментов (`CLAUDE_FLOW_MCP_TOOLS=core`); все 387 инструментов остаются доступными для вызова через `tools/call`. |
| **`CLAUDE.md` (системный промпт)** | 18 001 (72.0 КБ) | **2 088** (8.3 КБ) | **8.62x** | В промпте оставлены только рабочие правила и архитектура; релизные и IPFS-справочники вынесены в [`docs/reference/CLAUDE_REFERENCE.md`](docs/reference/CLAUDE_REFERENCE.md). |
| **`AGENTS.md` (промпт Codex/OpenCode)** | 6 142 (24.6 КБ) | **924** (3.7 КБ) | **6.65x** | Убрано 4-кратное дублирование рецептов; полный справочник вынесен в [`docs/reference/AGENTS_REFERENCE.md`](docs/reference/AGENTS_REFERENCE.md). |
| **Бюджет каталога скиллов** | 12 000 (`0.06`) | **2 400** (`0.012`) | **5.00x** | `skillListingBudgetFraction` снижен с 6% до 1.2% контекстного окна. |
| **Каталог агентов (`agentTrim`)** | 4 968 (69 типов) | **732** (ядро + активные) | **6.79x** | Мод `ruflo-mods` скрывает неиспользуемые типы агентов, экономя ~4 236 токенов на запрос. |
| **Фоновый демон (`daemon.autoStart`)** | `true` (10 воркеров) | **`false`** (только вручную) | **100% в простое** | Отключён фоновый запуск headless-сессий без ведома пользователя. |
| **ИТОГО (постоянный контекст)** | **153 855 токенов** | **19 370 токенов** | **7.94x (-87.4%)** | Полный протокол работы описан в [`TOKENS_OPTIMIZATION.md`](TOKENS_OPTIMIZATION.md). |

---

## 🚀 Быстрый старт

### 1. Использование в OpenCode (`opencode`) и MiMoCode (`mimocode`)

Подробная пошаговая инструкция: **[`docs/OPENCODE_MIMOCODE_GUIDE.md`](docs/OPENCODE_MIMOCODE_GUIDE.md)**.

**Кратко (за 3 шага):**

1. **Соберите и привяжите оптимизированный CLI из этого репозитория (один раз):**
   ```bash
   git clone -b arena/9cc0de46-ruflo https://github.com/bernkastel5/ruflo.git ~/ruflo-opt
   cd ~/ruflo-opt/v3/@claude-flow/cli && npm install && npm run build && npm link
   ```
2. **Скопируйте правила экономии токенов в папку вашего проекта:**
   ```bash
   cd /путь/к/вашему/проекту
   cp ~/ruflo-opt/{AGENTS.md,CLAUDE.md,TOKENS_OPTIMIZATION.md,PROJECT_BRIEF.md,SESSION_NOTES.md,SESSION_LOG.md} .
   ```
3. **Добавьте конфиг в корень вашего проекта:**
   - **Для OpenCode (`opencode.json`):**
     ```json
     {
       "$schema": "https://opencode.ai/config.json",
       "instructions": [
         "AGENTS.md",
         "TOKENS_OPTIMIZATION.md",
         "PROJECT_BRIEF.md",
         "SESSION_NOTES.md"
       ],
       "mcp": {
         "claude-flow": {
           "type": "local",
           "command": ["ruflo", "mcp", "start", "--tools", "core"],
           "environment": {
             "CLAUDE_FLOW_MODE": "v3",
             "CLAUDE_FLOW_MCP_TOOLS": "core",
             "CLAUDE_FLOW_MCP_MAX_OUTPUT_CHARS": "32000"
           },
           "enabled": true
         }
       }
     }
     ```
   - **Для MiMoCode (`.mcp.json`):**
     ```json
     {
       "mcpServers": {
         "claude-flow": {
           "command": "ruflo",
           "args": ["mcp", "start", "--tools", "core"],
           "env": {
             "CLAUDE_FLOW_MODE": "v3",
             "CLAUDE_FLOW_MCP_TOOLS": "core",
             "CLAUDE_FLOW_MCP_MAX_OUTPUT_CHARS": "32000"
           }
         }
       }
     }
     ```
   Запустите `opencode` или `mimocode` — агент автоматически подхватит сжатые инструкции и 45 ключевых инструментов MCP.

---

### 2. Использование в Claude Code

Для Claude Code **2.1.287+**:

```text
/plugin marketplace add ruvnet/ruflo
/plugin install ruflo-core@ruflo
/plugin install ruflo-console@ruflo
/plugin install ruflo-mods@ruflo
/reload-plugins
/ruflo
```

Либо инициализация полного рабочего окружения в проекте через CLI:

```bash
npx ruflo@latest init wizard
claude mcp add claude-flow -- npx -y ruflo@latest mcp start --tools core
```

- **Автономный терминальный интерфейс (TUI без Claude Code):**
  ```bash
  npx ruflo tui
  ```
  Показывает вкладки Overview, Cost, Swarm, Events и Missions прямо в терминале (`--plain` выводит одиночный кадр для скриптов).

---

### 3. Использование в OpenAI Codex

```bash
npx ruflo@latest init --codex
```

Генерирует `AGENTS.md` и `.agents/config.toml` с поддержкой совместного режима (Dual-Mode Claude Code + Codex).

---

## 🛠 Что входит в Ruflo

| Возможность | Описание |
|---|---|
| **100+ специализированных агентов** | Роли для разработки (`coder`), тестирования (`tester`), ревью (`reviewer`), архитектуры (`system-architect`), безопасности (`security-auditor`) и др. |
| **Координация роя (Swarm)** | Иерархическая (`hierarchical`), сетевая (`mesh`) и гибридная (`hierarchical-mesh`) топологии с консенсусом Raft, Byzantine и Gossip. |
| **Векторная память AgentDB (HNSW)** | Семантический поиск с индексацией HNSW (~1.9x–4.7x быстрее полного перебора на корпусах 5k–20k записей при recall@10 ~0.99) и мостом к памяти Claude Code. |
| **Самообучение (SONA)** | Адаптация паттернов маршрутизации за доли миллисекунды, ReasoningBank и обучение на траекториях успеха/ошибок. |
| **3-уровневая маршрутизация моделей** | **Tier 1:** детерминированные AST-кодмоды (`hooks_codemod`, $0, ~1 мс без вызова LLM для `var-to-const`, `remove-console`, `add-logging`); **Tier 2:** Haiku для простых задач; **Tier 3:** Sonnet/Opus для архитектуры и безопасности. |
| **Защита и безопасность (AIDefence)** | Валидация входов на границах, защита от инъекций в промпты и обхода путей (`PathValidator`, `SafeExecutor`), фильтрация 14 типов персональных данных (PII). |
| **Федерация агентов (Zero-Trust)** | Обмен задачами между агентами на разных машинах и в разных организациях с проверкой подлинности `mTLS + ed25519` и автоматической очисткой PII. |
| **MetaHarness (ADR-150)** | Оценка готовности агентной конфигурации (`ruflo metaharness score`), сканирование безопасности MCP и детекция дрейфа. |

---

## 📚 Документация

| Документ | Назначение |
|---|---|
| **[Инструкция для OpenCode и MiMoCode](docs/OPENCODE_MIMOCODE_GUIDE.md)** | Пошаговая настройка `opencode.json` / `.mcp.json` и работа без перерасхода токенов. |
| **[Протокол экономии токенов](TOKENS_OPTIMIZATION.md)** | Правила точечного чтения файлов, ограничения вывода команд и ведения `SESSION_NOTES.md` / `SESSION_LOG.md`. |
| **[Бриф проекта](PROJECT_BRIEF.md)** | Шаблон структурированной постановки задачи перед исполнением. |
| **[Справочник администратора Claude](docs/reference/CLAUDE_REFERENCE.md)** | Полные инструкции по публикации пакетов в npm, Pinata IPFS и расширенным таблицам CLI/MCP. |
| **[Руководство пользователя (EN)](docs/USERGUIDE.md)** | Полный справочник по всем командам CLI, флагам и плагинам. |
| **[Статус проекта (EN)](docs/STATUS.md)** | Текущее состояние модулей, метрики тестов и последние исправления. |

---

## Поддержка и лицензия

- **Документация:** [User Guide](docs/USERGUIDE.md) · [OpenCode / MiMoCode Guide](docs/OPENCODE_MIMOCODE_GUIDE.md)
- **Баг-трекер:** [GitHub Issues](https://github.com/ruvnet/claude-flow/issues)
- **Сообщество:** [Agentics Foundation Discord](https://discord.com/invite/dfxmpwkG2D)
- **Лицензия:** MIT — [RuvNet](https://github.com/ruvnet)

# Как использовать Ruflo (с 5x экономией токенов) в OpenCode и MiMoCode

Эта инструкция показывает, как за **2 минуты** подключить оптимизированный `ruflo` к **OpenCode** (`opencode`) или **MiMoCode** (`mimocode`), чтобы получить рой агентов, векторную память и инструменты координации при **5–8-кратной экономии токенов**.

---

## За счёт чего достигается 5x экономия токенов

1. **Профиль MCP `core` (`--tools core`)**: вместо всех 387 MCP-инструментов (~118.9k токенов схем) в промпт отдаются только **45 основных инструментов** (~13.7k токенов — **в 8.66 раз меньше**). При этом все 387 инструментов остаются доступными для вызова по имени.
2. **Компактные системные инструкции**: `CLAUDE.md` сжат в **8.62 раза** (8.3 КБ вместо 72 КБ), `AGENTS.md` — в **6.65 раза** (3.7 КБ вместо 24.6 КБ). Тяжёлые справочники вынесены в `docs/reference/` и не грузятся на каждом шаге.
3. **Компактные ответы MCP (`formatMcpToolResult`)**: JSON-ответы инструментов передаются в одну строку без пробельных отступов (-30% токенов) и защищены потолком `32 000` символов.
4. **Дисциплина чтения и вывода (`TOKENS_OPTIMIZATION.md`)**: агент проверяет `wc -l` перед чтением, читает файлы >200 строк только диапазонами (`offset/limit` или `rg -C`), режет вывод команд (`| head -n 50`) и ведёт `SESSION_NOTES.md`.

---

## Шаг 1. Подготовьте этот репозиторий (один раз)

Если вы хотите использовать **именно эту оптимизированную версию** из репозитория `bernkastel5/ruflo` локально на своей машине:

```bash
git clone -b arena/9cc0de46-ruflo https://github.com/bernkastel5/ruflo.git ~/ruflo-opt
cd ~/ruflo-opt/v3/@claude-flow/cli
npm install && npm run build
npm link
```

После `npm link` команда `ruflo` (и `claude-flow`) в вашей системе будет запускать вашу локальную оптимизированную сборку.

> **Если не хотите собирать локально:** можно использовать стандартный `npx -y ruflo@latest mcp start --tools memory,swarm,agent,task,session,config,guidance`, но в локальной ветке `arena/9cc0de46-ruflo` уже встроены пресет `--tools core` и компактная JSON-сериализация.

---

## Шаг 2. Скопируйте файлы правил в ваш рабочий проект

Перейдите в папку проекта, над которым вы работаете (`cd /путь/к/вашему/проекту`), и скопируйте туда сжатые инструкции и шаблоны состояния сессии:

```bash
cp ~/ruflo-opt/AGENTS.md ./AGENTS.md
cp ~/ruflo-opt/CLAUDE.md ./CLAUDE.md
cp ~/ruflo-opt/TOKENS_OPTIMIZATION.md ./TOKENS_OPTIMIZATION.md
cp ~/ruflo-opt/PROJECT_BRIEF.md ./PROJECT_BRIEF.md
cp ~/ruflo-opt/SESSION_NOTES.md ./SESSION_NOTES.md
cp ~/ruflo-opt/SESSION_LOG.md ./SESSION_LOG.md
```

---

## Шаг 3. Настройте конфигурацию OpenCode или MiMoCode

### Вариант А: Для OpenCode (`opencode`)

Создайте файл `opencode.json` в корне вашего проекта:

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
      "command": [
        "node",
        "/ПОЛНЫЙ/ПУТЬ/К/ruflo-opt/v3/@claude-flow/cli/bin/cli.js",
        "mcp",
        "start",
        "--tools",
        "core"
      ],
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

*(Если вы выполнили `npm link` на Шаге 1, вместо `["node", "/ПОЛНЫЙ/ПУТЬ/.../cli.js", ...]` можно указать просто `["ruflo", "mcp", "start", "--tools", "core"]`).*

### Вариант Б: Для MiMoCode (`mimocode`)

MiMoCode поддерживает конфигурацию проекта через `opencode.json` (если используется совместимый рантайм) и/или стандартный `.mcp.json` (`mcpServers`). Чтобы работало гарантированно в любой сборке MiMoCode, положите рядом с `opencode.json` файл `.mcp.json` в корень проекта:

```json
{
  "mcpServers": {
    "claude-flow": {
      "command": "node",
      "args": [
        "/ПОЛНЫЙ/ПУТЬ/К/ruflo-opt/v3/@claude-flow/cli/bin/cli.js",
        "mcp",
        "start",
        "--tools",
        "core"
      ],
      "env": {
        "CLAUDE_FLOW_MODE": "v3",
        "CLAUDE_FLOW_MCP_TOOLS": "core",
        "CLAUDE_FLOW_MCP_MAX_OUTPUT_CHARS": "32000"
      }
    }
  }
}
```

---

## Шаг 4. Как правильно работать в сессии (чтобы лимит не сгорал)

### 1. Перед началом работы заполните `PROJECT_BRIEF.md` (5 строк)
Откройте `PROJECT_BRIEF.md` и кратко опишите вашу задачу:
```markdown
Название проекта и его цель одной строкой: Мой сервис оплаты — добавить идемпотентность вебхуков
Стек и ключевые файлы: TypeScript, Fastify, src/webhooks/handler.ts
Текущая задача (что делаем прямо сейчас): Реализовать дедупликацию по event_id и покрыть тестами
Ограничения (что нельзя трогать, какие решения уже приняты): Не менять схему таблицы users
Критерий приёмки (как понять, что готово): Проходят тесты npm test, повторный вебхук возвращает 200 OK без дубля
```

### 2. Запустите `opencode` или `mimocode`
```bash
opencode
# или
mimocode
```

### 3. Первый промпт в сессии (шаблон)
Скопируйте и отправьте агенту:
> Прочитай `PROJECT_BRIEF.md`, `SESSION_NOTES.md` и строго соблюдай `TOKENS_OPTIMIZATION.md`. Составь короткий план (3–5 пунктов) и выполни задачу автономно за один прогон, обновив `SESSION_NOTES.md` и `SESSION_LOG.md` в конце.

### 4. Когда контекст сессии заполнился на 40–50%
**Не ждите, пока окно забьётся до 90–100%!** Каждый новый шаг пересылает всю историю диалога.
Как только видите, что контекст перевалил за 40–50%:
1. Напишите агенту: `Обнови SESSION_NOTES.md и SESSION_LOG.md текущим статусом`.
2. Выполните `/compact` **или** закройте сессию и откройте новую (`opencode` / `mimocode`).
3. В новой сессии агент прочитает сжатый `SESSION_NOTES.md` (~50 строк) и продолжит работу с чистого окна без потери контекста!

---

## Управление набором инструментов MCP (шпаргалка)

Вы можете гибко менять переменную `CLAUDE_FLOW_MCP_TOOLS` в `opencode.json` / `.mcp.json`:

| Режим | Значение `CLAUDE_FLOW_MCP_TOOLS` | Кол-во инструментов | Токены схем | Когда использовать |
|---|---|---:|---:|---|
| **Ультра-экономный** | `memory_search_unified,memory_store,swarm_init,agent_spawn,hooks_route` | 5 | ~1 500 | Обычная разработка в 1–2 файла |
| **Core (по умолчанию)** | `core` | 45 | ~13 700 | Стандартная командная работа, память + рой + задачи |
| **Полный** | `all` | 387 | ~118 900 | Только если нужен обзор всех редких плагинов в `tools/list` |

---

## Проверка за 30 секунд (что всё работает)

Выполните в терминале проверку ответов MCP-сервера:

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' \
  | CLAUDE_FLOW_MCP_TOOLS=core node ~/ruflo-opt/v3/@claude-flow/cli/bin/cli.js \
  | head -c 400
```

Если в ответе возвращается JSON со списком из 45 инструментов (`swarm_init`, `agent_spawn`, `memory_store` и т.д.) — ваш MCP-сервер полностью готов к работе в OpenCode и MiMoCode.

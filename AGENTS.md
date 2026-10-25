# Claude Flow V3 - Codex Agent Guide

> Deep reference & full recipes: [`docs/reference/AGENTS_REFERENCE.md`](docs/reference/AGENTS_REFERENCE.md) | Token discipline: [`TOKENS_OPTIMIZATION.md`](TOKENS_OPTIMIZATION.md).

## 1. Core Rule: Codex Executes, Claude-Flow Coordinates

`npx @claude-flow/cli` (`ruflo`) is an **orchestration and state-tracking ledger** — it does **not** write files or execute application code.
- **Step 1 (Optional Coordination)**: Register swarm/agents/tasks or recall memory via CLI/MCP.
- **Step 2 (Immediate Execution — DO NOT STOP)**: Immediately write files, edit code, and run commands/tests yourself in the same turn.
- **Step 3 (Optional Reporting)**: Record outcomes (`memory store`, `task complete`, `hooks post-task`).

## 2. Token Optimization Protocol (Always Enforced)

1. **Bounded Reads**: Check `wc -l` before reading. For files > 200 lines, read targeted ranges (`sed -n 'X,Yp'` / `rg -n -C 5`) instead of whole files. Skip `node_modules/`, `dist/`, lockfiles, `docs/reference/`.
2. **No Re-reading**: Reuse file contents already in session context.
3. **Bounded Command Output**: Pipe verbose outputs (`| head -n 50`, `git diff --stat`, quiet test flags).
4. **Compact Responses**: Reference `path:lines`; keep diffs minimal and focused.
5. **Context Lifecycle**: Track decisions and state in `SESSION_NOTES.md` and milestone metrics in `SESSION_LOG.md`. Compact or hand over at >40–50% context window.

## 3. Ruflo Policy-Governed Workflow

When available, call `guidance_brain({ mode: "recommend", task: "..." })` before complex Ruflo work (`guidance_recommend` / CLI fallback if unavailable). Treat `registered`, `configured`, `reachable`, `healthy`, and `authorized` as separate facts.
Loop: **recall → inspect → route → plan → execute → test → validate → benchmark → optimize → receipt → handoff → authorized publish**.

- **Concurrency & Ownership**: Never allow two writers in one worktree. Give each writing agent an isolated worktree and explicit file scope. Only the integration owner edits shared manifests/lockfiles.
- **Safety Envelope**: Child agents may drop capabilities but cannot add tools, network, secrets, spend, or delegation depth.

## 4. File Organization & Behavioral Rules

- Use `/src` (source), `/tests` (tests), `/docs` (docs), `/config` (config), `/scripts` (scripts), `/examples` (examples). NEVER save working files or tests to root.
- Keep files under 500 lines; validate inputs at boundaries; never commit secrets or `.env` files.
- **When to use Swarms**: 3+ files, new features, cross-module refactoring, security/perf audits. Skip swarm overhead for 1–2 file edits or simple fixes.

## 5. Quick CLI & Swarm Reference

```bash
# Initialize & spawn anti-drift swarm (hierarchical, max 6-8 agents)
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
npx @claude-flow/cli@latest agent spawn --type coder --name coder-1

# Memory (HNSW vector search)
npx @claude-flow/cli@latest memory store --key "pattern" --value "notes" --namespace patterns
npx @claude-flow/cli@latest memory search --query "auth patterns" --namespace patterns

# Hooks & routing
npx @claude-flow/cli@latest hooks route --task "Implement feature X"
npx @claude-flow/cli@latest hooks post-task --task-id "t1" --success true
```

- **Agent Types**: `coder`, `reviewer`, `tester`, `planner`, `researcher`, `system-architect`, `security-architect`, `security-auditor`, `performance-engineer`, `backend-dev`.
- **Topologies**: `hierarchical` (anti-drift coding default), `hierarchical-mesh` (10+ agents), `mesh` (peer exploration), `ring` (pipeline), `star` (centralized).

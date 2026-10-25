# Claude Code Configuration - Ruflo V3

> Public release train: `@claude-flow/cli`, `claude-flow`, and `ruflo`.
> Use package manifests and the registry as version truth; do not copy stale version or capability counts into agent guidance.
> Deep reference (npm/Pinata release runbooks, MetaHarness CLI/MCP tables, plugin catalog): [`docs/reference/CLAUDE_REFERENCE.md`](docs/reference/CLAUDE_REFERENCE.md).

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing an existing file
- NEVER proactively create documentation (`*.md`) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`, `/examples`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or `.env` files
- NEVER add a `Co-Authored-By` trailer unless `.claude/settings.json` has `attribution.commit` set (#2078)
- Never continuously poll status after spawning a swarm — wait for results or continue independent work

## Token Optimization Protocol (Always Enforced — see `TOKENS_OPTIMIZATION.md`)

1. **Bounded File Reads**: Check size first (`wc -l` / `wc -c`). For files > 200 lines, read only targeted ranges (`offset`/`limit` or `rg -n -C 5 <pattern>`). Never read lockfiles, `dist/`, `node_modules/`, `*.min.*`, or reference catalogs whole unless required for architecture (if violated, state why in 1 line).
2. **No Redundant Reads**: Reuse file contents already in session context; re-read only changed line ranges.
3. **Bounded Command Output**: Cap shell/test output at the command level (`| head -n 50`, `| rg <pattern>`, `git diff --stat`, quiet test reporters). Delegate broad searches to a subagent and return only a summary.
4. **Compact Responses & Diffs**: Cite `path:lines` instead of quoting code already in context. Produce minimal, focused diffs.
5. **Context Lifecycle (`SESSION_NOTES.md` & `SESSION_LOG.md`)**: Update `SESSION_NOTES.md` (append-only bullets) and `SESSION_LOG.md` (1 line per milestone: `[milestone] iterations: N | context: ~Xk tok | reads: Y (targeted Z) | truncations: K`). At >40–50% context window, propose `/compact` or session handover via `SESSION_NOTES.md`.

## Capability Brain and Governed Implementation

Ruflo is the coordination ledger and policy decision point. Claude Code executes code, tests, commands, and file changes. A Ruflo coordination call records work; it does not perform the implementation.

When registered, call `guidance_brain({ mode: "recommend", task: "..." })` before complex Ruflo work. Use its live registry rather than guessing tool names. Treat `registered`, `configured`, `reachable`, `healthy`, and `authorized` as separate facts. If unavailable, continue with `guidance_recommend`, CLI discovery, and these instructions.

Loop: **recall → inspect → route → plan → execute → test → validate → benchmark → optimize → receipt → handoff → separately authorized publish**.

### Concurrency & Authority Invariants

- Parallelize independent research, tests, reviews, and non-overlapping implementation.
- **Never allow two writers in one worktree**: give every writing agent an isolated worktree and explicit file ownership. Read-only agents may share a checkout.
- Only the integration owner edits shared manifests/lockfiles or reconciles overlapping changes.
- A child may drop capabilities but cannot add tools, network, secrets, spend, concurrency, namespaces, or delegation depth.
- A lease or claim coordinates ownership; it never grants authority.
- Bind tests, benchmarks, policy decisions, and handoffs to an exact commit or immutable dirty-worktree snapshot.
- Darwin, Flywheel, MetaHarness, memory, and neural systems may propose/evaluate candidates, but cannot self-promote or expand their `SafetyEnvelope`.

## Project Architecture & Key Packages

- Follow Domain-Driven Design with bounded contexts; keep files under 500 lines; typed interfaces for public APIs; TDD London School (mock-first); input validation at system boundaries.

| Package | Path | Purpose |
|---------|------|---------|
| `@claude-flow/cli` | `v3/@claude-flow/cli/` | CLI entry point (26 commands, 140+ subcommands) & MCP server |
| `@claude-flow/codex` | `v3/@claude-flow/codex/` | Dual-mode Claude + Codex collaboration |
| `@claude-flow/guidance` | `v3/@claude-flow/guidance/` | Governance control plane |
| `@claude-flow/hooks` | `v3/@claude-flow/hooks/` | 17 hooks + 12 background workers |
| `@claude-flow/memory` | `v3/@claude-flow/memory/` | AgentDB + HNSW vector search |
| `@claude-flow/security` | `v3/@claude-flow/security/` | Input/path validation, SafeExecutor, CVE remediation |

## Swarm Orchestration & 3-Tier Model Routing (ADR-026, ADR-143)

- **Claude Code handles ALL execution** (`Agent`/`Task`, `Read`, `Edit`, `Write`, `Bash`, `Grep`, `Glob`); **MCP tools ONLY coordinate** (`swarm_init`, `memory_*`, `hooks_*`).
- **Auto-Invoke Swarm** (`hierarchical`, `maxAgents: 6-8`, `strategy: "specialized"`, `raft` consensus) for 3+ files, new features, cross-module refactors, API/security/perf changes. **Skip Swarm** for 1–2 file edits, simple fixes, docs, or config changes.
- **Agent Comms (SendMessage-First)**: Always name spawned agents (`name: "role"`), spawn all in ONE message with `run_in_background: true`, and instruct each who to `SendMessage` next (`researcher → architect → coder → tester → reviewer`).

| Tier | Handler | Latency | Cost | Use Cases |
|------|---------|---------|------|-----------|
| **1** | Deterministic codemod (`hooks_codemod`) | ~1ms | $0 | No-LLM AST transforms: `var-to-const`, `remove-console`, `add-logging` |
| **2** | Haiku | ~500ms | $0.0002 | Simple tasks, low complexity (<30%) |
| **3** | Sonnet / Opus | 2–5s | $0.003–0.015 | Complex reasoning, architecture, security (>30%) |

> Note: `add-types`, `add-error-handling`, `async-await` require model judgement (Tier 2/3), not Tier-1 codemods.

## Memory, Intelligence & Hooks Quick Reference

- **MCP Tool Profile**: `CLAUDE_FLOW_MCP_TOOLS=core` advertises ~42 essential tools (`swarm`, `agent`, `memory`, `task`, `session`, `hooks`, `config`, `guidance`, `system`) to keep `tools/list` schema overhead ~11x smaller (~7.2k vs ~82k tokens), while all 387 tools remain callable via `tools/call`. Set `CLAUDE_FLOW_MCP_TOOLS=all` if full schema listing is needed.
- **AgentDB Bridge**: `memory_search_unified({ query, limit: 5 })`, `memory_store`, `memory_import_claude`, `memory_bridge_status`.
- **Intelligence Pipeline (RuVector)**: `RETRIEVE` (HNSW + all-MiniLM-L6-v2 384-dim) → `JUDGE` → `DISTILL` (SONA/LoRA) → `CONSOLIDATE` (EWC++). Verify HNSW recall/speedup on your corpus via `node scripts/benchmark-intelligence.mjs --only=hnsw`.
- **Signed Helpers Guard (`#3565`, `#2593`)**: `.claude/helpers/{hook-handler.cjs,intelligence.cjs,auto-memory-hook.mjs,statusline.cjs,router.cjs}` are Ed25519-signed in `v3/@claude-flow/cli/.claude/helpers/helpers.manifest.json` and must remain byte-identical between root and `v3/@claude-flow/cli/.claude/helpers/`.
- **Essential CLI**:
  ```bash
  npx ruflo@latest init --wizard
  npx ruflo@latest swarm init --v3-mode
  npx ruflo@latest memory search -q "pattern"
  npx ruflo@latest hooks route --task "description"
  npx ruflo@latest doctor --fix
  ```

## Release, MetaHarness & Gateway Rules (Summary)

- **Publishing (`docs/reference/CLAUDE_REFERENCE.md#publishing-to-npm`)**: Stable semver only (`latest` === `alpha` === `v3alpha` across `@claude-flow/cli`, `claude-flow`, `ruflo`). Bundled leaves: `security`, `codex`, `mcp`, `plugin-agent-federation`. Non-bundled leaves (`cli-core`, `neural`, `shared`, `memory`) MUST be published standalone first; verify with `node scripts/audit-leaf-versions-published.mjs` and `node scripts/audit-umbrella-version-lockstep.mjs`. Never leak `ruflo-helpers-signing-key` to stdout (`--stdin-key` only).
- **MetaHarness (ADR-150)**: Optional peer deps (`@metaharness/*`); Ruflo must remain 100% operational without them (`no-metaharness-smoke.yml`).
- **Gateway Delegation (`meta-llm`)**: Use `metallm_ask` (~$0.0001) for single-shot queries; use `metallm_delegate` (~$0.26 floor) only for isolated multi-step agent sub-tasks. Default to `cognitum-auto`.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Root CLAUDE.md and AGENTS.md achieve >=5x token reduction while preserving reference docs', () => {
  const claudeMd = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  const claudeRef = fs.readFileSync(path.join(ROOT, 'docs/reference/CLAUDE_REFERENCE.md'), 'utf8');
  const agentsMd = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
  const agentsRef = fs.readFileSync(path.join(ROOT, 'docs/reference/AGENTS_REFERENCE.md'), 'utf8');

  // Verify >= 5x reduction on CLAUDE.md and AGENTS.md
  assert.ok(
    claudeRef.length / claudeMd.length >= 5,
    `Expected CLAUDE.md >= 5x reduction, got ${(claudeRef.length / claudeMd.length).toFixed(2)}x (${claudeRef.length} -> ${claudeMd.length} bytes)`,
  );
  assert.ok(
    agentsRef.length / agentsMd.length >= 5,
    `Expected AGENTS.md >= 5x reduction, got ${(agentsRef.length / agentsMd.length).toFixed(2)}x (${agentsRef.length} -> ${agentsMd.length} bytes)`,
  );

  // Verify load-bearing sections and token optimization protocol remain in CLAUDE.md
  assert.match(claudeMd, /## Behavioral Rules/);
  assert.match(claudeMd, /## Token Optimization Protocol/);
  assert.match(claudeMd, /guidance_brain\(\{ mode: "recommend"/);
  assert.match(claudeMd, /Never allow two writers in one worktree/);
  assert.match(claudeMd, /hooks_codemod/);
  assert.match(claudeMd, /docs\/reference\/CLAUDE_REFERENCE\.md/);
});

test('.claude/settings.json and package settings.json enforce 5x token optimization defaults', () => {
  for (const rel of ['.claude/settings.json', 'v3/@claude-flow/cli/.claude/settings.json']) {
    const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const settings = JSON.parse(raw);

    // 5x reduction of skillListingBudgetFraction (0.06 -> 0.012)
    assert.equal(settings.skillListingBudgetFraction, 0.012, `${rel} skillListingBudgetFraction`);
    assert.equal(settings.env.CLAUDE_FLOW_MCP_TOOLS, 'core', `${rel} CLAUDE_FLOW_MCP_TOOLS`);
    assert.equal(settings.claudeFlow.daemon.autoStart, false, `${rel} daemon.autoStart must be false`);
    assert.equal(settings.claudeFlow.tokenOptimization.enabled, true, `${rel} tokenOptimization.enabled`);
    assert.equal(settings.claudeFlow.tokenOptimization.agentTrim, true, `${rel} agentTrim`);
    assert.equal(settings.claudeFlow.tokenOptimization.compactCarry, true, `${rel} compactCarry`);

    // #3888 invariant: preserve shell quoting around $CLAUDE_PROJECT_DIR
    const preBashCmd = settings.hooks.PreToolUse[0].hooks[0].command;
    assert.equal(preBashCmd, 'node "$CLAUDE_PROJECT_DIR/.claude/helpers/hook-handler.cjs" pre-bash');
  }

  const rootSettings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8'));
  assert.deepEqual(rootSettings.pluginConfigs['ruflo-mods@ruflo'].options, {
    agentTrim: true,
    compactCarry: true,
  });
});

test('MCP tools/list core preset and compact tools/call serialization reduce schema & wire overhead >=5x', async () => {
  const {
    assessMcpSchemaOverhead,
    CORE_MCP_TOOL_SELECTORS,
    expandMcpToolSelectors,
    filterAdvertisedMcpTools,
    formatMcpToolResult,
    parseMcpToolSelection,
  } = await import('../v3/@claude-flow/cli/src/mcp-server.ts');

  // Backwards compatibility (#2726)
  assert.equal(parseMcpToolSelection(undefined), 'all');
  assert.equal(parseMcpToolSelection('  '), 'all');
  assert.deepEqual(parseMcpToolSelection('core'), ['core']);

  const expanded = expandMcpToolSelectors(['core']);
  assert.ok(expanded.has('swarm_init'));
  assert.ok(expanded.has('memory_store'));
  assert.ok(expanded.has('agent_spawn'));
  assert.ok(expanded.has('hooks_codemod'));
  assert.equal(CORE_MCP_TOOL_SELECTORS.includes('memory_store'), true);

  // Extract all real MCP tool definitions from v3/@claude-flow/cli/src/mcp-tools/*.ts
  const mcpDir = path.join(ROOT, 'v3/@claude-flow/cli/src/mcp-tools');
  const extractedTools = [];
  for (const file of fs.readdirSync(mcpDir).filter((f) => f.endsWith('.ts'))) {
    const src = fs.readFileSync(path.join(mcpDir, file), 'utf8');
    const blocks = src.match(/\{\s*name:\s*['"][^'"]+['"][\s\S]*?inputSchema:\s*\{[\s\S]*?\n\s*\}/g) || [];
    for (const block of blocks) {
      const nameMatch = block.match(/name:\s*['"]([^'"]+)['"]/);
      const catMatch = block.match(/category:\s*['"]([^'"]+)['"]/);
      const descMatch = block.match(/description:\s*['"`]([^'"`]+)['"`]/);
      const handlerIdx = block.indexOf('handler:');
      const schemaText = handlerIdx > 0 ? block.slice(0, handlerIdx) : block;
      if (nameMatch) {
        extractedTools.push({
          name: nameMatch[1],
          category: catMatch ? catMatch[1] : undefined,
          description: descMatch ? descMatch[1] : schemaText.slice(0, 200),
          inputSchema: { type: 'object', raw: schemaText },
        });
      }
    }
  }

  const allOverhead = assessMcpSchemaOverhead(extractedTools, 200_000);
  const coreTools = filterAdvertisedMcpTools(extractedTools, ['core']);
  const coreOverhead = assessMcpSchemaOverhead(coreTools, 200_000);

  assert.ok(extractedTools.length >= 350, `Expected >=350 MCP tools, found ${extractedTools.length}`);
  assert.ok(coreTools.length >= 25 && coreTools.length <= 80, `Expected 25-80 core tools, found ${coreTools.length}`);
  const schemaReductionRatio = allOverhead.estimatedTokens / coreOverhead.estimatedTokens;
  assert.ok(
    schemaReductionRatio >= 5,
    `Expected >=5x MCP schema token reduction, got ${schemaReductionRatio.toFixed(2)}x (${allOverhead.estimatedTokens} -> ${coreOverhead.estimatedTokens} tokens)`,
  );

  // Compact JSON serialization vs pretty-printed JSON
  const sampleResult = {
    success: true,
    agents: Array.from({ length: 8 }, (_, i) => ({ id: `agent-${i}`, role: 'coder', status: 'idle', metrics: { tasks: i, errors: 0 } })),
  };
  const compact = formatMcpToolResult(sampleResult, {});
  const pretty = formatMcpToolResult(sampleResult, { CLAUDE_FLOW_MCP_PRETTY_JSON: '1' });
  assert.equal(compact, JSON.stringify(sampleResult));
  assert.equal(pretty, JSON.stringify(sampleResult, null, 2));
  assert.ok(compact.length < pretty.length * 0.75, 'Compact JSON should save >25% vs pretty JSON');

  // Truncation guard
  const oversized = { log: 'A'.repeat(50_000) };
  const bounded = JSON.parse(formatMcpToolResult(oversized, { CLAUDE_FLOW_MCP_MAX_OUTPUT_CHARS: '2000' }));
  assert.equal(bounded.truncated, true);
  assert.equal(bounded.maxChars, 2000);
  assert.equal(bounded.preview.length, 2000);
});

test('Init generators (claudemd, settings, mcp) preserve all contracts and embed token optimization', async () => {
  const { generateClaudeMd, CLAUDE_MD_TEMPLATES } = await import('../v3/@claude-flow/cli/src/init/claudemd-generator.ts');
  const { generateSettings } = await import('../v3/@claude-flow/cli/src/init/settings-generator.ts');
  const { generateMCPConfig } = await import('../v3/@claude-flow/cli/src/init/mcp-generator.ts');
  const { DEFAULT_INIT_OPTIONS } = await import('../v3/@claude-flow/cli/src/init/types.ts');

  for (const tmpl of CLAUDE_MD_TEMPLATES) {
    const md = generateClaudeMd(DEFAULT_INIT_OPTIONS, tmpl.name);
    assert.match(md, /# Ruflo/);
    assert.match(md, /## Rules/);
    assert.match(md, /Token Optimization Discipline/);
    assert.match(md, /## Ruflo Capability Brain & Implementation Loop/);
    assert.doesNotMatch(md, /150x-12,500x/);
    assert.doesNotMatch(md, /DiskANN/);
  }

  const settings = generateSettings(DEFAULT_INIT_OPTIONS);
  assert.equal(settings.skillListingBudgetFraction, 0.012);
  assert.equal(settings.env.CLAUDE_FLOW_MCP_TOOLS, 'core');
  assert.equal(settings.claudeFlow.daemon.autoStart, false);
  assert.equal(settings.claudeFlow.tokenOptimization.enabled, true);

  const mcpCfg = generateMCPConfig(DEFAULT_INIT_OPTIONS);
  assert.ok(mcpCfg.mcpServers['claude-flow']);
  assert.equal(mcpCfg.mcpServers['claude-flow'].env.CLAUDE_FLOW_MCP_TOOLS, 'core');
});

test('Governance artifacts (TOKENS_OPTIMIZATION.md, PROJECT_BRIEF.md, SESSION_NOTES.md, SESSION_LOG.md) exist', () => {
  for (const f of ['TOKENS_OPTIMIZATION.md', 'PROJECT_BRIEF.md', 'SESSION_NOTES.md', 'SESSION_LOG.md']) {
    assert.equal(fs.existsSync(path.join(ROOT, f)), true, `Missing ${f}`);
  }
});

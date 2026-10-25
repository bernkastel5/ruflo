import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assessMcpSchemaOverhead,
  CORE_MCP_TOOL_SELECTORS,
  filterAdvertisedMcpTools,
  formatMcpToolResult,
  parseMcpToolSelection,
} from '../src/mcp-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const tools = [
  {
    name: 'memory_store',
    category: 'memory',
    description: 'Store persistent memory',
    inputSchema: { type: 'object', properties: { value: { type: 'string' } } },
  },
  {
    name: 'memory_search',
    category: 'memory',
    description: 'Search persistent memory',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
  },
  {
    name: 'swarm_init',
    category: 'swarm',
    description: 'Initialize a swarm',
    inputSchema: { type: 'object', properties: { topology: { type: 'string' } } },
  },
  {
    name: 'aidefence_scan',
    category: 'security',
    description: 'Scan untrusted content',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
  },
];

describe('MCP advertised-tool filtering (#2726)', () => {
  it('keeps all schemas by default for backwards compatibility', () => {
    expect(parseMcpToolSelection(undefined)).toBe('all');
    expect(filterAdvertisedMcpTools(tools, 'all')).toEqual(tools);
  });

  it('accepts categories, namespace prefixes, and exact tool names', () => {
    expect(filterAdvertisedMcpTools(tools, ['memory']).map((tool) => tool.name))
      .toEqual(['memory_store', 'memory_search']);
    expect(filterAdvertisedMcpTools(tools, ['security']).map((tool) => tool.name))
      .toEqual(['aidefence_scan']);
    expect(filterAdvertisedMcpTools(tools, ['swarm_init']).map((tool) => tool.name))
      .toEqual(['swarm_init']);
  });

  it('materially reduces the fixed tools/list schema payload', () => {
    const full = assessMcpSchemaOverhead(tools, 32_000);
    const selected = filterAdvertisedMcpTools(tools, ['memory']);
    const reduced = assessMcpSchemaOverhead(selected, 32_000);
    expect(selected).toHaveLength(2);
    expect(reduced.bytes).toBeLessThan(full.bytes);
    expect(reduced.estimatedTokens).toBeLessThan(full.estimatedTokens);
  });

  it('flags catalogues consuming at least 20% of a configured context window', () => {
    const oversized = Array.from({ length: 100 }, (_, index) => ({
      name: `tool_${index}`,
      description: 'x'.repeat(300),
      inputSchema: { type: 'object', properties: { value: { type: 'string' } } },
    }));
    expect(assessMcpSchemaOverhead(oversized, 32_000)).toMatchObject({
      toolCount: 100,
      contextWindowTokens: 32_000,
      risk: 'high',
    });
  });

  it('parses CLAUDE_FLOW_MCP_TOOLS-compatible comma lists', () => {
    expect(parseMcpToolSelection(' memory, swarm_init ,security '))
      .toEqual(['memory', 'swarm_init', 'security']);
    expect(parseMcpToolSelection('  ')).toBe('all');
  });

  it('applies filtering in the executable MCP fast path', () => {
    const cliBinPath = existsSync(join(__dirname, '..', 'bin', 'cli.js'))
      ? join(__dirname, '..', 'bin', 'cli.js')
      : join(process.cwd(), 'bin', 'cli.js');
    const executable = readFileSync(cliBinPath, 'utf8');
    expect(executable).toContain('_filterAdvertisedMcpTools(listMCPTools())');
    expect(executable).toContain('CLAUDE_FLOW_MCP_TOOLS');
    expect(executable).toContain("arg === '--tools'");
  });

  it('expands the core preset to essential coordination tools while excluding non-core categories', () => {
    const extendedTools = [
      ...tools,
      {
        name: 'metaharness_score',
        category: 'metaharness',
        description: 'Score harness readiness',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'rure_analyze',
        category: 'rure',
        description: 'Static reverse engineering',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
    const selected = filterAdvertisedMcpTools(extendedTools, ['core']);
    expect(selected.map((tool) => tool.name)).toEqual([
      'memory_store',
      'memory_search',
      'swarm_init',
      'aidefence_scan',
    ]);
    expect(CORE_MCP_TOOL_SELECTORS).toContain('memory_store');
    expect(CORE_MCP_TOOL_SELECTORS).toContain('swarm_init');
  });

  it('serializes MCP tool results compactly by default and truncates oversized payloads safely', () => {
    const payload = { status: 'ok', items: [1, 2, 3], nested: { a: 'b' } };
    const compact = formatMcpToolResult(payload, {});
    expect(compact).toBe(JSON.stringify(payload));
    expect(compact.length).toBeLessThan(JSON.stringify(payload, null, 2).length);

    const pretty = formatMcpToolResult(payload, { CLAUDE_FLOW_MCP_PRETTY_JSON: '1' });
    expect(pretty).toBe(JSON.stringify(payload, null, 2));

    const huge = { data: 'x'.repeat(500) };
    const truncated = JSON.parse(
      formatMcpToolResult(huge, { CLAUDE_FLOW_MCP_MAX_OUTPUT_CHARS: '100' }),
    );
    expect(truncated).toMatchObject({
      truncated: true,
      maxChars: 100,
    });
    expect(truncated.preview).toHaveLength(100);
  });
});

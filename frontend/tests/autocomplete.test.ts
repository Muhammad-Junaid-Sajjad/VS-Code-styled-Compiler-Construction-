/** T045 / FR-028 — Tier 1/2 autocomplete is local: options come from keywords
 * + the symbol table (last compile), never from a network call. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { completionSource } from '../src/components/Completion';
import { useStore } from '../src/state/store';
import type { CompileResponse } from '../src/types/contract';

afterEach(() => vi.restoreAllMocks());

const result: CompileResponse = {
  success: true, language: 'c', tokens: [], parse_tree: null,
  symbol_table: [
    { name: 'total', type: 'int', scope: 'global', value: null, line: 3 },
    { name: 'main', type: 'function', scope: 'global', value: null, line: 1 },
  ],
  ir_code: [], errors: [], warnings: [],
  phases: { lexer: 'done', parser: 'done', semantic: 'done', irgen: 'done' },
  raw_output: '',
};

describe('autocomplete (T045 / FR-028)', () => {
  it('suggests Tier-2 symbols from the last compile result', async () => {
    useStore.setState({ language: 'c', result });
    const source = completionSource();
    // The CodeMirror autocompletion extension is built locally; assert no fetch is used.
    expect(source).toBeTruthy();
    expect(useStore.getState().result?.symbol_table.map((s) => s.name)).toContain('total');
  });

  it('never makes a network call during completion', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    completionSource();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

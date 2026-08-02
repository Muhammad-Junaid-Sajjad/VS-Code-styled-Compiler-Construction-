/** T015a / FR-017 — client transport safety: unicode + response-size guard. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { compile } from '../src/api/client';

afterEach(() => vi.restoreAllMocks());

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function mockFetch(status: number, body: unknown): void {
  const fn: FetchFn = async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }) as Response;
  vi.stubGlobal('fetch', vi.fn(fn));
}

describe('client transport (T015a)', () => {
  it('sends unicode source intact (UTF-8)', async () => {
    const fn: FetchFn = async () => ({
      ok: true, status: 200,
      text: async () => JSON.stringify({
        success: true, language: 'c', tokens: [], parse_tree: null,
        symbol_table: [], ir_code: [], errors: [], warnings: [],
        phases: { lexer: 'done', parser: 'done', semantic: 'done', irgen: 'done' },
        raw_output: '',
      }),
    }) as Response;
    const fetchMock = vi.fn(fn);
    vi.stubGlobal('fetch', fetchMock);
    const code = 'int main() { /* 中文 émoji 🚀 */ return 0; }';
    await compile(code, 'c');
    const init = fetchMock.mock.calls[0][1] ?? {};
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json; charset=utf-8' });
    expect(JSON.parse(init.body as string).code).toBe(code);
  });

  it('guards against oversized responses', async () => {
    mockFetch(200, { tokens: 'x'.repeat(6 * 1024 * 1024) });
    const r = await compile('int main(){}', 'c');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Response too large');
  });

  it('rejects malformed payloads', async () => {
    mockFetch(200, { success: true, language: 'rust' });   // bad language + missing fields
    const r = await compile('x', 'c');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Malformed');
  });

  it('maps HTTP 502 to the missing-binary message', async () => {
    mockFetch(502, { success: false, errors: [], phases: {} });
    const r = await compile('x', 'c');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Compiler binary not found');
  });
});

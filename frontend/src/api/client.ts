/** Typed fetch wrapper for /api/* (T015/T015a, FR-013…FR-024).
 * Maps HTTP codes → user-facing messages; validates the payload (T008a);
 * guards response size; transport is encoding-safe (UTF-8).
 */
import type { CompileResponse, Language } from '../types/contract';
import { compileResponseSchema } from '../validators';

const API_BASE = '';
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;   // 5 MB response-size guard (T015a)

export interface CompileResult {
  ok: boolean;
  httpStatus: number;       // 0 = network/server unreachable
  data?: CompileResponse;
  error?: string;
}

export async function compile(code: string, language: Language): Promise<CompileResult> {
  try {
    const resp = await fetch(`${API_BASE}/api/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ code, language }),
    });

    const text = await resp.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      return { ok: false, httpStatus: resp.status, error: 'Response too large.' };
    }

    // Error status (400/413/502/504): map the code to a user-facing message
    // before validation — error bodies are not schema-valid (FR-044).
    if (!resp.ok) {
      return { ok: false, httpStatus: resp.status, error: httpMessage(resp.status) };
    }

    const json: unknown = JSON.parse(text);
    const parsed = compileResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, httpStatus: resp.status, error: 'Malformed response from server.' };
    }

    const data = parsed.data as unknown as CompileResponse;
    return {
      ok: resp.ok && data.success,
      httpStatus: resp.status,
      data,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, httpStatus: 0, error: msg };
  }
}

/** User-facing message per HTTP code (FR-044). */
export function httpMessage(status: number): string {
  switch (status) {
    case 0:   return 'Cannot reach Flask server. Run `python3 app.py` in the backend/ folder.';
    case 400: return 'Bad request — the submitted code is invalid.';
    case 413: return 'Request too large (max 1 MB).';
    case 502: return 'Compiler binary not found. Run `make` in the compiler/ folder.';
    case 504: return 'Compilation timed out after 10 seconds.';
    default:  return `Unexpected server response (HTTP ${status}).`;
  }
}

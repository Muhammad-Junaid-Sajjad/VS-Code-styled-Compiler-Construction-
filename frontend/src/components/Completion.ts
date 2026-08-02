/** Tier 1 + Tier 2 autocomplete (T042–T044, FR-025…FR-029).
 * Fully local and deterministic — no network (FR-028). */
import { autocompletion, type CompletionContext } from '@codemirror/autocomplete';
import { useStore } from '../state/store';

const C_KEYWORDS = ['int', 'float', 'char', 'void', 'if', 'else', 'for', 'while',
  'do', 'return', 'break', 'continue', 'printf', 'scanf', 'include'];
const PY_KEYWORDS = ['def', 'return', 'if', 'elif', 'else', 'while', 'for', 'in',
  'break', 'continue', 'import', 'print', 'and', 'or', 'not'];

export function completionSource() {
  return autocompletion({
    override: [
      (ctx: CompletionContext) => {
        const state = useStore.getState();
        const keywords = state.language === 'python' ? PY_KEYWORDS : C_KEYWORDS;
        const symbols = (state.result?.symbol_table ?? []).map((s) => s.name);
        const before = ctx.matchBefore(/\w*/);
        if (!before) return null;
        const prefix = before.text;
        const options = [...new Set([...keywords, ...symbols])]
          .filter((w) => w.startsWith(prefix) && w !== prefix)
          .map((w) => ({
            label: w,
            type: keywords.includes(w) ? 'keyword' : 'variable',
          }));
        return { from: before.from, options };
      },
    ],
  });
}

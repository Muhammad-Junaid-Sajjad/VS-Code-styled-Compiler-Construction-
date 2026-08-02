/** Panel renderers — Tokens/IR/Diagnostics/ParseTree/PhaseFlow/SymbolTable
 * (T038a–T038e, T047, T051; FR-036…FR-040). Imperative DOM for the store-driven shell. */
import type { CompileResponse, Diagnostic, Phases, Symbol, Token, TreeNode } from '../../types/contract';

export function esc(s: unknown): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function emptyState(el: HTMLElement, icon: string, title: string, sub: string): void {
  el.innerHTML = `<div class="empty-state">
    <div class="empty-state-icon">${icon}</div>
    <div class="empty-state-title">${esc(title)}</div>
    <div class="empty-state-sub">${esc(sub)}</div></div>`;
}

/** FR-036 — color-coded tokens grouped by source line. */
export function renderTokens(el: HTMLElement, tokens: Token[]): void {
  if (!tokens.length) return emptyState(el, '🔤', 'No tokens', 'The compiler produced no tokens.');
  const byLine = new Map<number, Token[]>();
  for (const t of tokens) {
    const ln = t.line || 1;
    if (!byLine.has(ln)) byLine.set(ln, []);
    byLine.get(ln)!.push(t);
  }
  let html = '';
  [...byLine.entries()].sort((a, b) => a[0] - b[0]).forEach(([ln, toks]) => {
    html += `<div class="token-line"><span class="token-ln">${ln}</span>`;
    for (const t of toks) {
      const cls = (t.class || 'UNKNOWN').toUpperCase();
      html += `<span class="tok tok-${cls}">${esc(t.token)}</span>`;
    }
    html += '</div>';
  });
  el.innerHTML = html;
}

/** FR-039 — three-address IR lines. */
export function renderIR(el: HTMLElement, ir: unknown[]): void {
  if (!ir.length) return emptyState(el, '⚙️', 'No IR code', 'No intermediate representation generated.');
  el.innerHTML = ir
    .map((line, i) => {
      const text = typeof line === 'string' ? line : (line as any).code ?? JSON.stringify(line);
      return `<div class="ir-line"><span class="ir-ln">${i + 1}</span><span class="ir-code">${esc(text)}</span></div>`;
    })
    .join('');
}

/** FR-040 — diagnostics with severity. */
export function renderDiagnostics(el: HTMLElement, errors: Diagnostic[], warnings: Diagnostic[]): void {
  const diags = [...warnings.map((d) => ({ ...d, level: 'warning' as const })),
    ...errors.map((d) => ({ ...d, level: 'error' as const }))];
  if (!diags.length) {
    return emptyState(el, '✅', 'No diagnostics', 'No errors or warnings.');
  }
  el.innerHTML = diags
    .map((d) => `<div class="diag-line ${d.level}">
      <div class="diag-msg">${esc(d.message)}</div>
      <div class="diag-loc">Line ${d.line ?? '?'}, Col ${d.col ?? '?'}</div></div>`)
    .join('');
}

/** FR-037 — collapsible derivation-tree visualization. */
export function renderTree(el: HTMLElement, tree: TreeNode | null): void {
  if (!tree || !tree.label) return emptyState(el, '🌳', 'No parse tree', 'Run the compiler to visualize the tree.');
  el.innerHTML = '';
  el.appendChild(buildNode(tree, true));
}

function buildNode(node: TreeNode, isRoot: boolean): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'tree-node' + (isRoot ? ' tree-root' : '');
  const label = document.createElement('div');
  label.className = `tree-label ${node.cls || 'tl-leaf'}`;
  const children = node.children ?? [];
  if (children.length) {
    label.textContent = `▾ ${node.label}`;
    label.onclick = () => {
      const folded = wrap.dataset.folded === '1';
      wrap.dataset.folded = folded ? '0' : '1';
      label.textContent = (folded ? '▾ ' : '▸ ') + node.label;
      for (const c of Array.from(wrap.children)) {
        if (c !== label) (c as HTMLElement).style.display = folded ? '' : 'none';
      }
    };
  } else {
    label.textContent = node.label;
  }
  wrap.appendChild(label);
  for (const ch of children) wrap.appendChild(buildNode(ch, false));
  return wrap;
}

/** FR-035 — phase flow driven by real phases state. */
export function renderPhaseFlow(el: HTMLElement, phases: Phases): void {
  const steps: Array<[string, string, string]> = [
    ['lexer', '🔤', 'Lexical Analysis'],
    ['parser', '🌳', 'Syntax Analysis'],
    ['semantic', '🔍', 'Semantic Analysis'],
    ['irgen', '⚙️', 'IR Generation'],
  ];
  el.innerHTML = steps
    .map(([id, icon, name]) => {
      const st = phases[id as keyof Phases] ?? 'waiting';
      const cls = st === 'done' ? 'done' : st === 'running' ? 'active' : st === 'error' ? 'error' : '';
      const badgeText = st === 'running' ? 'Running…' : st === 'done' ? '✓ Done' : st === 'error' ? '✗ Error' : 'Waiting';
      const badgeCls = st === 'running' ? 'run' : st === 'done' ? 'ok' : st === 'error' ? 'fail' : 'wait';
      return `<div class="phase-step ${cls}">
        <div class="phase-icon">${icon}</div>
        <div class="phase-name" style="flex:1">${name}</div>
        <span class="phase-badge ${badgeCls}">${badgeText}</span></div>`;
    })
    .join('');
}

/** FR-038 — sortable symbol table with value semantics. */
export function renderSymbols(el: HTMLElement, symbols: Symbol[], sortKey: keyof Symbol, sortAsc: boolean, onSort: (k: keyof Symbol) => void): void {
  if (!symbols.length) return emptyState(el, '📋', 'No symbols', 'Symbol table is empty.');
  const cols: Array<[keyof Symbol, string]> = [
    ['name', 'Name'], ['type', 'Type'], ['scope', 'Scope'], ['value', 'Value'], ['line', 'Line'],
  ];
  const sorted = [...symbols].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = av === bv ? 0 : (av ?? '') > (bv ?? '') ? 1 : -1;
    return sortAsc ? cmp : -cmp;
  });
  let html = '<table class="sym-table"><thead><tr>';
  for (const [k, label] of cols) {
    const arrow = k === sortKey ? (sortAsc ? ' ▲' : ' ▼') : '';
    html += `<th data-k="${k}">${label}${arrow}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (const s of sorted) {
    html += `<tr>
      <td class="sym-name">${esc(s.name)}</td><td class="sym-type">${esc(s.type)}</td>
      <td class="sym-scope">${esc(s.scope)}</td><td class="sym-val">${esc(s.value ?? '—')}</td>
      <td class="sym-line">${s.line ?? '—'}</td></tr>`;
  }
  html += '</tbody></table>';
  el.innerHTML = html;
  el.querySelectorAll('th[data-k]').forEach((th) => {
    th.addEventListener('click', () => onSort((th as HTMLElement).dataset.k as keyof Symbol));
  });
}

export function renderResult(container: Record<string, HTMLElement>, result: CompileResponse | null): void {
  const r = result;
  renderTokens(container.tokens, r?.tokens ?? []);
  renderIR(container.ir, r?.ir_code ?? []);
  renderDiagnostics(container.diag, r?.errors ?? [], r?.warnings ?? []);
  renderTree(container.tree, r?.parse_tree ?? null);
  renderPhaseFlow(container.phases, r?.phases ?? { lexer: 'waiting', parser: 'waiting', semantic: 'waiting', irgen: 'waiting' });
  renderSymbols(container.symbols, r?.symbol_table ?? [], 'name', true, () => {});
}

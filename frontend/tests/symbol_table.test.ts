/** T052 / FR-038 — sortable symbol table rendering + value semantics. */
import { describe, it, expect, vi } from 'vitest';
import { renderSymbols } from '../src/components/panels/render';
import type { Symbol } from '../src/types/contract';

const symbols: Symbol[] = [
  { name: 'zeta', type: 'int', scope: 'global', value: null, line: 5 },
  { name: 'alpha', type: 'float', scope: 'global', value: '2.5', line: 2 },
];

describe('symbol table (T052 / FR-038)', () => {
  it('renders all 5 columns with null value as placeholder', () => {
    const el = document.createElement('div');
    renderSymbols(el, symbols, 'name', true, () => {});
    expect(el.innerHTML).toContain('zeta');
    expect(el.innerHTML).toContain('alpha');
    expect(el.innerHTML).toContain('—');          // null value → placeholder (FR-038)
    expect(el.innerHTML).toContain('float');
  });

  it('header click triggers a sort on that column', () => {
    const el = document.createElement('div');
    const onSort = vi.fn();
    renderSymbols(el, symbols, 'name', true, onSort);
    const th = el.querySelector('th[data-k="line"]') as HTMLElement;
    th.click();
    expect(onSort).toHaveBeenCalledWith('line');
  });
});

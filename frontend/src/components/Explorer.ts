/** File explorer listing the catalog by language (T039/T040, FR-041).
 * Clicking loads the sample and flips the language selector (.c→c, .py→python). */
import { SAMPLES } from '../samples/catalog';
import { useStore } from '../state/store';
import { esc } from './panels/render';

export function renderExplorer(el: HTMLElement, onSelect: () => void): void {
  const st = useStore.getState();
  el.innerHTML = '<div class="explorer-header">Explorer</div>';
  for (const s of SAMPLES) {
    const div = document.createElement('div');
    div.className = 'explorer-file' + (s.name === st.currentFile ? ' active' : '');
    div.innerHTML = `<span class="lang">${s.language === 'c' ? '◉' : '🐍'}</span>${esc(s.name)}`;
    div.addEventListener('click', () => {
      useStore.getState().setCurrentFile(s.name);
      useStore.getState().setEditorCode(s.code);
      useStore.getState().setLanguage(s.language);
      useStore.getState().setResult(null);
      onSelect();
    });
    el.appendChild(div);
  }
}

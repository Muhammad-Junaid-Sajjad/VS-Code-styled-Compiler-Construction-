/** VS Code-style IDE shell + wiring (T033–T038, FR-030…FR-044). */
import { useStore } from './state/store';
import { SAMPLES } from './samples/catalog';
import { compile, httpMessage } from './api/client';
import { createEditor } from './components/Editor';
import { renderExplorer } from './components/Explorer';
import { renderResult, emptyState } from './components/panels/render';
import type { Language, Phases } from './types/contract';

export function mountApp(root: HTMLElement): void {
  const initial = useStore.getState();
  const first = SAMPLES[0];
  initial.setEditorCode(first.code);
  initial.setCurrentFile(first.name);
  initial.setLanguage(first.language);

  root.innerHTML = `
  <div id="titlebar"><div id="app-title"><b>CompileViz</b> IDE — C / Python Compiler Visualizer</div></div>
  <div id="body">
    <div id="activity-bar">
      <div class="act-btn active" title="Explorer">📁</div>
      <div class="act-btn" id="act-run" title="Run">▶</div>
    </div>
    <div id="explorer"></div>
    <div id="center">
      <div id="editor-tabs"><div class="editor-tab active" id="tab-label">${first.name}</div></div>
      <div id="editor-area"></div>
      <button id="run-btn">▶ Run</button>
      <div id="bottom-panel">
        <div id="bottom-tabs">
          <div class="btab active" data-b="tokens">TOKENS</div>
          <div class="btab" data-b="ir">IR CODE</div>
          <div class="btab" data-b="diagnostics">DIAGNOSTICS</div>
        </div>
        <div id="bottom-content">
          <div class="bpanel active" id="bp-tokens"></div>
          <div class="bpanel" id="bp-ir"></div>
          <div class="bpanel" id="bp-diagnostics"></div>
        </div>
      </div>
    </div>
    <div id="right-panel">
      <div id="right-tabs">
        <div class="rtab active" data-r="phaseFlow">Phases</div>
        <div class="rtab" data-r="parseTree">Tree</div>
        <div class="rtab" data-r="symbolTable">Symbols</div>
      </div>
      <div id="right-content">
        <div class="rpanel active" id="rp-phaseFlow"></div>
        <div class="rpanel" id="rp-parseTree"></div>
        <div class="rpanel" id="rp-symbolTable"></div>
      </div>
    </div>
  </div>
  <div id="statusbar">
    <div class="sb-item" id="sb-status">● Ready</div>
    <div class="sb-item sb-right" id="sb-lang">C Language</div>
  </div>
  <div id="toast"></div>`;

  const containers = {
    tokens:  root.querySelector('#bp-tokens') as HTMLElement,
    ir:      root.querySelector('#bp-ir') as HTMLElement,
    diag:    root.querySelector('#bp-diagnostics') as HTMLElement,
    tree:    root.querySelector('#rp-parseTree') as HTMLElement,
    phases:  root.querySelector('#rp-phaseFlow') as HTMLElement,
    symbols: root.querySelector('#rp-symbolTable') as HTMLElement,
  };

  // Empty states before any run (FR-042)
  emptyState(containers.tokens, '🔤', 'No tokens yet', 'Click ▶ Run to tokenize your code.');
  emptyState(containers.ir, '⚙️', 'No IR yet', 'IR appears after compilation.');
  emptyState(containers.diag, '✅', 'No diagnostics', 'Errors and warnings appear here.');
  emptyState(containers.tree, '🌳', 'No parse tree yet', 'Run the compiler to visualize the tree.');
  emptyState(containers.symbols, '📋', 'No symbols yet', 'Symbol table populates after compilation.');

  const toastEl = root.querySelector('#toast') as HTMLElement;
  let toastTimer: number | undefined;
  function toast(level: 'info' | 'success' | 'error', text: string) {
    toastEl.textContent = text;
    toastEl.className = 'show ' + level;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toastEl.className = ''; }, 2600);
  }

  const editorArea = root.querySelector('#editor-area') as HTMLElement;

  async function run() {
    const s = useStore.getState();
    if (s.running) return;
    s.setRunning(true);
    const runBtn = root.querySelector('#run-btn') as HTMLElement;
    runBtn.classList.add('running');
    runBtn.textContent = 'Running…';
    (root.querySelector('#sb-status') as HTMLElement).textContent = '⚙ Compiling…';

    const phases: Phases = { lexer: 'waiting', parser: 'waiting', semantic: 'waiting', irgen: 'waiting' };
    s.setPhases(phases);
    s.setResult(null);

    try {
      phases.lexer = 'running';
      s.setPhases({ ...phases });
      const result = await compile(s.editorCode, s.language);
      if (!result.ok || !result.data) {
        phases.lexer = 'error';
        s.setPhases({ ...phases });
        emptyState(containers.tokens, '❌', 'Compile failed', httpMessage(result.httpStatus));
        (root.querySelector('#sb-status') as HTMLElement).textContent = '✗ Failed';
        toast('error', httpMessage(result.httpStatus));
        return;
      }
      phases.lexer = 'done'; phases.parser = 'done'; phases.semantic = 'done'; phases.irgen = 'done';
      s.setPhases({ ...phases });
      s.setResult(result.data);
      renderResult(containers, result.data);
      (root.querySelector('#sb-status') as HTMLElement).textContent = '✓ Compiled';
      toast(result.data.success ? 'success' : 'error',
        result.data.success ? '✓ Compilation successful' : '✗ Compilation completed with errors');
    } catch (err) {
      phases.lexer = 'error';
      s.setPhases({ ...phases });
      toast('error', err instanceof Error ? err.message : String(err));
    } finally {
      s.setRunning(false);
      (root.querySelector('#run-btn') as HTMLElement).classList.remove('running');
      (root.querySelector('#run-btn') as HTMLElement).textContent = '▶ Run';
    }
  }

  const editor = createEditor(editorArea, run, (code) => useStore.getState().setEditorCode(code));
  editor.setValue(useStore.getState().editorCode);
  editor.setLanguage(useStore.getState().language);

  // Explorer (T039/T040)
  const explorerEl = root.querySelector('#explorer') as HTMLElement;
  renderExplorer(explorerEl, () => {
    const s = useStore.getState();
    (root.querySelector('#tab-label') as HTMLElement).textContent = s.currentFile ?? 'untitled';
    editor.setLanguage(s.language);
    editor.setValue(s.editorCode);
    (root.querySelector('#sb-lang') as HTMLElement).textContent =
      s.language === 'c' ? 'C Language' : 'Python Language';
    renderExplorer(explorerEl, () => {});
  });

  // Tab switching
  root.querySelectorAll('.btab').forEach((el) => {
    el.addEventListener('click', () => {
      root.querySelectorAll('.btab').forEach((b) => b.classList.remove('active'));
      root.querySelectorAll('.bpanel').forEach((p) => p.classList.remove('active'));
      el.classList.add('active');
      (root.querySelector(`#bp-${el.getAttribute('data-b')}`) as HTMLElement).classList.add('active');
    });
  });
  root.querySelectorAll('.rtab').forEach((el) => {
    el.addEventListener('click', () => {
      root.querySelectorAll('.rtab').forEach((b) => b.classList.remove('active'));
      root.querySelectorAll('.rpanel').forEach((p) => p.classList.remove('active'));
      el.classList.add('active');
      (root.querySelector(`#rp-${el.getAttribute('data-r')}`) as HTMLElement).classList.add('active');
    });
  });

  // Run controls
  (root.querySelector('#run-btn') as HTMLElement).addEventListener('click', run);
  (root.querySelector('#act-run') as HTMLElement).addEventListener('click', run);

  // Language selector (FR-031)
  const sbLang = root.querySelector('#sb-lang') as HTMLElement;
  sbLang.addEventListener('click', () => {
    const s = useStore.getState();
    const next: Language = s.language === 'c' ? 'python' : 'c';
    s.setLanguage(next);
    editor.setLanguage(next);
    sbLang.textContent = next === 'c' ? 'C Language' : 'Python Language';
  });

  window.setTimeout(() => toast('info', 'CompileViz ready — press ▶ Run or Ctrl+Enter'), 300);
}

/** VS Code-grade interactive terminal shell (Zed-like polish).
 *  Real typed commands: help, run, run <sample>, compile, samples, lang,
 *  theme, clear. Execute results accumulate with ANSI-style coloring.
 */
import { run as runCode } from '../api/client';
import { SAMPLES } from '../samples/catalog';
import { useStore, type TerminalEntry } from '../state/store';

const esc = (s: unknown): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** VS Code-style coloring of raw output: gcc error / warning / normal. */
function colorize(out: string): string {
  return esc(out).split('\n').map((ln) => {
    const t = ln.trim();
    if (/error:/i.test(t)) return `<span class="term-err">${ln}</span>`;
    if (/warning:/i.test(t)) return `<span class="term-warn">${ln}</span>`;
    if (/^fatal/i.test(t)) return `<span class="term-err">${ln}</span>`;
    return ln;
  }).join('\n');
}

export interface TerminalHandle {
  focus: () => void;
  clear: () => void;
  runCurrent: () => void;
}

export function mountTerminal(host: HTMLElement, hooks: { onCompile: () => void }): TerminalHandle {
  host.innerHTML = `
    <div class="term-titlebar">
      <div class="term-tabs">
        <div class="term-tab active" title="compileviz shell">
          <span class="term-tab-icon">▦</span>
          <span class="term-tab-label">1: compileviz</span>
          <span class="term-tab-close" title="Close terminal">×</span>
        </div>
        <span class="term-tab-chevron" title="Terminal selector">⌄</span>
        <span class="term-tab-new" title="New terminal">+</span>
      </div>
      <div class="term-actions">
        <span class="term-act" data-act="split" title="Split terminal">⧉</span>
        <span class="term-act" data-act="trash" title="Kill terminal &amp; clear">🗑</span>
        <span class="term-act" data-act="clear" title="Clear output">⌫</span>
        <span class="term-act" data-act="max" title="Maximize panel">▢</span>
      </div>
    </div>
    <div class="term-body" id="term-out"></div>
    <div class="term-input-line">
      <span class="term-ps1">❯</span>
      <span class="term-input" contenteditable="true" spellcheck="false"></span>
      <span class="term-cursor"></span>
    </div>`;

  const out = host.querySelector('#term-out') as HTMLElement;
  const input = host.querySelector('.term-input') as HTMLElement;

  const now = () => new Date().toLocaleTimeString();

  function render() {
    const entries = useStore.getState().terminal;
    if (!entries.length) {
      out.innerHTML = `<div class="term-block"><div class="term-cmd"><span class="term-ps1">❯</span> <span class="term-cmd-text">compileviz-shell</span> — type <span class="term-cmd-text">help</span></div></div>`;
    } else {
      out.innerHTML = entries.map((e) => `
        <div class="term-block">
          <div class="term-cmd"><span class="term-ps1">❯</span> <span class="term-cmd-text">${esc(e.command || '(no command)')}</span> <span class="term-time">${esc(e.time)}</span></div>
          ${e.output ? `<pre class="term-out">${colorize(e.output)}</pre>` : ''}
          <div class="term-exit ${e.exitCode === 0 ? 'ok' : 'err'}">exit code: ${e.exitCode}</div>
        </div>`).join('');
    }
    out.scrollTop = out.scrollHeight;
  }

  function append(cmd: string, output: string, exitCode: number) {
    useStore.getState().appendTerminal({ command: cmd, output, exitCode, time: now() });
    render();
  }

  async function dispatch(raw: string) {
    const parts = raw.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const arg = parts.slice(1).join(' ');
    const s = useStore.getState();

    switch (cmd) {
      case '':
        return;
      case 'help':
        append('help', 'compileviz shell — commands:\n  run            compile & run the current code\n  run <sample>   load & run a sample (e.g. run hello.py)\n  samples        list all samples\n  compile        run the 4-phase compiler\n  lang <c|py>    switch language\n  theme          toggle light/dark\n  clear | cls    clear this terminal', 0);
        break;
      case 'samples':
        append('samples', SAMPLES.map((x) => `  ${x.name.padEnd(16)} (${x.language})`).join('\n'), 0);
        break;
      case 'run': {
        if (arg) {
          const sample = SAMPLES.find((x) => x.name === arg);
          if (!sample) { append(`run ${arg}`, `no sample named '${arg}'`, 1); break; }
          s.setEditorCode(sample.code);
          s.setLanguage(sample.language);
          s.setCurrentFile(sample.name);
          append(`run ${arg}`, `loaded ${sample.name}`, 0);
        }
        const code = s.editorCode;
        try {
          const r = await runCode(code, s.language);
          append(r.command || 'run', r.output, r.exit_code);
          s.showToast(r.success ? 'success' : 'error', `exit code ${r.exit_code}`);
        } catch (err) {
          append('run', `error: ${err instanceof Error ? err.message : String(err)}`, -1);
        }
        break;
      }
      case 'compile':
        append('compile', 'running 4-phase compiler…', 0);
        hooks.onCompile();
        break;
      case 'lang': {
        const l = arg.toLowerCase().startsWith('py') ? 'python' : 'c';
        s.setLanguage(l);
        append(`lang ${l}`, `language → ${l}`, 0);
        break;
      }
      case 'theme': {
        const root = document.getElementById('app');
        const next = root?.dataset.theme === 'light' ? 'dark' : 'light';
        if (root) { root.dataset.theme = next; localStorage.setItem('compileviz-theme', next); }
        append('theme', `theme → ${next}`, 0);
        break;
      }
      case 'clear':
      case 'cls':
        s.clearTerminal();
        render();
        break;
      default:
        append(cmd, `command not found: ${cmd} — type 'help'`, 1);
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input.textContent ?? '';
      input.textContent = '';
      void dispatch(cmd);
    }
    if (e.key === 'Tab') { e.preventDefault(); }
  });
  input.addEventListener('focus', () => host.querySelector('.term-input-line')?.classList.add('focused'));
  input.addEventListener('blur', () => host.querySelector('.term-input-line')?.classList.remove('focused'));

  // Tab strip + actions
  host.querySelector('.term-tab-close')?.addEventListener('click', () => {
    useStore.getState().clearTerminal();
    render();
  });
  host.querySelector('.term-tab-new')?.addEventListener('click', () => {
    useStore.getState().clearTerminal();
    render();
  });
  host.querySelector('[data-act="clear"]')?.addEventListener('click', () => {
    useStore.getState().clearTerminal();
    render();
  });
  host.querySelector('[data-act="trash"]')?.addEventListener('click', () => {
    useStore.getState().clearTerminal();
    render();
  });
  host.querySelector('[data-act="max"]')?.addEventListener('click', () => {
    host.closest('#bottom-panel')?.classList.toggle('maximized');
  });
  host.querySelector('[data-act="split"]')?.addEventListener('click', () => {
    append('split', 'split terminals: coming soon', 0);
  });
  host.querySelector('.term-input-line')?.addEventListener('click', () => input.focus());

  render();

  return {
    focus: () => input.focus(),
    clear: () => { useStore.getState().clearTerminal(); render(); },
    runCurrent: () => { void dispatch('run'); },
  };
}

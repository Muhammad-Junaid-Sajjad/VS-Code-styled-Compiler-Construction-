/** CodeMirror 6 editor wrapper (T034, FR-032) with C/Python modes, line
 * numbers, bracket matching/autoclose, and Ctrl+Enter run binding (FR-033). */
import { Compartment, EditorState, Prec } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { keymap } from '@codemirror/view';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { closeBrackets } from '@codemirror/autocomplete';
import type { Language } from '../types/contract';
import { completionSource } from './Completion';

export interface EditorHandle {
  view: EditorView;
  setLanguage: (l: Language) => void;
  setValue: (code: string) => void;
  getValue: () => string;
}

export function createEditor(
  host: HTMLElement,
  onRun: () => void,
  onUpdate: (code: string) => void,
): EditorHandle {
  const lang = new Compartment();
  const ctrlEnter = Prec.highest(keymap.of([
    { key: 'Ctrl-Enter', run: () => { onRun(); return true; } },
    { key: 'Cmd-Enter', run: () => { onRun(); return true; } },
  ]));

  const view = new EditorView({
    parent: host,
    state: EditorState.create({
      doc: '',
      extensions: [
        basicSetup,
        lang.of(cpp()),
        closeBrackets(),
        ctrlEnter,
        completionSource(),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onUpdate(u.state.doc.toString());
        }),
      ],
    }),
  });

  return {
    view,
    setLanguage: (l) => view.dispatch({ effects: lang.reconfigure(l === 'python' ? python() : cpp()) }),
    setValue: (code) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } }),
    getValue: () => view.state.doc.toString(),
  };
}

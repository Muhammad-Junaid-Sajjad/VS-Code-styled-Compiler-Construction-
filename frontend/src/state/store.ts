/** Typed frontend state (T036, plan §4.3) — single source of truth for the IDE.
 * Vanilla store (no React): the shell uses getState/setState imperatively. */
import { createStore } from 'zustand/vanilla';
import type { CompileResponse, Language, Phases } from '../types/contract';

export type BottomTab = 'tokens' | 'ir' | 'diagnostics' | 'terminal';
export type RightTab = 'phaseFlow' | 'parseTree' | 'symbolTable';

export interface Toast {
  level: 'info' | 'success' | 'error';
  text: string;
}

export interface TerminalEntry {
  command: string;
  output: string;
  exitCode: number;
  time: string;
}

interface CompileVizState {
  language: Language;
  editorCode: string;
  currentFile: string | null;
  activeBottomTab: BottomTab;
  activeRightTab: RightTab;
  result: CompileResponse | null;
  phases: Phases;
  running: boolean;
  toast: Toast | null;
  terminal: TerminalEntry[];
  appendTerminal: (e: TerminalEntry) => void;
  clearTerminal: () => void;
  setLanguage: (l: Language) => void;
  setEditorCode: (c: string) => void;
  setCurrentFile: (f: string | null) => void;
  setActiveBottomTab: (t: BottomTab) => void;
  setActiveRightTab: (t: RightTab) => void;
  setResult: (r: CompileResponse | null) => void;
  setPhases: (p: Phases) => void;
  setRunning: (b: boolean) => void;
  showToast: (level: Toast['level'], text: string) => void;
  clearToast: () => void;
}

const IDLE_PHASES: Phases = { lexer: 'waiting', parser: 'waiting', semantic: 'waiting', irgen: 'waiting' };

export const useStore = createStore<CompileVizState>((set) => ({
  language: 'c',
  editorCode: '',
  currentFile: null,
  activeBottomTab: 'tokens',
  activeRightTab: 'phaseFlow',
  result: null,
  phases: IDLE_PHASES,
  running: false,
  toast: null,
  terminal: [],
  appendTerminal: (e) => set((s) => ({ terminal: [...s.terminal.slice(-99), e] })),
  clearTerminal: () => set({ terminal: [] }),
  setLanguage: (l) => set({ language: l }),
  setEditorCode: (c) => set({ editorCode: c }),
  setCurrentFile: (f) => set({ currentFile: f }),
  setActiveBottomTab: (t) => set({ activeBottomTab: t }),
  setActiveRightTab: (t) => set({ activeRightTab: t }),
  setResult: (r) => set({ result: r }),
  setPhases: (p) => set({ phases: p }),
  setRunning: (b) => set({ running: b }),
  showToast: (level, text) => set({ toast: { level, text } }),
  clearToast: () => set({ toast: null }),
}));

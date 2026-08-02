/** Canonical compile-response types — mirror of backend/contract.py (FR-015/FR-016). */
export type Language = 'c' | 'python';
export type PhaseState = 'waiting' | 'running' | 'done' | 'error';

export interface Token {
  token: string;
  class: string;   // KEYWORD/IDENTIFIER/NUMBER/STRING/OPERATOR/PUNCTUATION/TYPE/ERROR
  line: number;
  col: number;
}

export interface Symbol {
  name: string;
  type: string;
  scope: string;
  value: string | null;   // const initializer or null (FR-038)
  line: number;
}

export interface Diagnostic {
  level: 'error' | 'warning';
  message: string;
  line: number;
  col: number;
}

export interface Instruction {
  op: string;
  arg1?: string | null;
  arg2?: string | null;
  result?: string | null;
  label?: string | null;
  line: number;
}

export interface Phases {
  lexer: PhaseState;
  parser: PhaseState;
  semantic: PhaseState;
  irgen: PhaseState;
}

export interface TreeNode {
  label: string;
  cls: string;
  children: TreeNode[];
}

export interface CompileResponse {
  success: boolean;
  language: Language;
  tokens: Token[];
  parse_tree: TreeNode | null;
  symbol_table: Symbol[];
  ir_code: Instruction[];
  errors: Diagnostic[];
  warnings: Diagnostic[];
  phases: Phases;
  raw_output: string;
}

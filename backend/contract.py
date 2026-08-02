"""Canonical compile-response schema + types (T008/T009, plan §5, FR-015/FR-016).

Single source of truth for the response shape shared by the C and Python
pipelines. Field order and names match spec §6 / plan §5 exactly.
"""
from dataclasses import dataclass, field
from typing import Optional

LANGUAGES = ("c", "python")

PHASE_KEYS = ("lexer", "parser", "semantic", "irgen")
PHASE_STATES = ("waiting", "running", "done", "error")


@dataclass
class Token:
    token: str
    class_: str = "IDENTIFIER"   # KEYWORD/IDENTIFIER/NUMBER/STRING/OPERATOR/PUNCTUATION/TYPE/ERROR
    line: int = 1
    col: int = 0

    def to_dict(self):
        return {"token": self.token, "class": self.class_, "line": self.line, "col": self.col}


@dataclass
class Symbol:
    name: str
    type: str = "unknown"
    scope: str = "global"
    value: Optional[str] = None      # compile-time const initializer or None (FR-038)
    line: int = 0

    def to_dict(self):
        return {"name": self.name, "type": self.type, "scope": self.scope,
                "value": self.value, "line": self.line}


@dataclass
class Diagnostic:
    level: str = "error"             # error | warning
    message: str = ""
    line: int = 0
    col: int = 0

    def to_dict(self):
        return {"level": self.level, "message": self.message, "line": self.line, "col": self.col}


@dataclass
class Instruction:
    op: str = "raw"
    arg1: Optional[str] = None
    arg2: Optional[str] = None
    result: Optional[str] = None
    label: Optional[str] = None
    line: int = 0

    def to_dict(self):
        return {"op": self.op, "arg1": self.arg1, "arg2": self.arg2,
                "result": self.result, "label": self.label, "line": self.line}


@dataclass
class Phases:
    lexer: str = "waiting"
    parser: str = "waiting"
    semantic: str = "waiting"
    irgen: str = "waiting"

    def to_dict(self):
        return {"lexer": self.lexer, "parser": self.parser,
                "semantic": self.semantic, "irgen": self.irgen}


@dataclass
class CompileResponse:
    success: bool
    language: str
    tokens: list = field(default_factory=list)
    parse_tree: Optional[dict] = None
    symbol_table: list = field(default_factory=list)
    ir_code: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    phases: Phases = field(default_factory=Phases)
    raw_output: str = ""

    def to_dict(self):
        return {
            "success": self.success,
            "language": self.language,
            "tokens": self.tokens,
            "parse_tree": self.parse_tree,
            "symbol_table": self.symbol_table,
            "ir_code": self.ir_code,
            "errors": self.errors,
            "warnings": self.warnings,
            "phases": self.phases.to_dict() if isinstance(self.phases, Phases) else self.phases,
            "raw_output": self.raw_output,
        }

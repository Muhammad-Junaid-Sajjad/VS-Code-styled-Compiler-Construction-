"""Python pipeline (T022–T029, FR-007…FR-012) using stdlib `tokenize` + `ast`.

Produces the SAME canonical CompileResponse schema as the C pipeline (FR-012),
so the frontend renders both languages identically.
"""
import ast
import io
import tokenize

PY_KEYWORDS = {
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
    'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
    'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
    'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
}
PY_BUILTINS = {'print', 'len', 'int', 'float', 'str', 'input', 'range', 'list', 'dict', 'set', 'tuple'}


def analyze_python(source: str) -> dict:
    """Entry point — returns the unified CompileResponse dict for Python source."""
    tokens = _tokenize(source)
    errors, warnings = [], []
    tree = None
    symbol_table = []
    ir_code = []

    try:
        module = ast.parse(source)
        tree = _ast_to_tree(module)
        symbol_table = _build_symbols(module)
        ir_code = _build_ir(module)
    except SyntaxError as e:
        errors.append({'level': 'error', 'message': f"SyntaxError: {e.msg}",
                       'line': e.lineno or 0, 'col': max((e.offset or 1) - 1, 0)})
    except Exception as e:  # pragma: no cover — defensive
        errors.append({'level': 'error', 'message': str(e), 'line': 0, 'col': 0})

    if not errors:
        errors, warnings = _static_issues(module, errors, warnings)

    success = not errors
    return {
        'success': success,
        'language': 'python',
        'tokens': tokens,
        'parse_tree': tree,
        'symbol_table': symbol_table,
        'ir_code': ir_code,
        'errors': errors,
        'warnings': warnings,
        'phases': {
            'lexer': 'done', 'parser': 'done' if tree else 'error',
            'semantic': 'done' if success else 'error', 'irgen': 'done' if ir_code else ('error' if errors else 'done'),
        },
        'raw_output': source,
    }


# ── Tokens (T023 / FR-007) ───────────────────────────────────────────────────
def _tokenize(source: str) -> list:
    toks = []
    try:
        for t in tokenize.generate_tokens(io.StringIO(source).readline):
            if t.type == tokenize.ENDMARKER:
                continue
            toks.append({'token': t.string, 'class': _token_class(t),
                         'line': t.start[0], 'col': t.start[1]})
    except (tokenize.TokenError, IndentationError):
        pass  # tokenizer-level errors surface via ast.parse as SyntaxError
    return toks


def _token_class(t):
    if t.type == tokenize.NAME:
        if t.string in PY_KEYWORDS:
            return 'KEYWORD'
        if t.string in PY_BUILTINS:
            return 'BUILTIN'
        return 'IDENTIFIER'
    if t.type == tokenize.NUMBER:
        return 'NUMBER'
    if t.type == tokenize.STRING:
        return 'STRING'
    if t.type == tokenize.OP:
        return 'OPERATOR'
    if t.type == tokenize.INDENT:
        return 'INDENT'
    if t.type == tokenize.DEDENT:
        return 'DEDENT'
    if t.type == tokenize.NEWLINE:
        return 'NEWLINE'
    if t.type == tokenize.COMMENT:
        return 'COMMENT'
    return 'OTHER'


# ── AST tree (T023 / FR-008) ─────────────────────────────────────────────────
_AST_CLASS = {
    'Module': 'tl-prog', 'FunctionDef': 'tl-func', 'ClassDef': 'tl-func',
    'Assign': 'tl-stmt', 'AugAssign': 'tl-stmt', 'AnnAssign': 'tl-stmt',
    'If': 'tl-stmt', 'While': 'tl-stmt', 'For': 'tl-stmt', 'Return': 'tl-stmt',
    'Expr': 'tl-stmt', 'Import': 'tl-stmt', 'ImportFrom': 'tl-stmt',
    'BinOp': 'tl-expr', 'BoolOp': 'tl-expr', 'Compare': 'tl-expr',
    'UnaryOp': 'tl-expr', 'Call': 'tl-expr', 'Name': 'tl-leaf',
    'Constant': 'tl-leaf', 'Num': 'tl-leaf', 'Str': 'tl-leaf', 'Subscript': 'tl-expr',
}


def _ast_to_tree(node: ast.AST) -> dict:
    children = []
    for field in node._fields:
        value = getattr(node, field, None)
        if isinstance(value, ast.AST):
            children.append(_ast_to_tree(value))
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, ast.AST):
                    children.append(_ast_to_tree(item))
    return {
        'label': type(node).__name__,
        'cls': _AST_CLASS.get(type(node).__name__, 'tl-leaf'),
        'children': children,
    }


# ── Symbol table (T024 / FR-009) ─────────────────────────────────────────────
def _build_symbols(module: ast.Module) -> list:
    symbols = []
    for node in ast.walk(module):
        if isinstance(node, ast.FunctionDef):
            symbols.append({'name': node.name, 'type': 'function', 'scope': 'global',
                            'value': None, 'line': node.lineno})
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    symbols.append({'name': target.id, 'type': _type_of(node.value),
                                    'scope': 'global', 'value': _const_value(node.value),
                                    'line': target.lineno})
    return symbols


def _type_of(node: ast.AST) -> str:
    if isinstance(node, ast.Constant):
        v = node.value
        if isinstance(v, bool):
            return 'bool'
        if isinstance(v, int):
            return 'int'
        if isinstance(v, float):
            return 'float'
        if isinstance(v, str):
            return 'str'
    return 'unknown'


def _const_value(node: ast.AST):
    return str(node.value) if isinstance(node, ast.Constant) else None


# ── IR (T025 / FR-010) ───────────────────────────────────────────────────────
def _build_ir(module: ast.Module) -> list:
    lines = []
    for stmt in module.body:
        _ir_stmt(stmt, lines, 0)
    return lines


def _ir_stmt(node: ast.AST, lines: list, indent: int):
    pad = '  ' * indent
    if isinstance(node, ast.Assign):
        lhs = ', '.join(_ir_name(t) for t in node.targets)
        lines.append(f'{pad}{lhs} = {_ir_expr(node.value)}')
    elif isinstance(node, ast.FunctionDef):
        args = ', '.join(a.arg for a in node.args.args)
        lines.append(f'{pad}def {node.name}({args})')
        for s in node.body:
            _ir_stmt(s, lines, indent + 1)
        lines.append(f'{pad}end {node.name}')
    elif isinstance(node, ast.Return):
        lines.append(f'{pad}return {_ir_expr(node.value)}' if node.value else f'{pad}return')
    elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
        lines.append(f'{pad}call {_ir_expr(node.value)}')
    elif isinstance(node, ast.If):
        lines.append(f'{pad}if {_ir_expr(node.test)}:')
        for s in node.body:
            _ir_stmt(s, lines, indent + 1)
        if node.orelse:
            lines.append(f'{pad}else:')
            for s in node.orelse:
                _ir_stmt(s, lines, indent + 1)
        lines.append(f'{pad}end if')
    elif isinstance(node, ast.While):
        lines.append(f'{pad}while {_ir_expr(node.test)}:')
        for s in node.body:
            _ir_stmt(s, lines, indent + 1)
        lines.append(f'{pad}end while')
    elif isinstance(node, ast.For):
        lines.append(f'{pad}for {_ir_name(node.target)} in {_ir_expr(node.iter)}:')
        for s in node.body:
            _ir_stmt(s, lines, indent + 1)
        lines.append(f'{pad}end for')


def _ir_expr(node: ast.AST) -> str:
    if node is None:
        return ''
    if isinstance(node, ast.Constant):
        return repr(node.value)
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.BinOp):
        return f'{_ir_expr(node.left)} {_ir_op(node.op)} {_ir_expr(node.right)}'
    if isinstance(node, ast.Compare):
        ops = [_ir_op(o) for o in node.ops]
        parts = [_ir_expr(node.left)]
        parts += [f' {o} {_ir_expr(c)}' for o, c in zip(ops, node.comparators)]
        return ''.join(parts)
    if isinstance(node, ast.Call):
        return f'{_ir_expr(node.func)}({", ".join(_ir_expr(a) for a in node.args)})'
    if isinstance(node, ast.Attribute):
        return f'{_ir_expr(node.value)}.{node.attr}'
    return '?'


def _ir_op(op: ast.operator) -> str:
    return {
        'Add': '+', 'Sub': '-', 'Mult': '*', 'Div': '/', 'Mod': '%',
        'Eq': '==', 'NotEq': '!=', 'Lt': '<', 'LtE': '<=', 'Gt': '>', 'GtE': '>=',
        'And': 'and', 'Or': 'or',
    }.get(type(op).__name__, '?')


def _ir_name(node: ast.AST) -> str:
    return node.id if isinstance(node, ast.Name) else '?'


# ── Static issues (T026 / FR-011) ────────────────────────────────────────────
def _static_issues(module: ast.Module, errors: list, warnings: list):
    defined = set()
    for node in ast.walk(module):
        if isinstance(node, ast.FunctionDef):
            defined.add(node.name)
            for a in node.args.args:
                defined.add(a.arg)
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    defined.add(t.id)
    for node in ast.walk(module):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            if node.id not in defined and node.id not in PY_BUILTINS:
                warnings.append({'level': 'warning',
                                 'message': f'Name "{node.id}" may be undefined',
                                 'line': node.lineno, 'col': node.col_offset})
    return errors, warnings

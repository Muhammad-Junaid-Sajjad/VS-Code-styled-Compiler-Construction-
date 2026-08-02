import re

# ─────────────────────────────────────────────────────────────────────────────
#  tree_builder.py
#
#  Converts the raw text parse-tree output from the compiler binary into a
#  nested JSON structure that the frontend can render as a visual tree.
#
#  Handles three common text-tree formats:
#
#  FORMAT A — Indented text (most common):
#      Program
#        FunctionDef: main
#          ReturnType: int
#          CompoundStmt
#            VarDecl: x
#
#  FORMAT B — Box-drawing characters:
#      Program
#      ├── FunctionDef: main
#      │   ├── ReturnType: int
#      │   └── CompoundStmt
#      │       └── VarDecl: x
#
#  FORMAT C — Parenthesised / LISP-style:
#      (Program (FunctionDef main (ReturnType int) (CompoundStmt (VarDecl x))))
#
#  If the compiler produces no parse tree output, a synthetic tree is built
#  directly from the token list so the UI always has something to show.
# ─────────────────────────────────────────────────────────────────────────────

# ── Node CSS class mapping (matched against node label) ──────────────────────
_CLASS_MAP = [
    (re.compile(r'\b(program|translation_unit|root)\b',       re.I), 'tl-prog'),
    (re.compile(r'\b(function|func|proc|method|subroutine)\b',re.I), 'tl-func'),
    (re.compile(r'\b(declaration|decl|var_decl|param)\b',     re.I), 'tl-decl'),
    (re.compile(r'\b(stmt|statement|compound|block|body)\b',  re.I), 'tl-stmt'),
    (re.compile(r'\b(expr|expression|binary|unary|call)\b',   re.I), 'tl-expr'),
    (re.compile(r'\b(type|datatype|return_type)\b',           re.I), 'tl-type'),
    (re.compile(r'\b(op|operator|assign|arith|relop)\b',      re.I), 'tl-op'),
    (re.compile(r'\b(if|else|while|for|do|switch|return|'
                r'break|continue|goto)\b',                    re.I), 'tl-stmt'),
    (re.compile(r'\b(literal|number|string|char|int|float|'
                r'identifier|id|name|value)\b',               re.I), 'tl-leaf'),
]

def _css_class(label: str) -> str:
    for pattern, cls in _CLASS_MAP:
        if pattern.search(label):
            return cls
    return 'tl-leaf'


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def build_tree(raw_text: str, tokens: list = None) -> dict:
    """
    Main entry point.
    Returns a nested dict:
    {
        "label"    : "Program",
        "cls"      : "tl-prog",
        "children" : [ { "label":..., "cls":..., "children":[...] }, ... ]
    }
    """
    text = raw_text.strip() if raw_text else ''

    # Try each format in order
    if text:
        tree = _try_box_drawing(text)
        if tree:
            return tree

        tree = _try_lisp(text)
        if tree:
            return tree

        tree = _try_indented(text)
        if tree:
            return tree

    # Nothing worked → build synthetic tree from tokens
    if tokens:
        return _synthetic_tree(tokens)

    # Absolute fallback
    return _node('Program', [_node('(empty — run compiler to see tree)')])


# ─────────────────────────────────────────────────────────────────────────────
#  FORMAT A — INDENTED TEXT
# ─────────────────────────────────────────────────────────────────────────────

def _try_indented(text: str) -> dict | None:
    lines = [l.rstrip() for l in text.splitlines() if l.strip()]
    if not lines:
        return None

    # Detect indent unit from first indented line
    indent_unit = 0
    for line in lines[1:]:
        leading = len(line) - len(line.lstrip())
        if leading > 0:
            indent_unit = leading
            break
    if indent_unit == 0:
        indent_unit = 2

    # Build stack-based tree
    root = None
    stack = []   # list of (indent_level, node)

    for line in lines:
        stripped = line.lstrip()
        if not stripped:
            continue
        leading  = len(line) - len(stripped)
        level    = leading // indent_unit
        node     = _node(stripped)

        if not stack:
            root = node
            stack.append((level, node))
        else:
            # Pop back to parent level
            while len(stack) > 1 and stack[-1][0] >= level:
                stack.pop()
            parent = stack[-1][1]
            parent['children'].append(node)
            stack.append((level, node))

    return root


# ─────────────────────────────────────────────────────────────────────────────
#  FORMAT B — BOX-DRAWING CHARACTERS  (├── └── │)
# ─────────────────────────────────────────────────────────────────────────────

_BOX_STRIP = re.compile(r'^[│├└─\s]+')

def _try_box_drawing(text: str) -> dict | None:
    if '├' not in text and '└' not in text:
        return None

    lines = text.splitlines()
    # Calculate depth by counting │ and ├/└ characters
    parsed = []
    for line in lines:
        if not line.strip():
            continue
        depth = line.count('│') + (1 if ('├' in line or '└' in line) else 0)
        label = _BOX_STRIP.sub('', line).strip()
        if label:
            parsed.append((depth, label))

    if not parsed:
        return None

    root = _node(parsed[0][1])
    stack = [(0, root)]

    for depth, label in parsed[1:]:
        node = _node(label)
        while len(stack) > 1 and stack[-1][0] >= depth:
            stack.pop()
        stack[-1][1]['children'].append(node)
        stack.append((depth, node))

    return root


# ─────────────────────────────────────────────────────────────────────────────
#  FORMAT C — LISP / PARENTHESISED
# ─────────────────────────────────────────────────────────────────────────────

def _try_lisp(text: str) -> dict | None:
    text = text.strip()
    if not text.startswith('('):
        return None
    try:
        node, _ = _parse_lisp(text, 0)
        return node
    except Exception:
        return None


def _parse_lisp(text: str, pos: int):
    """Recursive descent parser for (Label child1 child2 ...) format."""
    while pos < len(text) and text[pos] in ' \t\n\r':
        pos += 1
    if pos >= len(text):
        return _node('?'), pos
    if text[pos] == '(':
        pos += 1  # skip (
        # Read label
        label_start = pos
        while pos < len(text) and text[pos] not in '() \t\n\r':
            pos += 1
        label = text[label_start:pos].strip()
        node  = _node(label)
        # Read children
        while pos < len(text) and text[pos] != ')':
            while pos < len(text) and text[pos] in ' \t\n\r':
                pos += 1
            if pos < len(text) and text[pos] == '(':
                child, pos = _parse_lisp(text, pos)
                node['children'].append(child)
            elif pos < len(text) and text[pos] != ')':
                # Atom
                atom_start = pos
                while pos < len(text) and text[pos] not in '() \t\n\r':
                    pos += 1
                atom = text[atom_start:pos].strip()
                if atom:
                    node['children'].append(_node(atom))
        if pos < len(text) and text[pos] == ')':
            pos += 1  # skip )
        return node, pos
    else:
        # Bare atom
        start = pos
        while pos < len(text) and text[pos] not in '() \t\n\r':
            pos += 1
        return _node(text[start:pos]), pos


# ─────────────────────────────────────────────────────────────────────────────
#  SYNTHETIC TREE  (built from token list when compiler gives no tree output)
# ─────────────────────────────────────────────────────────────────────────────

def _synthetic_tree(tokens: list) -> dict:
    """
    Builds a plausible AST-style tree directly from the token list.
    Groups tokens into a Program → Statements → Tokens hierarchy.
    """
    root = _node('Program')

    # Group tokens by line
    by_line = {}
    for tok in tokens:
        ln = tok.get('line', 0)
        by_line.setdefault(ln, []).append(tok)

    for ln in sorted(by_line.keys()):
        line_toks = by_line[ln]
        if not line_toks:
            continue

        # Decide statement type from first keyword/type token
        first = line_toks[0]
        if first['type'] in ('TYPE', 'KEYWORD') and first['value'] in (
            'int','float','double','char','void','long','short'
        ):
            stmt = _node(f"VarDecl (line {ln})", cls='tl-decl')
        elif first['value'] in ('if','else','while','for','do','switch'):
            stmt = _node(f"{first['value'].capitalize()}Stmt (line {ln})", cls='tl-stmt')
        elif first['value'] == 'return':
            stmt = _node(f"ReturnStmt (line {ln})", cls='tl-stmt')
        elif first['type'] == 'IDENTIFIER':
            next_toks = [t for t in line_toks[1:] if t['type'] == 'PUNCTUATION']
            if next_toks and next_toks[0]['value'] == '(':
                stmt = _node(f"CallExpr: {first['value']} (line {ln})", cls='tl-expr')
            else:
                stmt = _node(f"AssignStmt (line {ln})", cls='tl-stmt')
        else:
            stmt = _node(f"Statement (line {ln})", cls='tl-stmt')

        # Add each token as a leaf
        for tok in line_toks:
            label = f"{tok['type']}: {tok['value']}"
            stmt['children'].append(_node(label, cls='tl-leaf'))

        root['children'].append(stmt)

    if not root['children']:
        root['children'].append(_node('(no statements found)'))

    return root


# ─────────────────────────────────────────────────────────────────────────────
#  HELPER
# ─────────────────────────────────────────────────────────────────────────────

def _node(label: str, children: list = None, cls: str = None) -> dict:
    return {
        'label'   : label.strip(),
        'cls'     : cls or _css_class(label),
        'children': children if children is not None else [],
    }

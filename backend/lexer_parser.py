import re

# ─────────────────────────────────────────────────────────────────────────────
#  lexer_parser.py
#
#  Converts the raw stdout text from the C compiler binary into structured
#  Python dicts that Flask can return as JSON.
#
#  The AnjaneyaTripathi/c-compiler prints sections separated by headers like:
#      === TOKENS ===
#      === SYMBOL TABLE ===
#      === INTERMEDIATE CODE ===
#      === ERRORS ===
#
#  If your binary uses different headers, update SECTION_HEADERS below.
# ─────────────────────────────────────────────────────────────────────────────

# ── Section header patterns (case-insensitive) ────────────────────────────────
SECTION_HEADERS = {
    'tokens'  : re.compile(r'(token|lexeme|lex\s*output)', re.I),
    'symtable': re.compile(r'(symbol\s*table|sym\s*table)',  re.I),
    'ircode'  : re.compile(r'(intermediate|three.address|IR\s*code|TAC|quad)', re.I),
    'errors'  : re.compile(r'(error|warning|diagnostic)',   re.I),
}

# ── Known C keywords for fallback tokeniser ───────────────────────────────────
C_KEYWORDS = {
    'int','float','double','char','void','long','short','unsigned','signed',
    'if','else','while','for','do','return','break','continue','switch','case',
    'default','struct','union','enum','typedef','sizeof','const','static',
    'extern','register','volatile','auto','goto','include','define',
}
C_TYPES = {'int','float','double','char','void','long','short','unsigned','signed'}


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def parse_compiler_output(stdout: str, stderr: str, success: bool) -> dict:
    """
    Main entry point.
    Returns:
    {
        tokens       : [ {type, value, line}, ... ]
        symbol_table : [ {name, type, scope, value, line, used}, ... ]
        ir_code      : [ str, ... ]
        errors       : [ {level, message, line, col}, ... ]
        warnings     : [ {level, message, line, col}, ... ]
        phases       : { lexer, parser, semantic, irgen }   all 'done'/'error'
        raw_output   : str
    }
    """
    sections = _split_sections(stdout)

    tokens       = _parse_tokens(sections.get('tokens', ''), stdout)
    symbol_table = _parse_symtable(sections.get('symtable', ''))
    ir_code      = _parse_ircode(sections.get('ircode', ''))
    errors, warnings = _parse_errors(sections.get('errors', ''), stderr, success)

    # Determine phase status
    has_error  = len(errors) > 0
    phase_stat = 'error' if has_error else 'done'
    phases = {
        'lexer'   : phase_stat,
        'parser'  : phase_stat,
        'semantic': phase_stat,
        'irgen'   : 'done' if ir_code else ('error' if has_error else 'done'),
    }

    return {
        'tokens'      : tokens,
        'symbol_table': symbol_table,
        'ir_code'     : ir_code,
        'errors'      : errors,
        'warnings'    : warnings,
        'phases'      : phases,
        'raw_output'  : stdout,
    }


# ─────────────────────────────────────────────────────────────────────────────
#  SECTION SPLITTER
# ─────────────────────────────────────────────────────────────────────────────

def _split_sections(text: str) -> dict:
    """
    Splits compiler stdout into named sections based on header lines.
    Falls back to returning the whole text under 'tokens' if no headers found.
    """
    sections   = {}
    current    = 'tokens'
    buf        = []

    for line in text.splitlines():
        matched = False
        for name, pattern in SECTION_HEADERS.items():
            # A "header line" is short (<= 60 chars) and matches the pattern
            if len(line.strip()) <= 60 and pattern.search(line):
                sections[current] = '\n'.join(buf)
                buf     = []
                current = name
                matched = True
                break
        if not matched:
            buf.append(line)

    sections[current] = '\n'.join(buf)

    # If nothing was split at all, put everything in tokens for fallback
    if len(sections) == 1 and not sections.get('tokens', '').strip():
        sections['tokens'] = text

    return sections


# ─────────────────────────────────────────────────────────────────────────────
#  TOKEN PARSER
# ─────────────────────────────────────────────────────────────────────────────

# Pattern: optional line number, then <TYPE, value> or TYPE  value
_TOKEN_PATTERN = re.compile(
    r'(?:(\d+)\s*[:\-\|]?\s*)?'          # optional line number
    r'<?\s*([A-Z_][A-Z_0-9]*)\s*,?\s*'   # token type (ALL_CAPS)
    r'"?([^">|\n]+?)"?\s*>?'             # token value
    r'(?:\s+(?:line|ln|l)[\s:]*(\d+))?', # optional trailing line ref
    re.I
)

# Simpler pattern: TYPE\tvalue  or  TYPE  value  (two-column format)
_TOKEN_2COL = re.compile(r'^([A-Z_]{2,})\s{1,8}(.+)$')

# Map raw type strings → canonical names
_TYPE_MAP = {
    'INT_LITERAL':'NUMBER', 'FLOAT_LITERAL':'NUMBER', 'NUM':'NUMBER',
    'INTEGER':'NUMBER',     'FLOAT':'NUMBER',          'NUMBER':'NUMBER',
    'CHAR_LITERAL':'STRING','STRING_LITERAL':'STRING', 'STRING':'STRING',
    'STR':'STRING',
    'ID':'IDENTIFIER',  'IDENT':'IDENTIFIER', 'IDENTIFIER':'IDENTIFIER',
    'NAME':'IDENTIFIER',
    'KW':'KEYWORD',     'KEY':'KEYWORD',      'KEYWORD':'KEYWORD',
    'OP':'OPERATOR',    'OPER':'OPERATOR',    'OPERATOR':'OPERATOR',
    'RELOP':'OPERATOR', 'ARITH':'OPERATOR',   'ASSIGN':'OPERATOR',
    'PUNCT':'PUNCTUATION', 'PUNCTUATION':'PUNCTUATION', 'DELIM':'PUNCTUATION',
    'TYPE':'TYPE',  'DATATYPE':'TYPE',
    'ERROR':'ERROR',
}

def _canonical_type(raw: str) -> str:
    up = raw.upper().strip()
    if up in _TYPE_MAP:
        return _TYPE_MAP[up]
    for k, v in _TYPE_MAP.items():
        if k in up:
            return v
    return up  # return as-is if unknown


def _parse_tokens(section: str, full_output: str) -> list:
    """
    Try to extract tokens from the dedicated section.
    If that yields nothing, fall back to a simple C tokeniser on full_output.
    """
    tokens = _extract_tokens_from_text(section)
    if not tokens:
        tokens = _extract_tokens_from_text(full_output)
    if not tokens:
        # Last resort: tokenise ourselves
        tokens = _fallback_tokenise(full_output if full_output.strip() else section)
    return tokens


def _extract_tokens_from_text(text: str) -> list:
    tokens = []
    line_num = 1
    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith('#') or stripped.startswith('//'):
            continue

        # Two-column format first (cleaner)
        m2 = _TOKEN_2COL.match(stripped)
        if m2:
            tok_type = _canonical_type(m2.group(1))
            tok_val  = m2.group(2).strip().strip('"').strip("'")
            tokens.append({'type': tok_type, 'value': tok_val, 'line': line_num})
            continue

        # Angle-bracket or comma-separated format
        m = _TOKEN_PATTERN.match(stripped)
        if m:
            src_line = int(m.group(1)) if m.group(1) else line_num
            tok_type = _canonical_type(m.group(2))
            tok_val  = m.group(3).strip().strip('"').strip("'")
            trail_ln = int(m.group(4)) if m.group(4) else src_line
            tokens.append({'type': tok_type, 'value': tok_val, 'line': trail_ln})

        line_num += 1
    return tokens


def _fallback_tokenise(source: str) -> list:
    """
    Very simple C tokeniser used when the compiler produces no structured output.
    Works line by line on the source code itself.
    """
    tokens = []
    token_spec = [
        ('STRING',      r'"[^"\\]*(?:\\.[^"\\]*)*"'),
        ('CHAR',        r"'[^'\\]*(?:\\.[^'\\]*)*'"),
        ('NUMBER',      r'\b\d+\.?\d*([eE][+-]?\d+)?\b'),
        ('PUNCTUATION', r'[(){}\[\];,.]'),
        ('OPERATOR',    r'[+\-*/%=<>!&|^~?:]+'),
        ('IDENTIFIER',  r'\b[A-Za-z_][A-Za-z_0-9]*\b'),
        ('SKIP',        r'[ \t]+'),
        ('NEWLINE',     r'\n'),
        ('MISMATCH',    r'.'),
    ]
    tok_re = re.compile('|'.join(f'(?P<{n}>{p})' for n, p in token_spec))
    line_num = 1
    for mo in tok_re.finditer(source):
        kind  = mo.lastgroup
        value = mo.group()
        if kind == 'NEWLINE':
            line_num += 1
        elif kind in ('SKIP', 'MISMATCH'):
            pass
        else:
            if kind == 'IDENTIFIER':
                if value in C_TYPES:
                    kind = 'TYPE'
                elif value in C_KEYWORDS:
                    kind = 'KEYWORD'
            if kind == 'CHAR':   # char literal → same class as string (T010b)
                kind = 'STRING'
            tokens.append({'type': kind, 'value': value, 'line': line_num})
    return tokens


# ─────────────────────────────────────────────────────────────────────────────
#  SYMBOL TABLE PARSER
# ─────────────────────────────────────────────────────────────────────────────

def _parse_symtable(section: str) -> list:
    symbols = []
    for line in section.splitlines():
        stripped = line.strip()
        if not stripped or re.match(r'^[-=|+]+$', stripped):
            continue
        # Skip header rows
        if re.search(r'(name|type|scope|symbol)', stripped, re.I) and '|' not in stripped:
            continue

        # Pipe-delimited table  →  name | type | scope | value | line
        parts = [p.strip() for p in re.split(r'\|', stripped) if p.strip()]
        if len(parts) >= 2:
            sym = {
                'name' : parts[0] if len(parts) > 0 else '',
                'type' : parts[1] if len(parts) > 1 else 'unknown',
                'scope': parts[2] if len(parts) > 2 else 'global',
                'value': parts[3] if len(parts) > 3 else '—',
                'line' : _safe_int(parts[4]) if len(parts) > 4 else 0,
                'used' : True,
            }
            symbols.append(sym)
            continue

        # Space/tab delimited
        cols = stripped.split()
        if len(cols) >= 2:
            sym = {
                'name' : cols[0],
                'type' : cols[1] if len(cols) > 1 else 'unknown',
                'scope': cols[2] if len(cols) > 2 else 'global',
                'value': cols[3] if len(cols) > 3 else '—',
                'line' : _safe_int(cols[4]) if len(cols) > 4 else 0,
                'used' : True,
            }
            symbols.append(sym)

    return symbols


# ─────────────────────────────────────────────────────────────────────────────
#  IR CODE PARSER
# ─────────────────────────────────────────────────────────────────────────────

def _parse_ircode(section: str) -> list:
    lines = []
    for line in section.splitlines():
        stripped = line.strip()
        if stripped and not re.match(r'^[-=]+$', stripped):
            lines.append(stripped)
    return lines


# ─────────────────────────────────────────────────────────────────────────────
#  ERROR / WARNING PARSER
# ─────────────────────────────────────────────────────────────────────────────

_ERROR_PATTERN = re.compile(
    r'(?:line\s*(\d+))?.*?(error|warning|note)\s*:?\s*(.+)', re.I
)

def _parse_errors(section: str, stderr: str, success: bool) -> tuple:
    errors   = []
    warnings = []
    combined = (section + '\n' + stderr).strip()

    for line in combined.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        m = _ERROR_PATTERN.search(stripped)
        if m:
            line_no = _safe_int(m.group(1)) if m.group(1) else 0
            level   = m.group(2).lower()
            message = m.group(3).strip()
            entry   = {'level': level, 'message': message, 'line': line_no, 'col': 0}
            if level == 'warning':
                warnings.append(entry)
            elif level == 'error':
                errors.append(entry)

    # If compilation failed but we found no structured errors, add a generic one
    if not success and not errors:
        errors.append({
            'level'  : 'error',
            'message': stderr.strip() or 'Compilation failed with unknown error.',
            'line'   : 0,
            'col'    : 0,
        })

    return errors, warnings


# ─────────────────────────────────────────────────────────────────────────────
#  UTILITY
# ─────────────────────────────────────────────────────────────────────────────

def _safe_int(val) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0

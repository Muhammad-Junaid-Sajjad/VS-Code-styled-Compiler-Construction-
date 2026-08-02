# ─────────────────────────────────────────────────────────────────────────────
#  CompileViz C compiler — build recipe (FR-049)
#  VERIFIED: `gcc -ll` links libl's own `main` and FAILS on modern toolchains.
#  `yyerror`/`yywrap` are defined in-project, so no `-l*` library is needed.
# ─────────────────────────────────────────────────────────────────────────────

LEX  ?= lex
YACC ?= yacc
CC   ?= gcc

BIN    = compiler
OUTPUT = y.tab.c

.PHONY: all clean test

all: $(BIN)

$(BIN): lexer.l parser.y
	$(LEX) lexer.l
	$(YACC) -d -v parser.y
	$(CC) -w -o $(BIN) $(OUTPUT)

test: $(BIN)
	@./$(BIN) < input1.c > /dev/null 2>&1 \
		&& echo "compiler smoke OK (input1.c compiled)" \
		|| (echo "compiler smoke FAILED"; exit 1)

clean:
	rm -f lex.yy.c y.tab.c y.tab.h y.output $(BIN) a.out

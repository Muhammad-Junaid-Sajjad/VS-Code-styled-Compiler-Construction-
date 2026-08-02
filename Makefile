# ─────────────────────────────────────────────────────────────────────────────
#  CompileViz IDE — Root Makefile (single source of build truth, FR-048…FR-055)
#  Targets: all | setup | compiler | run | run-prod | test | clean
#           lint | format | check | help
# ─────────────────────────────────────────────────────────────────────────────

PYTHON      ?= python3
VENV_DIR    ?= venv
VENV_PY     := $(VENV_DIR)/bin/python
VENV_PIP    := $(VENV_DIR)/bin/pip
BACKEND     := backend
COMPILER    := compiler
FRONTEND    := frontend
NPM         ?= npm

.PHONY: all setup setup-backend setup-frontend compiler run run-prod test \
        clean lint format check help

all: setup compiler
	@echo "CompileViz build complete."

## ── Setup ──────────────────────────────────────────────────────────────────
setup: setup-backend setup-frontend

setup-backend: $(VENV_PY)
	$(VENV_PIP) install -r $(BACKEND)/requirements.txt

$(VENV_PY):
	$(PYTHON) -m venv $(VENV_DIR)

setup-frontend:
	@if [ -f $(FRONTEND)/package.json ]; then \
		cd $(FRONTEND) && $(NPM) ci; \
	else \
		echo "frontend/ not scaffolded yet (T004) — skipping npm install"; \
	fi

## ── Build ──────────────────────────────────────────────────────────────────
compiler:
	$(MAKE) -C $(COMPILER)

## ── Run ────────────────────────────────────────────────────────────────────
run: setup-backend
	$(VENV_PY) $(BACKEND)/app.py

run-prod: setup-backend
	$(VENV_PY) $(BACKEND)/wsgi.py

## ── Test (FR-052) ──────────────────────────────────────────────────────────
test: compiler setup-backend
	@$(VENV_PY) -m pytest $(BACKEND)/tests -q
	@if [ -f $(FRONTEND)/package.json ]; then \
		cd $(FRONTEND) && $(NPM) test -- --run; \
	else \
		echo "frontend tests: frontend/ not scaffolded yet"; \
	fi
	@$(MAKE) e2e

## ── E2E (T055/T056, FR-052) ────────────────────────────────────────────────
e2e:
	@cd $(FRONTEND) && if [ -d node_modules/@playwright/test ]; then \
		npx playwright test --config e2e/playwright.config.ts; \
	else \
		echo "E2E skipped: run 'cd frontend && npx playwright install chromium' first"; \
	fi

## ── Lint / Format / Check (T056b) ──────────────────────────────────────────
lint:
	@if command -v ruff >/dev/null 2>&1; then ruff check $(BACKEND); else echo "ruff not installed — pip install ruff"; fi
	@if [ -f $(FRONTEND)/package.json ]; then cd $(FRONTEND) && npx tsc --noEmit; fi

format:
	@if command -v ruff >/dev/null 2>&1; then ruff format $(BACKEND); else echo "ruff not installed — pip install ruff"; fi

check: lint test

## ── Clean (FR-053) ─────────────────────────────────────────────────────────
clean:
	-$(MAKE) -C $(COMPILER) clean 2>/dev/null || true
	-rm -rf $(VENV_DIR)
	-rm -rf $(FRONTEND)/dist $(FRONTEND)/node_modules
	-rm -rf .pytest_cache backend/.pytest_cache
	-find . -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleaned."

help:
	@echo "Targets: all | setup | compiler | run | run-prod | test | clean | lint | format | check"

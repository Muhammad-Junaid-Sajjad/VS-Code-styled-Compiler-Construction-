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

## ── Test ───────────────────────────────────────────────────────────────────
test: compiler setup-backend setup-frontend
	@$(VENV_PY) -m pytest $(BACKEND)/tests -q
	@$(MAKE) e2e

## ── E2E (Playwright, real browser against localhost:5000) ─────────────────
e2e: frontend-build
	@cd $(FRONTEND) && if [ -d node_modules/@playwright/test ]; then \
		npx playwright test --config e2e/playwright.config.ts; \
	else \
		echo "E2E skipped: run 'cd frontend && npm ci && npx playwright install chromium' first"; \
	fi

## ── Frontend build (single-file app copied into dist/; served by Flask) ───
frontend-build:
	@cd $(FRONTEND) && $(NPM) run build

## ── Lint / Format / Check ──────────────────────────────────────────────────
lint:
	@if command -v ruff >/dev/null 2>&1; then ruff check $(BACKEND); else echo "ruff not installed — pip install ruff"; fi

format:
	@if command -v ruff >/dev/null 2>&1; then ruff format $(BACKEND); else echo "ruff not installed — pip install ruff"; fi

check: lint test

## ── Clean (FR-053) ─────────────────────────────────────────────────────────
clean:
	-$(MAKE) -C $(COMPILER) clean 2>/dev/null || true
	-rm -rf $(VENV_DIR)
	-rm -rf $(FRONTEND)/dist $(FRONTEND)/node_modules $(FRONTEND)/test-results
	-rm -rf .pytest_cache backend/.pytest_cache
	-find . -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleaned."

help:
	@echo "Targets: all | setup | compiler | run | run-prod | test | e2e | frontend-build | clean | lint | format | check"

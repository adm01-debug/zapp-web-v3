# ZAPP Web - Comandos canônicos
# Uso: make <target>
.PHONY: help build deploy preflight smoke check-env clean

help:
	@echo "Targets disponíveis:"
	@echo "  make check-env  — Valida .env.local"
	@echo "  make build      — Build seguro (load .env.local)"
	@echo "  make preflight  — Validações pré-deploy"
	@echo "  make deploy     — Pipeline completo"
	@echo "  make smoke      — Smoke test v5"
	@echo "  make health     — Healthcheck detalhado"

check-env:
	@/workspace/scripts/zapp-pre-deploy-check.sh || (echo "❌ check falhou" && exit 1)

build: check-env
	@/workspace/scripts/zapp-build-safe.sh

preflight:
	@/workspace/scripts/zapp-pre-deploy-check.sh

deploy: check-env
	@/workspace/scripts/zapp-deploy.sh

smoke:
	@/workspace/scripts/smoke-test-v5.sh zapp.atomicabr.com.br

health:
	@curl -sk https://zapp.atomicabr.com.br/healthz/detailed | python3 -m json.tool

clean:
	@rm -rf dist node_modules/.vite

logs:
	@docker service logs --tail 50 zapp-web_web 2>&1 | tail -50

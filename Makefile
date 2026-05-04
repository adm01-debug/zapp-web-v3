# ============================================================================
# ZAPP Web — Comandos canônicos de deploy
# ============================================================================
# Pipeline completo (manual):
#   make pull && make install && make build && make smoke
#
# Pipeline completo (automatizado, requer PORTAINER_API_TOKEN):
#   make full-deploy
#
# Pipeline parcial (sem force-update — recomendado para uso via Claude/MCP):
#   make ship   # (= pull + install + build, depois force-update via MCP)
# ============================================================================

REPO_DIR  := /workspace/repos/zapp-web
SCRIPTS   := /workspace/scripts
DOMAIN    := zapp.atomicabr.com.br
SERVICE   := zapp-web_web

.PHONY: help pull install build smoke render health logs clean check-env \
        force-update ship deploy full-deploy rollback-info status

help:
	@echo ""
	@echo "  ╔══════════════════════════════════════════════════════════╗"
	@echo "  ║  ZAPP Web — Targets canônicos                            ║"
	@echo "  ╚══════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  ATÔMICOS:"
	@echo "    make pull          — git pull origin main"
	@echo "    make install       — npm install (se package-lock mudou)"
	@echo "    make build         — Build seguro (env-injected, valida bundle)"
	@echo "    make smoke         — Smoke v6 (109 checks)"
	@echo "    make render        — Render check Chromium (React monta?)"
	@echo "    make health        — /healthz/detailed"
	@echo "    make status        — Status do service Swarm"
	@echo "    make logs          — Últimas 50 linhas do service"
	@echo "    make force-update  — Force rolling no Swarm (PORTAINER_API_TOKEN req)"
	@echo "    make clean         — Remove dist + node_modules/.vite"
	@echo ""
	@echo "  ORQUESTRADOS:"
	@echo "    make ship          — pull + install + build (sem force-update)"
	@echo "                         Recomendado: rodar e depois force-update via MCP."
	@echo "    make deploy        — alias de ship (compatibilidade)"
	@echo "    make full-deploy   — ship + force-update + smoke + render"
	@echo "                         (requer PORTAINER_API_TOKEN exportado)"
	@echo ""
	@echo "  TROUBLESHOOTING:"
	@echo "    make rollback-info — Mostra últimos 5 commits pra escolher rollback"
	@echo ""

# ─── Atômicos ──────────────────────────────────────────────────────────────

pull:
	@echo "→ git pull"
	@cd $(REPO_DIR) && git fetch origin main --quiet
	@cd $(REPO_DIR) && git pull --ff-only origin main

install:
	@echo "→ npm install (se necessário)"
	@cd $(REPO_DIR) && \
	  if [ package-lock.json -nt node_modules/.package-lock.json ] 2>/dev/null || [ ! -d node_modules ]; then \
	    npm install --no-audit --no-fund --prefer-offline; \
	  else \
	    echo "  ✅ node_modules atualizado, pulando"; \
	  fi

check-env:
	@cd $(REPO_DIR) && \
	  [ -f .env.local ] || (echo "❌ .env.local ausente" && exit 1) && \
	  grep -q "^VITE_SUPABASE_URL=" .env.local || (echo "❌ VITE_SUPABASE_URL ausente" && exit 1) && \
	  grep -q "^VITE_SUPABASE_ANON_KEY=" .env.local || (echo "❌ VITE_SUPABASE_ANON_KEY ausente" && exit 1) && \
	  echo "  ✅ .env.local OK"

build: check-env
	@$(SCRIPTS)/zapp-build-safe.sh

smoke:
	@$(SCRIPTS)/smoke-test-v6.sh $(DOMAIN)

render:
	@cd $(SCRIPTS) && node render-check.mjs https://$(DOMAIN) 2>&1

health:
	@curl -sk https://$(DOMAIN)/healthz/detailed | python3 -m json.tool

status:
	@echo "→ Service: $(SERVICE)"
	@if [ -n "$$PORTAINER_API_TOKEN" ]; then \
	  curl -fs -H "X-API-Key: $$PORTAINER_API_TOKEN" \
	    "https://portainer.atomicabr.com.br/api/endpoints/1/docker/services/$(SERVICE)" \
	    | python3 -c "import json,sys;d=json.load(sys.stdin);s=d.get('Spec',{});us=d.get('UpdateStatus',{});print(f'image: {s.get(\"Labels\",{}).get(\"com.docker.stack.image\")}\\nreplicas: {s.get(\"Mode\",{}).get(\"Replicated\",{}).get(\"Replicas\")}\\nforce_update: {s.get(\"TaskTemplate\",{}).get(\"ForceUpdate\")}\\nlast_state: {us.get(\"State\")}\\nlast_msg: {us.get(\"Message\")}')"; \
	else \
	  echo "  (PORTAINER_API_TOKEN não setado, use Claude/MCP para inspect)"; \
	fi

logs:
	@if command -v docker > /dev/null; then \
	  docker service logs --tail 50 $(SERVICE) 2>&1 | tail -50; \
	else \
	  echo "  docker não disponível neste container — use Portainer UI ou MCP"; \
	fi

clean:
	@cd $(REPO_DIR) && rm -rf dist node_modules/.vite
	@echo "✅ dist/ e node_modules/.vite removidos"

force-update:
	@$(SCRIPTS)/portainer-force-update.sh $(SERVICE)

# ─── Orquestrados ──────────────────────────────────────────────────────────

ship: pull install build
	@echo ""
	@echo "  ╔══════════════════════════════════════════════════════════╗"
	@echo "  ║  ✅ Build pronto. Próximo passo:                          ║"
	@echo "  ║                                                            ║"
	@echo "  ║  Via Claude/MCP (recomendado):                             ║"
	@echo "  ║    portainer_update_service zapp-web_web (ForceUpdate++)   ║"
	@echo "  ║                                                            ║"
	@echo "  ║  Via terminal (precisa PORTAINER_API_TOKEN):               ║"
	@echo "  ║    make force-update                                       ║"
	@echo "  ║                                                            ║"
	@echo "  ║  Pipeline 100% automatizado:                               ║"
	@echo "  ║    make full-deploy                                        ║"
	@echo "  ╚══════════════════════════════════════════════════════════╝"

# Alias retrocompatível
deploy: ship

full-deploy: ship force-update smoke
	@echo ""
	@echo "  🏆 FULL DEPLOY COMPLETO — produção sincronizada"
	@$(MAKE) --no-print-directory health

rollback-info:
	@cd $(REPO_DIR) && \
	  echo "Últimos 10 commits (pra escolher rollback target):" && \
	  git log --oneline -10 && \
	  echo "" && \
	  echo "Para fazer rollback de código:" && \
	  echo "  cd $(REPO_DIR) && git reset --hard <commit> && make build && make force-update"

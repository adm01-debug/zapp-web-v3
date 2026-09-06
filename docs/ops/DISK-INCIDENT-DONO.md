# Disco da VPS — Ownership do Incidente e Plano de Ação

> **Criado:** 2026-09-06 (Dim-20 da auditoria técnica 22D)
> **Dono:** Joaquim (ti@promobrindes.com.br) — Tech Lead / Dono da Promo Brindes
> **Status do incidente:** Disco a 98% detectado em 2026-08-20 pela auditoria.

---

## Estado atual

| Métrica | Valor (última verificação) |
|---------|--------------------------|
| Uso do disco | ~98% (auditoria 2026-08-20) |
| Alerta automático | **Ausente** — gap identificado pela auditoria |
| Rollback automático de deploy | **Ausente** |
| Circuit breaker no backend | **Ausente** |

---

## Dono e Escalada

| Papel | Pessoa | Contato |
|-------|--------|---------|
| **Responsável primário** | Joaquim | ti@promobrindes.com.br |
| **Escalada (fora horário)** | Joaquim | WhatsApp |
| **Plataforma de infra** | VPS AtomicaBR — Docker Swarm + Portainer + Traefik | |

Incidentes de disco **não têm responsável automático** — toda ação até agora é manual.
Este documento formaliza o dono e os passos esperados de resposta.

---

## Causas Conhecidas de Crescimento de Disco

| Causa | Volume | Localização |
|-------|--------|-------------|
| Logs do Docker (stdout/stderr não rotacionados) | Cresce ∞ | `/var/lib/docker/containers/*/` |
| `webhook_audit_log` (58.232 linhas, 19 MB — DB) | Cresce com tráfego | Postgres `zapp.webhook_audit_log` |
| `webhook_events_processed` (58.076, 31 MB — DB) | Cresce com tráfego | Postgres `zapp.webhook_events_processed` |
| Backups locais do Postgres (pg_dump) | Depende de script | `/workspace/backups/` ou similar |
| `graphify-out/graph.json` (35 MB) | Fixo por rebuild | `/workspace/repos/zapp-web-v3/graphify-out/` |
| Imagens Docker não usadas | Cresce com deploys | `docker images` |

---

## Plano de Ação Imediato (a executar manualmente por Joaquim)

### 1. Limpeza de emergência (quando disco > 90%)

```bash
# Via Portainer exec no container adequado, ou SSH na VPS

# Liberar espaço com imagens Docker não usadas
docker image prune -f

# Liberar volumes não referenciados
docker volume prune -f

# Ver os maiores consumidores
du -sh /var/lib/docker/containers/*/  2>/dev/null | sort -rh | head -20

# Truncar logs Docker de um container específico (substitua <id>)
truncate -s 0 /var/lib/docker/containers/<id>/<id>-json.log
```

### 2. Limpar eventos processados no banco (dados > 30 dias)

```sql
-- Conectar no Supabase self-hosted e rodar:
DELETE FROM zapp.webhook_audit_log
WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM zapp.webhook_events_processed
WHERE created_at < NOW() - INTERVAL '30 days';

VACUUM ANALYZE zapp.webhook_audit_log;
VACUUM ANALYZE zapp.webhook_events_processed;
```

---

## Alertas Automáticos — Pendências

Os itens abaixo são **gaps identificados pela auditoria** e devem ser implementados:

| Item | Prioridade | Status |
|------|-----------|--------|
| Alerta de disco > 85% → notificação WhatsApp (via N8N + Evolution) | Alta | ⏳ Pendente |
| Rotação de logs Docker (`log-driver: json-file` + `max-size: 100m, max-file: 3`) no Compose | Alta | ⏳ Pendente |
| Cron diário para DELETE de `webhook_*` > 30 dias | Média | ⏳ Pendente |
| Rollback automático de deploy em falha de healthcheck | Média | ⏳ Pendente |

### Alerta de disco — implementação sugerida

Adicionar ao stack do Swarm (Portainer) ou como cron no container `claude-code`:

```bash
# Cron diário às 07:00 UTC
0 7 * * * df -h / | awk 'NR==2{gsub(/%/,"",$5); if($5>85) print "DISCO "$5"%"}' | \
  grep "DISCO" && curl -s -X POST "$EVOLUTION_URL/message/sendText/wpp2" \
  -H "apikey: $EVOLUTION_KEY" \
  -d '{"number":"NUMERO_RESPONSAVEL","text":"⚠️ VPS disco acima de 85%! Ação necessária."}'
```

### Rotação de logs Docker — aplicar no compose do stack

```yaml
services:
  meu_servico:
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "3"
```

---

## Histórico do Incidente

| Data | Evento |
|------|--------|
| 2026-08-20 | Auditoria técnica detecta disco a 98%; gap de alerta automático e de dono registrado |
| 2026-09-06 | Documento de ownership criado; plano de ação formalizado (Dim-20 da auditoria 22D) |

---

## Próximos Passos (em ordem de prioridade)

1. **Imediato**: Executar limpeza manual (`docker image prune`, DELETE nos webhooks > 30d)
2. **Esta semana**: Adicionar rotação de logs no compose do Swarm
3. **Este mês**: Criar cron de alerta de disco > 85% no N8N/Evolution
4. **Este mês**: Criar cron de limpeza automática de `webhook_*` > 30 dias

---

*Este documento é o ponto de referência único para incidentes de disco na VPS AtomicaBR.
Atualizar após cada ação tomada.*

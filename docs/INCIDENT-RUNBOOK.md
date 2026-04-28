# 🚨 ZAPP-WEB — Runbook de Incidentes

**Versão:** 1.1  
**Data:** 2026-04-27  
**Autor:** Claude AI — SRE Agent  
**Status:** Aprovado

---

## 🎯 Objetivo

Este runbook define procedimentos padronizados para resposta a incidentes no sistema ZAPP-WEB, garantindo:
- Resposta rápida e consistente
- Minimização de impacto ao cliente
- Documentação e aprendizado contínuo
- Rollback seguro e cronometrado

---

## 📞 On-call, escalação e calendário

### Matriz de responsáveis

| Papel | Responsável titular | Backup | Canal primário | SLA de resposta |
|-------|----------------------|--------|----------------|-----------------|
| **On-Call Principal (L1)** | Joaquim | Camila | Slack `#incidents` | 5 min |
| **On-Call Plataforma (L2)** | Camila | Rafael | Slack + WhatsApp | 10 min |
| **On-Call Integrações (L2)** | Rafael | Joaquim | Slack + WhatsApp | 10 min |
| **Incident Commander (L3)** | Fernanda | Joaquim | Slack + Meet | 15 min |

### Regras de escalação

1. **L1 (0-15 min):** diagnóstico inicial, mitigação rápida, comunicação.
2. **L2 (15-30 min):** acionamento por domínio (plataforma/integrações).
3. **L3 (>30 min ou SEV-1):** assumir comando, priorizar rollback e comunicação executiva.
4. **Externo:** se dependência third-party for causa principal, abrir ticket oficial (Supabase/Evolution/etc.) em até 20 min após confirmação.

### Calendário de plantão (publicação)

- Publicar escala mensal até o **dia 25** do mês anterior.
- Publicar no Slack (`#oncall`) e no calendário compartilhado “ZAPP On-Call”.
- Garantir cobertura 24/7 com titular + backup.
- Trocas de plantão devem ser registradas no calendário em até 30 min.

### Contatos de emergência externos

| Serviço | Contato | Cobertura |
|---------|---------|-----------|
| Supabase Support | support@supabase.io | 24/7 |
| Lovable Support | support@lovable.dev | Horário comercial |
| Evolution API | GitHub Issues / suporte contratado | Horário comercial |

---

## 🌡️ Níveis de Severidade

| Nível | Descrição | RTO | Exemplos |
|-------|-----------|-----|----------|
| **SEV-1** | Sistema completamente fora | 15 min | DB down, API 100% erro |
| **SEV-2** | Funcionalidade crítica degradada | 1 hora | Chat lento, mensagens não enviando |
| **SEV-3** | Funcionalidade secundária afetada | 4 horas | Dashboard lento, relatórios com erro |
| **SEV-4** | Bug cosmético ou menor | 24 horas | UI desalinhada, texto errado |

---

## ⏱️ Procedimento de rollback cronometrado (objetivo)

> Use este fluxo para deploys que geraram incidente ou regressão em produção.

### Janela padrão: 15 minutos

| Minuto | Ação | Dono |
|--------|------|------|
| **T+00** | Declarar incidente, congelar novos deploys, iniciar cronômetro | L1 |
| **T+03** | Confirmar escopo/impacto e decidir `rollback parcial` ou `total` | L1 + L2 |
| **T+05** | Executar rollback (frontend/edge/migration conforme plano) | L2 |
| **T+10** | Validar health checks + smoke tests críticos | L1 |
| **T+12** | Comunicar status (mitigado ou escalado) | L1 |
| **T+15** | Encerrar rollback com evidências ou escalar para L3 | Incident Commander |

### Checklist objetivo de rollback

- [ ] Congelar pipeline (CI/CD) e registrar motivo.
- [ ] Identificar versão estável alvo (`tag`/`commit`/`migration`).
- [ ] Executar rollback técnico por camada:
  - [ ] Frontend (redeploy de artefato estável)
  - [ ] Edge Functions (deploy da versão estável)
  - [ ] Configuração/env (reverter variáveis alteradas)
  - [ ] Banco de dados (somente rollback seguro/compatível)
- [ ] Rodar smoke checks obrigatórios:
  - [ ] Login
  - [ ] Abertura de conversa
  - [ ] Envio/recebimento de mensagem
  - [ ] Webhook processando sem fila crescente
- [ ] Validar métricas por 10 minutos (erro, latência, retries, DLQ).
- [ ] Comunicar stakeholders com horário e impacto residual.
- [ ] Abrir post-mortem e ticket de prevenção antes de encerrar incidente.

### Critérios de sucesso do rollback

- Taxa de erro voltou ao baseline (±20% da última semana).
- Nenhuma fila crítica crescendo por 10 min.
- Funcionalidades críticas operantes (auth, envio, inbound webhook).

---

## 🔥 INCIDENTE: Sistema Fora do Ar (SEV-1)

### Sintomas
- Página não carrega
- Erro 500/502/503
- Mensagens "Connection refused"

### Diagnóstico (5 min)

```bash
# 1. Verificar Supabase Dashboard
https://supabase.com/dashboard/project/allrjhkpuscmgbsnmjlv

# 2. Verificar status público
https://status.supabase.com/
https://status.lovable.dev/

# 3. Testar conectividade DB
curl -X POST "https://allrjhkpuscmgbsnmjlv.supabase.co/rest/v1/" \
  -H "apikey: <anon_key>" \
  -H "Content-Type: application/json"
```

### Ações de Recuperação

| # | Ação | Responsável | Tempo |
|---|------|-------------|-------|
| 1 | Verificar status Supabase | On-Call | 2 min |
| 2 | Verificar logs Edge Functions | On-Call | 5 min |
| 3 | Reiniciar Edge Functions | On-Call | 2 min |
| 4 | Se persistir, abrir ticket Supabase | On-Call | 5 min |
| 5 | Comunicar stakeholders | On-Call | 2 min |

### Escalação
- **15 min sem resolução:** Escalar para L2
- **30 min sem resolução:** Escalar para L3 + suporte externo

---

## 💬 INCIDENTE: WhatsApp Não Conecta (SEV-2)

### Sintomas
- Status "Disconnected" no painel
- QR Code não aparece
- Mensagens não enviando/recebendo

### Diagnóstico

```sql
-- 1. Verificar conexões WhatsApp
SELECT id, instance_name, status, last_seen_at
FROM whatsapp_connections
ORDER BY updated_at DESC LIMIT 10;
```

```bash
# 2. Verificar Evolution API
curl -X GET "https://<evolution-api-url>/instance/fetchInstances" \
  -H "apikey: <evolution_key>"

# 3. Verificar logs da Edge Function
# Dashboard > Logs > evolution-api
```

### Ações de Recuperação

| # | Ação | Comando |
|---|------|---------|
| 1 | Verificar status da instância | `GET /instance/connectionState/{instance}` |
| 2 | Tentar reconectar | `POST /instance/connect/{instance}` |
| 3 | Se falhar, logout e reconectar | `DELETE /instance/logout/{instance}` |
| 4 | Último recurso: recriar instância | `DELETE /instance/delete/{instance}` + `POST /instance/create` |

---

## 📩 INCIDENTE: Mensagens Não Estão Chegando (SEV-2)

### Sintomas
- Cliente enviou mensagem mas não aparece no ZAPP
- Mensagens atrasadas >30 segundos

### Diagnóstico

```sql
-- 1. Verificar últimas mensagens recebidas
SELECT id, content, direction, created_at
FROM messages
WHERE direction = 'incoming'
ORDER BY created_at DESC LIMIT 20;

-- 2. Verificar webhooks recebidos
SELECT * FROM audit_logs
WHERE action LIKE '%webhook%'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Ações de Recuperação

| # | Causa Provável | Ação |
|---|----------------|------|
| 1 | Webhook não configurado | Verificar URL do webhook na Evolution |
| 2 | Edge Function com erro | Verificar logs e redeploy se necessário |
| 3 | Realtime desconectado | Refresh da página / verificar RLS |
| 4 | Rate limit atingido | Verificar `rate_limit_logs` |

---

## 🧪 Simulações trimestrais obrigatórias

**Periodicidade:** 1x por trimestre (Jan/Apr/Jul/Out)  
**Duração alvo:** 60 minutos por simulação  
**Responsável:** Incident Commander + on-call do trimestre

### Cenários mínimos

1. **Auth indisponível**
   - Injetar falha controlada de autenticação (timeout/5xx).
   - Verificar fallback de sessão, mensagens de erro e comunicação ao usuário.
2. **Webhook atrasado**
   - Simular atraso de entrega (>2 minutos) e acúmulo de fila.
   - Validar alertas de latência, reprocessamento e deduplicação.
3. **Provider offline**
   - Simular indisponibilidade do provider (Evolution ou externo).
   - Validar circuit breaker, retry/backoff e plano de contingência.

### Checklist de execução da simulação

- [ ] Definir hipótese e critério de sucesso.
- [ ] Executar cenário em ambiente controlado.
- [ ] Capturar métricas antes/durante/depois.
- [ ] Validar detecção automática (alerta disparou?).
- [ ] Validar tempo de resposta da equipe (SLA cumprido?).
- [ ] Registrar aprendizados e gaps.
- [ ] Gerar post-mortem da simulação em até 48h.

---

## 📄 Post-mortem padronizado + backlog técnico

### Regras obrigatórias

- Todo **SEV-1/SEV-2** e toda simulação trimestral deve gerar post-mortem em até **48h**.
- Toda ação preventiva identificada deve virar item no **backlog técnico** com dono e prazo.
- Itens críticos sem dono não podem ser fechados como “concluído”.

### Template de post-mortem (padrão)

```markdown
# Postmortem: [TÍTULO DO INCIDENTE/SIMULAÇÃO]

**Data:** YYYY-MM-DD
**Severidade:** SEV-X
**Tipo:** Real | Simulação
**Duração:** X horas Y minutos
**Impacto:** X usuários afetados
**Detectado por:** Alerta | Cliente | Time interno

## Timeline
- HH:MM - Incidente detectado
- HH:MM - Equipe acionada
- HH:MM - Causa raiz identificada
- HH:MM - Mitigação aplicada
- HH:MM - Sistema normalizado

## Causa raiz
[Descrição técnica e sistêmica]

## Fatores contribuintes
- [Fator 1]
- [Fator 2]

## O que funcionou bem
- [Ponto positivo 1]
- [Ponto positivo 2]

## O que falhou
- [Ponto de melhoria 1]
- [Ponto de melhoria 2]

## Ações preventivas (obrigatório criar no backlog)
| # | Ação | Tipo (Preventiva/Corretiva) | Responsável | Prazo | Link ticket |
|---|------|-------------------------------|-------------|-------|-------------|
| 1 | [Ação] | Preventiva | [Nome] | [Data] | [URL] |
```

### Backlog técnico (padrão de registro)

- Projeto: **Reliability / Operações**
- Campos obrigatórios: `severidade`, `causa_raiz`, `tipo_acao`, `owner`, `due_date`, `link_postmortem`
- SLA de planejamento:
  - Preventiva crítica: iniciar em até 7 dias.
  - Preventiva não crítica: iniciar em até 30 dias.

---

## 📋 Checklist geral de incidente

### Durante o incidente
- [ ] Identificar severidade (SEV-1/2/3/4)
- [ ] Comunicar equipe (Slack #incidents)
- [ ] Iniciar timer de RTO
- [ ] Iniciar timer de rollback (janela 15 min)
- [ ] Documentar timeline em tempo real
- [ ] Aplicar mitigação
- [ ] Verificar resolução
- [ ] Comunicar stakeholders

### Pós-incidente (até 48h)
- [ ] Escrever post-mortem no template padrão
- [ ] Criar ações preventivas no backlog técnico
- [ ] Definir owner e prazo para cada ação
- [ ] Agendar review com equipe
- [ ] Atualizar runbook se necessário
- [ ] Arquivar documentação

---

## 📚 Recursos úteis

### Dashboards
- [Supabase Dashboard](https://supabase.com/dashboard/project/allrjhkpuscmgbsnmjlv)
- [Lovable Dashboard](https://lovable.dev/projects)
- [ZAPP-WEB Produção](https://pronto-talk-suite.lovable.app)

### Documentação
- [Backup & Recovery](./BACKUP-RECOVERY-STRATEGY.md)
- [Deploy](./DEPLOYMENT.md)
- [SLA Escalonamento Cron](./SLA-ESCALATION-CRON.md)

---

**Aprovado por:** Claude AI — SRE Agent  
**Data:** 2026-04-27  
**Próxima revisão:** 2026-07-27 (trimestral)

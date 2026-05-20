# 📅 Calendário Operacional — On-call e Simulações

**Vigência inicial:** Q2 2026  
**Última atualização:** 2026-04-27

## 1) Calendário de on-call (publicado)

| Semana (UTC) | On-call principal (L1) | Backup (L1) | Plataforma (L2) | Integrações (L2) |
|---|---|---|---|---|
| 2026-04-27 → 2026-05-03 | Joaquim | Camila | Camila | Rafael |
| 2026-05-04 → 2026-05-10 | Camila | Rafael | Rafael | Joaquim |
| 2026-05-11 → 2026-05-17 | Rafael | Joaquim | Joaquim | Camila |
| 2026-05-18 → 2026-05-24 | Joaquim | Camila | Camila | Rafael |
| 2026-05-25 → 2026-05-31 | Camila | Rafael | Rafael | Joaquim |

> Publicar esta escala no Slack `#oncall` e no calendário compartilhado “ZAPP On-Call”.

## 2) Agenda de simulações trimestrais

| Trimestre | Janela sugerida | Simulação 1 | Simulação 2 | Simulação 3 | Dono |
|---|---|---|---|---|---|
| Q2 2026 | 2026-05-20 a 2026-05-30 | Auth indisponível | Webhook atrasado | Provider offline | Incident Commander |
| Q3 2026 | 2026-08-17 a 2026-08-28 | Auth indisponível | Webhook atrasado | Provider offline | Incident Commander |
| Q4 2026 | 2026-11-16 a 2026-11-27 | Auth indisponível | Webhook atrasado | Provider offline | Incident Commander |

## 3) Critérios mínimos por simulação

- Duração máxima da simulação: 60 min.
- Produzir post-mortem em até 48h.
- Abrir ações preventivas no backlog técnico com owner e prazo.

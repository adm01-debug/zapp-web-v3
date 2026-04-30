# 🛡️ Security Alerts — Configuração Completa

Este repo tem 4 camadas de defesa de segurança como código (este PR adiciona a 4ª). 2 toggles UI completam o stack.

| # | Camada | Onde | Status |
|---|---|---|---|
| 1 | Gitleaks (segredos no diff) | `.github/workflows/security.yml` | ✅ Ativo |
| 2 | Dependabot Updates (PRs de bumps) | `.github/dependabot.yml` | ✅ Ativo |
| 3 | Dependabot Security Alerts (CVEs) | UI Settings → Code security | ⏳ **Ativar** |
| 4 | Code Scanning (CodeQL) | `.github/workflows/codeql.yml` | ✅ Ativo (este PR) |
| 5 | Secret Scanning Alerts | UI Settings → Code security | ⏳ **Ativar** |

---

## 1. Dependabot Security Alerts (camada 3)

Diferente do Dependabot Updates (camada 2, semanal), o **Security Alerts** monitora CVEs e abre PRs **emergenciais** quando uma vulnerabilidade conhecida atinge uma dependência sua.

### Como ativar

1. Acessar https://github.com/adm01-debug/zapp-web/settings/security_analysis
2. **Dependency graph**: ☑ Enabled
3. **Dependabot alerts**: ☑ Enabled
4. **Dependabot security updates**: ☑ Enabled

### Validação

https://github.com/adm01-debug/zapp-web/security/dependabot — deve listar alertas conhecidos.

---

## 2. Code Scanning (camada 4) — CodeQL

Scanner de análise estática que detecta padrões de bugs/vulns no código:
- SQL injection / XSS / Path traversal
- Hardcoded credentials (complementa Gitleaks)
- Comparações inseguras
- APIs deprecadas

`.github/workflows/codeql.yml` roda em push em main, todo PR contra main, e cron toda segunda 09:00 UTC.

Resultados: https://github.com/adm01-debug/zapp-web/security/code-scanning

---

## 3. Secret Scanning Alerts (camada 5)

Diferente do Gitleaks (camada 1, CI local), o Secret Scanning é serviço do GitHub que escaneia commits **publicados** procurando padrões de tokens (AWS, Stripe, GitHub PATs, etc.) e notifica o provedor automaticamente.

### Como ativar

1. https://github.com/adm01-debug/zapp-web/settings/security_analysis
2. **Secret scanning**: ☑ Enabled
3. **Push protection**: ☑ Enabled (bloqueia push antes de chegar no GitHub)

Push Protection elimina a janela de exposição. Vale a pena.

---

## 4. Resumo da política

- **Gitleaks** (CI) bloqueia PRs com segredos
- **Dependabot Updates** (semanal) mantém deps em ritmo previsível
- **Dependabot Security Alerts** (real-time) reage a CVEs publicados
- **CodeQL** (PR + cron) varre código por padrões inseguros
- **Secret Scanning + Push Protection** (real-time) bloqueia secrets antes do push

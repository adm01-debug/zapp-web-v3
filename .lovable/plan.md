## Objetivo

Adicionar um spec Playwright que cobre o fluxo da Galeria de Mídia no painel de detalhes do contato:

1. Ao abrir uma conversa, a galeria **não** aparece automaticamente.
2. Ao clicar em "Abrir galeria", o `Dialog` abre.
3. É possível fechar o `Dialog` (via botão X / tecla Escape) e ele desaparece do DOM.

## Contexto

- Suíte E2E vive em `e2e/` (Playwright + fixture `authenticatedPage` em `e2e/fixtures/auth.ts`).
- `ContactAccordionSections.tsx` renderiza um botão "Abrir galeria" que faz `setMediaOpen(true)`.
- `MediaGallery.tsx` usa `Dialog` com `DialogTitle` "Galeria de Mídia" — seletor estável por accessible name (`role="dialog"` + name).
- O painel de detalhes (`ContactDetails`) renderiza ao selecionar uma conversa; em mobile vira `Sheet`. O spec roda em chromium desktop padrão (1280×720), então o painel lateral é o caminho.

## Spec proposto: `e2e/contact-media-gallery.spec.ts`

Estrutura mínima (~40 linhas), seguindo padrão de `inbox-realtime.spec.ts`:

```ts
import { test, expect } from './fixtures/auth';

test.describe('Contact media gallery', () => {
  test('não abre automaticamente e pode ser fechada', async ({ authenticatedPage: page }) => {
    await page.goto('/');

    // 1. Selecionar primeira conversa disponível (skip se vazio)
    const firstConv = page
      .locator('[data-testid="conversation-item"], [role="listitem"]')
      .first();
    if (!(await firstConv.isVisible().catch(() => false))) {
      test.skip(true, 'Nenhuma conversa disponível para o usuário de teste');
    }
    await firstConv.click();

    // 2. Esperar área de chat — garante que ContactDetails montou
    await expect(
      page.locator('[role="log"], [data-testid="chat-messages"]').first()
    ).toBeVisible({ timeout: 10_000 });

    // 3. Galeria NÃO deve estar visível automaticamente
    const gallery = page.getByRole('dialog', { name: /Galeria de Mídia/i });
    await expect(gallery).toBeHidden();

    // 4. Localizar e clicar no botão "Abrir galeria" (pode estar dentro de accordion colapsado)
    const openBtn = page.getByRole('button', { name: /Abrir galeria/i });
    if (!(await openBtn.isVisible().catch(() => false))) {
      // expandir accordion "Mídia Compartilhada" se necessário
      await page.getByRole('button', { name: /Mídia Compartilhada/i }).click();
    }
    await openBtn.click();

    // 5. Galeria abre
    await expect(gallery).toBeVisible({ timeout: 5_000 });

    // 6. Fechar via Escape (o botão X do Radix Dialog também aceita name 'Close')
    await page.keyboard.press('Escape');
    await expect(gallery).toBeHidden({ timeout: 5_000 });
  });
});
```

### Notas de robustez

- `getByRole('dialog', { name: /Galeria de Mídia/i })` casa pela `DialogTitle` existente — sem precisar adicionar `data-testid`.
- Passo 4 trata o caso de o accordion "stats/media" estar colapsado: tenta clicar no trigger pelo nome se o botão "Abrir galeria" não estiver visível.
- `Escape` é o caminho de fechamento mais determinístico em Radix Dialog (evita ambiguidade com múltiplos botões X na página, incluindo o do painel `ContactDetails`).
- Sem mocks de rede: o teste valida apenas comportamento de UI (montagem/desmontagem do dialog). Compatível com o ambiente que já roda `inbox-realtime.spec.ts`.

## Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `e2e/contact-media-gallery.spec.ts` |

## Não-objetivos

- Não validar conteúdo da galeria (thumbnails, contadores) — escopo é apenas abertura/fechamento.
- Não testar variante mobile (`Sheet`) — fica para spec separado se necessário.
- Não adicionar `data-testid` em `MediaGallery.tsx` ou no botão (seletores por role/name são suficientes e mais resilientes).
- Não cobrir persistência por contato (planejada em iteração anterior, ainda não implementada).

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Conta E2E sem conversas → spec sempre `skip` | Mesmo padrão já aceito em `inbox-realtime.spec.ts`. |
| Múltiplos `[role="dialog"]` na página confundem o seletor | Filtro por `name: /Galeria de Mídia/i` desambigua. |
| Animação de saída do `AnimatePresence` atrasa `toBeHidden` | Timeout de 5s já cobre folga (animação típica < 300ms). |
| Botão "Abrir galeria" oculto por accordion fechado | Fallback explícito que clica no trigger "Mídia Compartilhada" antes. |

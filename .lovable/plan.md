
## Corrigir a conexão com a Eco/Evolution API

### Problema confirmado

O fluxo de reconexão já está chamando a função correta (`/functions/v1/evolution-api`). O erro atual não é mais de rota no frontend.

A falha real está no backend integrado:
- `action: "connect"` para a instância `wpp2`
- tentativa de recriar a instância quando ela não existe
- resposta da API externa: `401 Unauthorized`

Isso indica incompatibilidade entre `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` (URL/chave de ambientes ou contas diferentes, chave inválida/expirada, ou chave sem permissão para criar instância).

### O que será feito

#### 1. Endurecer a função `supabase/functions/evolution-api/index.ts`
Ajustar o fluxo `connect` para tratar autenticação da API externa antes de seguir com recriação automática:

- detectar `401/403` tanto no `connect` quanto no `create-instance`
- parar o fallback automático quando o erro for de credencial/permissão
- retornar envelope consistente com:
  - `error: true`
  - `status`
  - `message` claro e acionável
  - `details` preservando a resposta original

Também vou evitar respostas “400 genéricas” nesse caminho, para não quebrar a UI nem mascarar a causa real.

#### 2. Validar configuração da integração no backend
Revisar o par de secrets usados pela função:
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

A correção prática será garantir que ambos apontem para a mesma instância/conta da Eco/Evolution API e que a chave tenha permissão para:
- consultar instância
- conectar instância
- criar instância

Se a chave atual estiver incorreta, o ajuste necessário será atualizar o secret no backend.

#### 3. Melhorar a UX no frontend de conexões
Nos fluxos que hoje exibem “Reconectar” / “Ver QR Code”:
- mostrar mensagem específica quando o backend devolver erro de autenticação
- não continuar tentando gerar QR indefinidamente em erro `401/403`
- orientar claramente que a integração externa está sem autorização, em vez de parecer “instância desconectada comum”

Arquivos principais:
- `src/components/alerts/EvolutionDisconnectBanner.tsx`
- `src/hooks/useConnectionsManager.ts`

#### 4. Adicionar cobertura de testes Deno
Criar testes para o edge function cobrindo:
- `connect` falhando com `401 Unauthorized`
- `connect` detectando instância ausente e `create-instance` falhando com `401`
- garantia de que a resposta final mantém envelope padronizado e mensagem correta

Arquivo alvo:
- `supabase/functions/evolution-api/__tests__/connect-auth-errors.test.ts` (ou ampliar o teste já existente de missing instance)

### Resultado esperado

Após a correção:
- se a chave estiver válida, `wpp2` poderá ser recriada/conectada e o QR será exibido normalmente
- se a chave estiver inválida, a interface mostrará erro explícito de autorização da Eco/Evolution API, sem tela em branco e sem falso fluxo de reconexão

### Verificação

1. Chamar `POST /functions/v1/evolution-api` com:
   ```json
   { "action": "connect", "instanceName": "wpp2" }
   ```
2. Confirmar um dos dois comportamentos:
   - sucesso com QR code
   - erro controlado com mensagem de credencial/permissão
3. Repetir pelo botão **Reconectar** e pelo botão **Ver QR Code**
4. Garantir que não haja crash da interface e que o erro deixe de aparecer como falha genérica

### Arquivos afetados

- `supabase/functions/evolution-api/index.ts`
- `src/hooks/useConnectionsManager.ts`
- `src/components/alerts/EvolutionDisconnectBanner.tsx`
- `supabase/functions/evolution-api/__tests__/connect-auth-errors.test.ts`

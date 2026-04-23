

## Banner de desconexão: agrupar + expandir

Atualizar `src/components/alerts/EvolutionDisconnectBanner.tsx` para, quando houver múltiplas instâncias desconectadas, mostrar um contador agregado e permitir expandir a lista para ver/agir em cada uma.

### Comportamento

- **1 instância**: mantém o layout atual (nome + botão "Reconectar" inline).
- **2+ instâncias**: mostra `⚠️ N conexões afetadas` + botão chevron "Ver instâncias". Ao expandir, renderiza uma lista compacta abaixo da barra com:
  - Nome da instância (`instance_id`)
  - Telefone (se houver)
  - Botão individual "Reconectar" por linha (reusa `handleReconnect`)
- Botão "Reconectar todas" no header quando colapsado (dispara `handleReconnect` em sequência para cada instância).
- Botão X de fechar e dismiss permanecem.
- Estado `expanded` local (`useState<boolean>`), recolhe automaticamente quando a lista volta a 1 ou 0.

### Implementação

- Adicionar `expanded` state e `reconnectingAll` state.
- Substituir o bloco do `<span>` de contagem por um trigger clicável (chevron rotativo via `framer-motion`).
- Lista expandida: `<motion.div>` com `initial/animate/exit` height/opacity, `max-h-64 overflow-y-auto`, divisores sutis.
- "Reconectar todas": loop `for...of` chamando `handleReconnect` com pequeno `await` entre chamadas para não saturar o proxy.
- Acessibilidade: `aria-expanded`, `aria-controls`, foco visível no trigger; lista com `role="list"`.
- Sem novas dependências; reutiliza `framer-motion`, `lucide-react` (`ChevronDown`, `RefreshCw`, `WifiOff`, `X`), `cn`, `toast`.

### Arquivos

- `src/components/alerts/EvolutionDisconnectBanner.tsx` (única edição)

### Fora de escopo

- Nenhuma mudança de schema, RPC, ou edge function.
- Sem alteração nos demais alertas (`RateLimitRealtimeAlerts`, `useWarRoomAlerts`).


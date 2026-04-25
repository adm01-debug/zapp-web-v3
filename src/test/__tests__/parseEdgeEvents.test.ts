import { describe, it, expect } from 'vitest';
import { parseEdgeEvents } from '@/lib/realtime/edgeEvents';

/**
 * Garante que o parser de rótulos das arestas DB -.->|...| <Hook> do diagrama
 * usa fronteira de palavra de forma CORRETA:
 *
 *   - Rótulos hifenizados ('UPDATE-STATUS', 'DELETE-archive') DEVEM ser
 *     reconhecidos — o '-' é uma fronteira de palavra válida.
 *   - Substring dentro de palavra maior ('UPDATED', 'INSERTION', 'UNDELETE')
 *     NAO deve casar — evita falso positivo de evento parcial.
 *   - Tokens com underline ou colados ('UPDATE_status', 'INSERTrow') seguem a
 *     regra de \b: '_' conta como palavra (não casa), espaço/hífen casam.
 */
describe('parseEdgeEvents — robustez contra confusão de evento parcial', () => {
  describe('rótulos hifenizados sao reconhecidos', () => {
    it('UPDATE-STATUS conta como UPDATE', () => {
      const ev = parseEdgeEvents('UPDATE-STATUS');
      expect([...ev]).toEqual(['UPDATE']);
    });

    it('DELETE-archive conta como DELETE', () => {
      const ev = parseEdgeEvents('DELETE-archive');
      expect([...ev]).toEqual(['DELETE']);
    });

    it('INSERT-new-row conta como INSERT', () => {
      const ev = parseEdgeEvents('INSERT-new-row');
      expect([...ev]).toEqual(['INSERT']);
    });

    it('rotulo combinando varios eventos hifenizados', () => {
      const ev = parseEdgeEvents('INSERT-row UPDATE-status DELETE-soft');
      expect([...ev].sort()).toEqual(['DELETE', 'INSERT', 'UPDATE']);
    });

    it('rotulo com espaco descritivo continua funcionando', () => {
      expect([...parseEdgeEvents('UPDATE status')]).toEqual(['UPDATE']);
      expect([...parseEdgeEvents('INSERT KPIs')]).toEqual(['INSERT']);
      expect([...parseEdgeEvents('INSERT/UPDATE/DELETE')].sort()).toEqual([
        'DELETE',
        'INSERT',
        'UPDATE',
      ]);
    });
  });

  describe('substrings dentro de palavra maior NAO casam', () => {
    it('UPDATED nao deve ser interpretado como UPDATE', () => {
      expect([...parseEdgeEvents('UPDATED')]).toEqual([]);
    });

    it('INSERTION nao deve ser interpretado como INSERT', () => {
      expect([...parseEdgeEvents('INSERTION')]).toEqual([]);
    });

    it('UNDELETE nao deve ser interpretado como DELETE', () => {
      expect([...parseEdgeEvents('UNDELETE')]).toEqual([]);
    });

    it('PREUPDATE nao deve casar como UPDATE', () => {
      expect([...parseEdgeEvents('PREUPDATE')]).toEqual([]);
    });

    it('rotulo misto isola apenas o evento real', () => {
      // 'INSERTION' nao casa, mas 'UPDATE-status' casa.
      const ev = parseEdgeEvents('INSERTION + UPDATE-status');
      expect([...ev]).toEqual(['UPDATE']);
    });
  });

  describe('regras de fronteira do \\b', () => {
    it('UPDATE_status NAO casa (underscore conta como palavra)', () => {
      // Comportamento documentado: \b nao quebra em '_'. Se quisermos
      // suportar essa forma, e necessario mudar o parser.
      expect([...parseEdgeEvents('UPDATE_status')]).toEqual([]);
    });

    it('INSERTrow NAO casa (sem fronteira)', () => {
      expect([...parseEdgeEvents('INSERTrow')]).toEqual([]);
    });

    it('asterisco expande para todos os eventos', () => {
      expect([...parseEdgeEvents('*')].sort()).toEqual(['DELETE', 'INSERT', 'UPDATE']);
    });

    it('rotulo vazio retorna conjunto vazio', () => {
      expect([...parseEdgeEvents('')]).toEqual([]);
    });

    it('case sensitive — minusculas nao casam', () => {
      expect([...parseEdgeEvents('update-status')]).toEqual([]);
    });
  });

  describe('Unicode e acentos — comportamento documentado do \\b ASCII', () => {
    // O \b nativo do JS é ASCII-only: trata letras acentuadas, emojis, kanji,
    // travessões e NBSP como NÃO-palavra. Os testes abaixo congelam esse
    // comportamento. Se um dia o parser migrar para Unicode-aware, a falha
    // destes testes força revisão consciente.

    it('UPDATE-STATUS ÁREA reconhece UPDATE (texto descritivo acentuado é ignorado)', () => {
      expect([...parseEdgeEvents('UPDATE-STATUS ÁREA')]).toEqual(['UPDATE']);
    });

    it('"ÁREA UPDATE" reconhece UPDATE (acento à esquerda é fronteira)', () => {
      expect([...parseEdgeEvents('ÁREA UPDATE')]).toEqual(['UPDATE']);
    });

    it('"INSERT ção" reconhece INSERT (espaço normal antes de palavra acentuada)', () => {
      expect([...parseEdgeEvents('INSERT ção')]).toEqual(['INSERT']);
    });

    it('"café UPDATE" reconhece UPDATE (palavra ASCII isolada por espaço)', () => {
      expect([...parseEdgeEvents('café UPDATE')]).toEqual(['UPDATE']);
    });

    it('travessão em "INSERT—dado" reconhece INSERT (— é não-palavra)', () => {
      expect([...parseEdgeEvents('INSERT—dado')]).toEqual(['INSERT']);
    });

    it('NBSP em "UPDATE\\u00A0status" reconhece UPDATE', () => {
      expect([...parseEdgeEvents('UPDATE\u00A0status')]).toEqual(['UPDATE']);
    });

    it('TAB antes de palavra reconhece o evento', () => {
      expect([...parseEdgeEvents('INSERT\tlinha')]).toEqual(['INSERT']);
    });

    it('emojis ao redor são fronteira válida', () => {
      expect([...parseEdgeEvents('🚀 DELETE 🚀')]).toEqual(['DELETE']);
    });

    it('CJK ao redor é fronteira válida (não-palavra ASCII)', () => {
      expect([...parseEdgeEvents('日本 UPDATE 区')]).toEqual(['UPDATE']);
    });

    it('PEGADINHA documentada: "UPDATEÁ" casa UPDATE pois \\b é ASCII-only', () => {
      // Comportamento atual: o acento é não-palavra, então existe fronteira.
      // Em rótulos REAIS do diagrama isso não acontece (ver fixture snapshot),
      // mas o teste fica como aviso explícito caso alguém adote esse padrão.
      expect([...parseEdgeEvents('UPDATEÁ')]).toEqual(['UPDATE']);
      expect([...parseEdgeEvents('ÁUPDATE')]).toEqual(['UPDATE']);
    });

    it('letra ASCII colada continua NÃO casando ("UPDATEcafé" → vazio)', () => {
      // Garante que a pegadinha acima é específica de não-ASCII; colar letras
      // ASCII normais (a-z) ainda bloqueia o match como esperado.
      expect([...parseEdgeEvents('UPDATEcafé')]).toEqual([]);
    });

    it('combinação real plausível: "UPDATE status — ÁREA crítica"', () => {
      expect([...parseEdgeEvents('UPDATE status — ÁREA crítica')]).toEqual(['UPDATE']);
    });
  });
});

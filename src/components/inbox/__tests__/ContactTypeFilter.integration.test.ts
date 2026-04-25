/**
 * Integration tests — inbox filters & groupings on top of canonical JIDs.
 *
 * Garante que `FILTER_OPTIONS` + `filterByContactType` (usados pelo
 * `ConversationListSidebar`) classificam corretamente conversas cujos
 * `contact.phone` chegam em diferentes formatos:
 *   • JID individual `<digits>@s.whatsapp.net`
 *   • JID de grupo `<participant>-<ts>@g.us`
 *   • `status@broadcast`
 *   • `<list-id>@broadcast`
 *   • Telefone legado puro (sem sufixo)
 *   • Padrão legado de grupo `<participant>-<ts>` (sem sufixo)
 *
 * Cobre também a presença de `group_category` e `contact_type` nas variações.
 */
import { describe, it, expect } from 'vitest';
import {
  FILTER_OPTIONS,
  filterByContactType,
} from '@/components/inbox/ContactTypeFilter';
import type { ConversationWithMessages } from '@/hooks/useRealtimeMessages';
import {
  toIndividualJid,
  toGroupJid,
  isGroup,
  isStatus,
  isBroadcast,
} from '@/lib/jid';

// ---------- factories ----------

type Contact = ConversationWithMessages['contact'];

function makeConversation(
  id: string,
  phone: string,
  overrides: Partial<Contact> = {},
  unreadCount = 0,
): ConversationWithMessages {
  const contact = {
    id,
    name: id,
    phone,
    avatar: null,
    contact_type: 'cliente',
    group_category: null,
    ...overrides,
  } as unknown as Contact;

  return {
    contact,
    messages: [],
    lastMessage: null,
    unreadCount,
  } as unknown as ConversationWithMessages;
}

// ---------- fixtures ----------

const individualClient = makeConversation(
  'c1',
  toIndividualJid('5511988887777'), // 5511988887777@s.whatsapp.net
  { contact_type: 'cliente' },
  2,
);

const individualLegacyPhone = makeConversation(
  'c2',
  '5511977776666', // sem sufixo — formato legado
  { contact_type: 'colaborador' },
);

const supplier = makeConversation('c3', toIndividualJid('5511966665555'), {
  contact_type: 'fornecedor',
});

const transporter = makeConversation('c4', toIndividualJid('5511955554444'), {
  contact_type: 'transportadora',
});

const serviceProvider = makeConversation(
  'c5',
  toIndividualJid('5511944443333'),
  { contact_type: 'prestador_servico' },
);

const groupOrcamentos = makeConversation(
  'g1',
  toGroupJid('120363021111111111-1700000001'),
  { contact_type: null as unknown as string, group_category: 'orcamentos' },
  3,
);

const groupAprovacao = makeConversation(
  'g2',
  toGroupJid('120363022222222222-1700000002'),
  { contact_type: null as unknown as string, group_category: 'aprovacao' },
);

const groupOs = makeConversation(
  'g3',
  toGroupJid('120363033333333333-1700000003'),
  { contact_type: null as unknown as string, group_category: 'os' },
);

const groupAcerto = makeConversation(
  'g4',
  toGroupJid('120363044444444444-1700000004'),
  { contact_type: null as unknown as string, group_category: 'acerto' },
);

const groupNoCategory = makeConversation(
  'g5',
  toGroupJid('120363055555555555-1700000005'),
  { contact_type: null as unknown as string, group_category: null },
  1,
);

// padrão legado de grupo (sem sufixo @g.us): "<id>-<timestamp>"
const groupLegacyPattern = makeConversation(
  'g6',
  '120363066666666666-1700000006',
  { contact_type: null as unknown as string, group_category: 'orcamentos' },
);

const statusBroadcast = makeConversation('b1', 'status@broadcast', {
  contact_type: null as unknown as string,
});

const listBroadcast = makeConversation('b2', '5511900000000@broadcast', {
  contact_type: null as unknown as string,
});

const allConversations: ConversationWithMessages[] = [
  individualClient,
  individualLegacyPhone,
  supplier,
  transporter,
  serviceProvider,
  groupOrcamentos,
  groupAprovacao,
  groupOs,
  groupAcerto,
  groupNoCategory,
  groupLegacyPattern,
  statusBroadcast,
  listBroadcast,
];

// ---------- sanity: helpers de JID ----------

describe('canonical JID helpers — sanity para o cenário do inbox', () => {
  it('classifica corretamente cada fixture pelos helpers canônicos', () => {
    expect(isGroup(groupOrcamentos.contact.phone)).toBe(true);
    expect(isGroup(groupNoCategory.contact.phone)).toBe(true);
    expect(isGroup(individualClient.contact.phone)).toBe(false);
    expect(isStatus(statusBroadcast.contact.phone)).toBe(true);
    expect(isBroadcast(listBroadcast.contact.phone)).toBe(true);
    expect(isBroadcast(statusBroadcast.contact.phone)).toBe(true);
    // legado de grupo (sem sufixo) NÃO é detectado pelo canônico
    expect(isGroup(groupLegacyPattern.contact.phone)).toBe(false);
  });
});

/**
 * NOTA — comportamento atual do `ContactTypeFilter`:
 *
 * O fallback legado de grupo no `ContactTypeFilter` é
 *   `/^\d+-\d+$/.test(phone.replace(/\D/g, ''))`
 * Como `replace(/\D/g, '')` REMOVE o hífen, o regex nunca casa.
 * Portanto, na prática, somente JIDs `@g.us` são classificados como grupo.
 * Esses testes documentam esse comportamento real (não o pretendido).
 * Um teste sentinela explícito (`legacy fallback é dead code`) garante que,
 * se o fallback for corrigido, este teste falhe e nos force a re-categorizar
 * `groupLegacyPattern` em todas as suítes abaixo.
 */

// ---------- integração: filterByContactType ----------

describe('filterByContactType — agrupamentos do inbox', () => {
  it('retorna todas as conversas em "all" / null', () => {
    expect(filterByContactType(allConversations, null)).toHaveLength(
      allConversations.length,
    );
    expect(filterByContactType(allConversations, 'all')).toHaveLength(
      allConversations.length,
    );
  });

  it('sentinela: fallback legado de grupo é dead code (regex contra string sem hífen)', () => {
    // Se este teste falhar, o fallback foi corrigido — re-categorize
    // `groupLegacyPattern` como grupo nas suítes abaixo.
    const ids = filterByContactType(allConversations, 'grupo').map((c) => c.contact.id);
    expect(ids).not.toContain(groupLegacyPattern.contact.id);
  });

  it('"individual" exclui grupos canônicos (@g.us); broadcasts caem aqui no filtro atual', () => {
    const result = filterByContactType(allConversations, 'individual');
    const ids = result.map((c) => c.contact.id);

    // contém todos os 1:1
    expect(ids).toEqual(
      expect.arrayContaining([
        individualClient.contact.id,
        individualLegacyPhone.contact.id,
        supplier.contact.id,
        transporter.contact.id,
        serviceProvider.contact.id,
      ]),
    );

    // não contém nenhum grupo canônico
    expect(ids).not.toContain(groupOrcamentos.contact.id);
    expect(ids).not.toContain(groupNoCategory.contact.id);

    // status/broadcast NÃO são filtrados aqui — a defesa contra eles vive em
    // useRealtimeContacts/useIncomingCallBroadcast. Documentamos o comportamento.
    expect(ids).toEqual(
      expect.arrayContaining([
        statusBroadcast.contact.id,
        listBroadcast.contact.id,
        groupLegacyPattern.contact.id, // dead-code fallback
      ]),
    );

    // garantia mínima: nenhum @g.us escapa
    expect(result.every((c) => !isGroup(c.contact.phone))).toBe(true);
  });

  it('"grupo" inclui apenas grupos canônicos (@g.us)', () => {
    const ids = filterByContactType(allConversations, 'grupo').map(
      (c) => c.contact.id,
    );

    expect(ids).toEqual(
      expect.arrayContaining([
        groupOrcamentos.contact.id,
        groupAprovacao.contact.id,
        groupOs.contact.id,
        groupAcerto.contact.id,
        groupNoCategory.contact.id,
      ]),
    );

    // não vaza individual / broadcast / legado-sem-sufixo
    expect(ids).not.toContain(individualClient.contact.id);
    expect(ids).not.toContain(statusBroadcast.contact.id);
    expect(ids).not.toContain(listBroadcast.contact.id);
    expect(ids).not.toContain(groupLegacyPattern.contact.id);
  });

  it('subfiltros de categoria isolam corretamente cada grupo', () => {
    const cases: Array<[string, ConversationWithMessages]> = [
      ['grupo_orcamentos', groupOrcamentos],
      ['grupo_aprovacao', groupAprovacao],
      ['grupo_os', groupOs],
      ['grupo_acerto', groupAcerto],
    ];

    for (const [filterValue, expected] of cases) {
      const result = filterByContactType(allConversations, filterValue);
      // O legado também tem group_category 'orcamentos', então grupo_orcamentos retorna 2.
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.map((c) => c.contact.id)).toContain(expected.contact.id);
      // todos os retornados devem ser realmente grupos
      expect(result.every((c) => {
        const p = c.contact.phone || '';
        return p.endsWith('@g.us') || /^\d+-\d+$/.test(p.replace(/\D/g, ''));
      })).toBe(true);
    }
  });

  it('"grupo_sem_categoria" pega apenas grupos sem group_category', () => {
    const ids = filterByContactType(allConversations, 'grupo_sem_categoria').map(
      (c) => c.contact.id,
    );
    expect(ids).toEqual([groupNoCategory.contact.id]);
  });

  it('subfiltros de tipo de contato (cliente/colaborador/etc.) excluem grupos', () => {
    const cases: Array<[string, string]> = [
      ['cliente', individualClient.contact.id],
      ['colaborador', individualLegacyPhone.contact.id],
      ['fornecedor', supplier.contact.id],
      ['prestador_servico', serviceProvider.contact.id],
      ['transportadora', transporter.contact.id],
    ];

    for (const [filterValue, expectedId] of cases) {
      const result = filterByContactType(allConversations, filterValue);
      const ids = result.map((c) => c.contact.id);
      expect(ids).toContain(expectedId);
      // nenhum grupo aparece em filtros de tipo
      expect(result.every((c) => !isGroup(c.contact.phone))).toBe(true);
    }
  });

  it('filtros desconhecidos retornam a lista intacta (degradação suave)', () => {
    const result = filterByContactType(allConversations, 'filtro_inexistente');
    expect(result).toHaveLength(allConversations.length);
  });

  it('todos os FILTER_OPTIONS são funções match estáveis (não lançam para fixtures variadas)', () => {
    for (const opt of FILTER_OPTIONS) {
      for (const conv of allConversations) {
        expect(() => opt.match(conv)).not.toThrow();
      }
    }
  });
});

// ---------- contagem agregada (espelha o badge do dropdown) ----------

describe('contagem por filtro — espelho do que o dropdown mostra', () => {
  it('soma counts e unread coerentes com as fixtures', () => {
    const get = (v: string) => filterByContactType(allConversations, v);

    expect(get('individual')).toHaveLength(5);
    expect(get('grupo')).toHaveLength(6); // 5 canônicos + 1 legado
    expect(get('grupo_orcamentos')).toHaveLength(2); // canônico + legado
    expect(get('grupo_sem_categoria')).toHaveLength(1);
    expect(get('cliente')).toHaveLength(1);

    // unread agregado em 'grupo' inclui groupOrcamentos (3) + groupNoCategory (1)
    const unreadInGroups = get('grupo').reduce(
      (acc, c) => acc + (c.unreadCount > 0 ? 1 : 0),
      0,
    );
    expect(unreadInGroups).toBe(2);
  });
});

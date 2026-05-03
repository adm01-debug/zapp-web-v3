/**
 * contactsDB.test.ts — Tests for the contacts bridge layer
 *
 * These tests verify that contactsDB operations call the EXTERNAL
 * Supabase client (not the Lovable Cloud one).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external client module
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockMaybeSingle = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockOr = vi.fn();
const mockRange = vi.fn();
const mockSingle = vi.fn();
const mockIlike = vi.fn();

const chainMock = {
  select: mockSelect,
  eq: mockEq,
  is: mockIs,
  maybeSingle: mockMaybeSingle,
  order: mockOrder,
  limit: mockLimit,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  or: mockOr,
  range: mockRange,
  single: mockSingle,
  ilike: mockIlike,
};

// Each method returns chainMock for chaining
Object.values(chainMock).forEach(fn => fn.mockReturnValue(chainMock));

const mockExternalClient = {
  from: mockFrom.mockReturnValue(chainMock),
};

vi.mock('@/integrations/supabase/externalClient', () => ({
  getExternalSupabase: () => mockExternalClient,
  isExternalConfigured: true,
}));

import { contactsDB } from '@/lib/contactsDB';

describe('contactsDB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(chainMock);
    Object.values(chainMock).forEach(fn => fn.mockReturnValue(chainMock));
  });

  describe('isConfigured', () => {
    it('returns true when external DB is configured', () => {
      expect(contactsDB.isConfigured).toBe(true);
    });
  });

  describe('getById', () => {
    it('queries the contacts table on external DB', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: '123', first_name: 'Jo\u00e3o' }, error: null });

      const result = await contactsDB.getById('123');

      expect(mockFrom).toHaveBeenCalledWith('contacts');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });
  });

  describe('findByPhone', () => {
    it('rejects phones shorter than 8 digits', async () => {
      const result = await contactsDB.findByPhone('1234');
      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('cleans non-digit characters before searching', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await contactsDB.findByPhone('+55 (11) 99999-1234');

      expect(mockFrom).toHaveBeenCalledWith('contacts');
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('55119999912')
      );
    });
  });

  describe('update', () => {
    it('calls update on external contacts table', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: '123', first_name: 'Updated' }, error: null });

      await contactsDB.update('123', { first_name: 'Updated' } as any);

      expect(mockFrom).toHaveBeenCalledWith('contacts');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: 'Updated' })
      );
      expect(mockEq).toHaveBeenCalledWith('id', '123');
    });
  });

  describe('search', () => {
    it('returns empty for empty query', async () => {
      const result = await contactsDB.search('');
      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('searches across multiple fields', async () => {
      mockLimit.mockResolvedValueOnce({ data: [{ id: '1' }], error: null });

      await contactsDB.search('Jo\u00e3o');

      expect(mockFrom).toHaveBeenCalledWith('contacts');
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('full_name.ilike')
      );
    });
  });

  describe('notes', () => {
    it('lists notes from external contact_notes table', async () => {
      mockLimit.mockResolvedValueOnce({ data: [{ id: 'n1', content: 'test' }], error: null });

      await contactsDB.notes.list('contact-123');

      expect(mockFrom).toHaveBeenCalledWith('contact_notes');
      expect(mockEq).toHaveBeenCalledWith('contact_id', 'contact-123');
    });

    it('creates note on external DB', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'n1' }, error: null });

      await contactsDB.notes.create({
        contact_id: 'c1',
        user_id: 'u1',
        content: 'Test note',
      });

      expect(mockFrom).toHaveBeenCalledWith('contact_notes');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Test note' })
      );
    });

    it('deletes note from external DB', async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      await contactsDB.notes.delete('note-123');

      expect(mockFrom).toHaveBeenCalledWith('contact_notes');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'note-123');
    });
  });

  describe('duplicates', () => {
    it('finds similar contacts by phone suffix', async () => {
      mockLimit.mockResolvedValueOnce({ data: [{ id: 'dup1' }], error: null });

      await contactsDB.duplicates.findSimilar('5511999991234', 'Jo\u00e3o', 5);

      expect(mockFrom).toHaveBeenCalledWith('contacts');
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('phone.ilike')
      );
    });

    it('returns empty when no phone and no name', async () => {
      const result = await contactsDB.duplicates.findSimilar('', '', 5);
      expect(result).toEqual([]);
    });
  });
});

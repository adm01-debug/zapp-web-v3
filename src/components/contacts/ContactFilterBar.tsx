/**
 * ContactFilterBar.tsx
 * Advanced filter bar for the contacts list.
 * Supports: text search, tags, channel, sort field/order, date range.
 * All filters are debounced and server-side via useContactsPagination.
 */
import React, { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ContactFilters {
  search:    string;
  tags:      string[];
  channel:   string | null;
  sortField: 'name' | 'created_at' | 'last_seen_at';
  sortOrder: 'asc' | 'desc';
}

interface ContactFilterBarProps {
  filters:           ContactFilters;
  onFiltersChange:   (updates: Partial<ContactFilters>) => void;
  availableTags?:    string[];
  totalContacts?:    number;
  className?:        string;
}

const CHANNEL_OPTIONS = [
  { value: 'whatsapp',  label: '💬 WhatsApp' },
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'telegram',  label: '✈️ Telegram' },
  { value: 'messenger', label: '💙 Messenger' },
  { value: 'email',     label: '📧 E-mail' },
];

const SORT_OPTIONS = [
  { value: 'last_seen_at:desc', label: 'Último contato (recente)' },
  { value: 'last_seen_at:asc',  label: 'Último contato (antigo)' },
  { value: 'name:asc',          label: 'Nome A → Z' },
  { value: 'name:desc',         label: 'Nome Z → A' },
  { value: 'created_at:desc',   label: 'Criado (recente)' },
  { value: 'created_at:asc',    label: 'Criado (antigo)' },
];

// ── Component ──────────────────────────────────────────────────────────────

export const ContactFilterBar: React.FC<ContactFilterBarProps> = ({
  filters, onFiltersChange, availableTags = [], totalContacts, className,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ search: value });
    }, 400);
  }, [onFiltersChange]);

  const clearSearch = () => {
    setSearchInput('');
    onFiltersChange({ search: '' });
  };

  const toggleTag = (tag: string) => {
    const current = filters.tags;
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    onFiltersChange({ tags: next });
  };

  const handleSortChange = (value: string) => {
    const [sortField, sortOrder] = value.split(':') as [ContactFilters['sortField'], ContactFilters['sortOrder']];
    onFiltersChange({ sortField, sortOrder });
  };

  const hasActiveFilters = filters.tags.length > 0 || !!filters.channel;
  const currentSort = `${filters.sortField}:${filters.sortOrder}`;

  const clearAll = () => {
    setSearchInput('');
    onFiltersChange({ search: '', tags: [], channel: null });
  };

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {/* Main row: search + sort + filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, telefone, e-mail..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={currentSort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-48 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={hasActiveFilters ? 'default' : 'outline'}
          size="icon"
          onClick={() => setShowFilters((v) => !v)}
          className="shrink-0 relative"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
          )}
        </Button>
      </div>

      {/* Active filter chips */}
      {(filters.tags.length > 0 || filters.channel) && (
        <div className="flex flex-wrap gap-1 items-center">
          {filters.channel && (
            <Badge variant="secondary" className="gap-1">
              {CHANNEL_OPTIONS.find((c) => c.value === filters.channel)?.label ?? filters.channel}
              <button type="button" onClick={() => onFiltersChange({ channel: null })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button type="button" onClick={() => toggleTag(tag)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button type="button" onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">
            Limpar tudo
          </button>
        </div>
      )}

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
          {/* Channel filter */}
          <div>
            <p className="text-xs font-medium mb-2">Canal</p>
            <div className="flex flex-wrap gap-1">
              {CHANNEL_OPTIONS.map((ch) => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => onFiltersChange({ channel: filters.channel === ch.value ? null : ch.value })}
                  className={`text-xs rounded-full border px-2 py-0.5 transition-colors ${
                    filters.channel === ch.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tag filter */}
          {availableTags.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Tags</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs rounded-full border px-2 py-0.5 transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Result count */}
      {totalContacts !== undefined && (
        <p className="text-xs text-muted-foreground">
          {totalContacts.toLocaleString('pt-BR')} contato{totalContacts !== 1 ? 's' : ''}
          {(filters.search || hasActiveFilters) ? ' encontrado' + (totalContacts !== 1 ? 's' : '') : ' no total'}
        </p>
      )}
    </div>
  );
};

export default ContactFilterBar;

/**
 * ContactExportDialog.tsx
 * Export contacts to CSV with column picker and filter respect.
 * Uses safe CSV export (CSV injection prevention).
 */
import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { exportContactsToCsv, ContactExportRow } from '@/lib/csvUtils';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';

// ── Column definitions ─────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { key: 'name',           label: 'Nome',              default: true },
  { key: 'phone',          label: 'Telefone',          default: true },
  { key: 'email',          label: 'E-mail',            default: true },
  { key: 'company',        label: 'Empresa',           default: true },
  { key: 'tags',           label: 'Tags',              default: true },
  { key: 'channel',        label: 'Canal',             default: false },
  { key: 'notes',          label: 'Notas',             default: false },
  { key: 'created_at',     label: 'Criado em',         default: false },
  { key: 'last_seen_at',   label: 'Último contato',    default: true },
  { key: 'lgpd_consent_at','label':'Consentimento LGPD',default: false },
] as const;

type ExportColumnKey = typeof EXPORT_COLUMNS[number]['key'];

interface ContactExportDialogProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId:  string;
  activeFilters?: {
    search:  string;
    tags:    string[];
    channel: string | null;
  };
  selectedIds?: string[]; // optional: export only selected contacts
}

// ── Component ──────────────────────────────────────────────────────────────

export const ContactExportDialog: React.FC<ContactExportDialogProps> = ({
  open, onOpenChange, workspaceId, activeFilters, selectedIds,
}) => {
  const { toast } = useToast();
  const [loading,  setLoading]  = useState(false);
  const [columns,  setColumns]  = useState<Set<ExportColumnKey>>(
    new Set(EXPORT_COLUMNS.filter((c) => c.default).map((c) => c.key))
  );

  const toggleColumn = (key: ExportColumnKey) => {
    setColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from('contacts')
        .select('id,name,phone,email,company,tags,channel,notes,created_at,last_seen_at,lgpd_consent_at')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .limit(100_000);

      // Apply filters if no specific IDs selected
      if (selectedIds && selectedIds.length > 0) {
        query = query.in('id', selectedIds);
      } else {
        if (activeFilters?.channel) {
          query = query.eq('channel', activeFilters.channel);
        }
        if (activeFilters?.tags && activeFilters.tags.length > 0) {
          query = query.overlaps('tags', activeFilters.tags);
        }
        if (activeFilters?.search?.trim()) {
          const s = activeFilters.search.trim();
          query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows: ContactExportRow[] = (data ?? []).map((c) => ({
        name:           sanitizeText(c.name),
        phone:          c.phone ? formatPhoneForDisplay(c.phone) : '',
        email:          sanitizeText(c.email ?? ''),
        company:        sanitizeText(c.company ?? ''),
        tags:           Array.isArray(c.tags) ? c.tags.map(sanitizeText).join(', ') : '',
        channel:        sanitizeText(c.channel ?? ''),
        notes:          sanitizeText(c.notes ?? ''),
        created_at:     c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '',
        last_seen_at:   c.last_seen_at ? new Date(c.last_seen_at).toLocaleDateString('pt-BR') : '',
        lgpd_consent_at: c.lgpd_consent_at ? new Date(c.lgpd_consent_at).toLocaleDateString('pt-BR') : 'Sem consentimento',
      }));

      exportContactsToCsv(rows);

      toast({
        title: '✅ Export concluído!',
        description: `${rows.length.toLocaleString('pt-BR')} contato${rows.length !== 1 ? 's' : ''} exportado${rows.length !== 1 ? 's' : ''}.`,
        duration: 4_000,
      });
      onOpenChange(false);
    } catch (err) {
      console.error('[ContactExportDialog]', err);
      toast({ title: 'Erro ao exportar', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Contatos
          </DialogTitle>
          <DialogDescription>
            {selectedIds && selectedIds.length > 0
              ? `Exportar ${selectedIds.length} contato${selectedIds.length !== 1 ? 's' : ''} selecionado${selectedIds.length !== 1 ? 's' : ''}.`
              : activeFilters && (activeFilters.search || activeFilters.tags.length > 0 || activeFilters.channel)
              ? 'Exportar contatos do filtro ativo.'
              : 'Exportar todos os contatos ativos.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Selecionar colunas
          </p>
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_COLUMNS.map((col) => (
              <div key={col.key} className="flex items-center gap-2">
                <Checkbox
                  id={col.key}
                  checked={columns.has(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                />
                <Label htmlFor={col.key} className="text-sm cursor-pointer">{col.label}</Label>
              </div>
            ))}
          </div>

          <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
            💡 O arquivo será salvo em CSV com codificação UTF-8 compatível com Excel.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading || columns.size === 0} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactExportDialog;

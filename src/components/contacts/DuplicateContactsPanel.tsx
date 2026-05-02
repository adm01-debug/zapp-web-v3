/**
 * DuplicateContactsPanel.tsx
 * Bulk duplicate detection and one-click merge panel.
 * Scans workspace for contacts sharing the same phone number.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, GitMerge, RefreshCw, CheckCircle2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import ContactMergeDialog, { ContactForMerge } from './ContactMergeDialog';

interface DuplicateGroup {
  phone_normalized: string;
  contact_ids:      string[];
  contact_names:    string[];
}

interface DuplicateContactsPanelProps {
  workspaceId:     string;
  onMergeComplete?: () => void;
}

export const DuplicateContactsPanel: React.FC<DuplicateContactsPanelProps> = ({
  workspaceId, onMergeComplete,
}) => {
  const [groups,   setGroups]   = useState<DuplicateGroup[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [merging,  setMerging]  = useState<string | null>(null);
  const [open,     setOpen]     = useState(false);
  const [primary,  setPrimary]  = useState<ContactForMerge | null>(null);
  const [secondary,setSecondary]= useState<ContactForMerge | null>(null);

  const scan = useCallback(async () => {
    setLoading(true); setDone(false);
    try {
      const { data, error } = await supabase.rpc('find_duplicate_contacts', {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;
      setGroups((data as DuplicateGroup[]) ?? []);
      setDone(true);
    } catch (e) { console.error('[DuplicateContactsPanel]', e); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { scan(); }, [scan]);

  const openMerge = async (group: DuplicateGroup) => {
    setMerging(group.phone_normalized);
    try {
      const { data } = await supabase
        .from('contacts')
        .select('id,name,phone,email,company,tags,channel,avatar_url,created_at,notes,lgpd_consent_at')
        .in('id', group.contact_ids.slice(0, 2))
        .is('deleted_at', null);
      if (data && data.length >= 2) {
        setPrimary(data[0] as ContactForMerge);
        setSecondary(data[1] as ContactForMerge);
        setOpen(true);
      }
    } finally { setMerging(null); }
  };

  const afterMerge = () => {
    setGroups((prev) => prev.filter(
      (g) => !(g.contact_ids.includes(primary?.id ?? '') && g.contact_ids.includes(secondary?.id ?? ''))
    ));
    onMergeComplete?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Contatos Duplicados</span>
          {groups.length > 0 && <Badge variant="destructive">{groups.length}</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={scan} disabled={loading} className="gap-1">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Verificando...' : 'Verificar'}
        </Button>
      </div>

      {done && groups.length === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-sm text-green-800">✅ Nenhum duplicado!</AlertTitle>
          <AlertDescription className="text-xs text-green-700">Todos os contatos têm números únicos.</AlertDescription>
        </Alert>
      )}

      {groups.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-sm text-amber-800">{groups.length} grupo(s) com número repetido</AlertTitle>
          <AlertDescription className="text-xs text-amber-700">Mescle para unificar o histórico.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.phone_normalized} className="rounded-lg border p-3 flex items-center justify-between gap-2 hover:bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground">
                Telefone: <span className="font-mono text-foreground">{formatPhoneForDisplay(g.phone_normalized)}</span>
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {g.contact_names.map((n) => (
                  <Badge key={n} variant="outline" className="text-xs">{sanitizeText(n)}</Badge>
                ))}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => openMerge(g)} disabled={merging === g.phone_normalized} className="shrink-0 gap-1">
              {merging === g.phone_normalized
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <GitMerge className="h-3.5 w-3.5" />}
              Mesclar
            </Button>
          </div>
        ))}
      </div>

      {primary && secondary && (
        <ContactMergeDialog open={open} onOpenChange={setOpen} primaryContact={primary} secondaryContact={secondary} onMergeComplete={afterMerge} />
      )}
    </div>
  );
};

export default DuplicateContactsPanel;

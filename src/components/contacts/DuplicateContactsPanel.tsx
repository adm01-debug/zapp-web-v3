/**
 * DuplicateContactsPanel.tsx — v2.0
 * Duplicate detection panel using find_duplicate_contacts() RPC.
 * Adapted for evolution_contacts schema.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, GitMerge, RefreshCw, CheckCircle2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';

interface DuplicateGroup {
  phone_normalized: string;
  contact_ids:      string[];
  contact_names:    string[];
  contact_count:    number;
}

interface DuplicateContactsPanelProps {
  workspaceId:     string; // maps to instance_name
  onMergeComplete?: () => void;
}

export const DuplicateContactsPanel: React.FC<DuplicateContactsPanelProps> = ({
  workspaceId: instanceName, onMergeComplete,
}) => {
  const { toast } = useToast();
  const [groups,    setGroups]    = useState<DuplicateGroup[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [merging,   setMerging]   = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true); setDone(false);
    try {
      const { data, error } = await supabase.rpc('find_duplicate_contacts', {
        p_instance_name: instanceName,
        p_limit: 100,
      });
      if (error) throw error;
      setGroups((data as DuplicateGroup[]) ?? []);
      setDone(true);
    } catch (err) {
      console.error('[DuplicateContactsPanel]', err);
      toast({ title: 'Erro ao verificar duplicatas', description: String(err), variant: 'destructive' });
    } finally { setLoading(false); }
  }, [instanceName, toast]);

  useEffect(() => { scan(); }, [scan]);

  const mergeGroup = async (group: DuplicateGroup) => {
    if (group.contact_ids.length < 2) return;
    setMerging(group.phone_normalized);
    try {
      // Primary = oldest (first created), secondary = second
      const { data, error } = await supabase.rpc('merge_contacts', {
        p_primary_id:   group.contact_ids[0],
        p_secondary_id: group.contact_ids[1],
        p_merged_fields: {},
      });
      if (error) throw error;
      const result = data as Record<string, unknown>;
      if (result?.error) throw new Error(String(result.error));

      setGroups((prev) => prev.filter((g) => g.phone_normalized !== group.phone_normalized));
      toast({ title: '🔀 Contatos mesclados!', description: `"${group.contact_names[0]}" foi unificado.`, duration: 3_000 });
      onMergeComplete?.();
    } catch (err) {
      toast({ title: 'Erro ao mesclar', description: String(err), variant: 'destructive' });
    } finally { setMerging(null); }
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
          <AlertDescription className="text-xs text-green-700">
            Todos os contatos têm números de telefone únicos.
          </AlertDescription>
        </Alert>
      )}

      {groups.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-sm text-amber-800">
            {groups.length} grupo{groups.length !== 1 ? 's' : ''} com número repetido
          </AlertTitle>
          <AlertDescription className="text-xs text-amber-700">
            Mescle para unificar histórico de conversas e dados.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.phone_normalized} className="rounded-lg border p-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Número: <span className="font-mono text-foreground">{formatPhoneForDisplay(g.phone_normalized)}</span>
                <span className="ml-2 text-amber-600">({g.contact_count} contatos)</span>
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {g.contact_names.map((name) => (
                  <Badge key={name} variant="outline" className="text-xs">{sanitizeText(name)}</Badge>
                ))}
              </div>
            </div>
            <Button
              size="sm" variant="outline"
              onClick={() => mergeGroup(g)}
              disabled={merging === g.phone_normalized}
              className="shrink-0 gap-1"
            >
              {merging === g.phone_normalized
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <GitMerge className="h-3.5 w-3.5" />}
              Mesclar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DuplicateContactsPanel;

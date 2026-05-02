/**
 * ContactBitrix24Panel.tsx
 * Bitrix24 CRM integration panel for the contact sidebar.
 * Solves Gap #10: No Bitrix24 data visible in the chat.
 *
 * Shows active deals, last activities, and company info from Bitrix24.
 */
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Briefcase, DollarSign, Loader2, RefreshCw, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

interface Bitrix24Deal {
  id: string;
  title: string;
  stage: string;
  amount: number | null;
  currency: string;
  assigned_to: string | null;
  created_at: string;
}

interface Bitrix24ContactData {
  bitrix_id: string | null;
  company_name: string | null;
  deals: Bitrix24Deal[];
  last_activity: string | null;
}

interface ContactBitrix24PanelProps {
  contactId: string;
  workspaceId: string;
  contactPhone: string | null;
  contactEmail: string | null;
}

export const ContactBitrix24Panel: React.FC<ContactBitrix24PanelProps> = ({
  contactId, workspaceId, contactPhone, contactEmail,
}) => {
  const [data, setData] = useState<Bitrix24ContactData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBitrixData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('bitrix24-contact-lookup', {
        body: {
          contact_id: contactId,
          workspace_id: workspaceId,
          phone: contactPhone,
          email: contactEmail,
        },
      });
      if (fnError) throw fnError;
      setData(result as Bitrix24ContactData);
    } catch (err) {
      setError('Bitrix24 indispon\u00edvel');
      console.warn('[Bitrix24Panel] Lookup failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contactPhone || contactEmail) fetchBitrixData();
  }, [contactId]);

  if (!contactPhone && !contactEmail) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Buscando dados Bitrix24...
      </div>
    );
  }
  if (error || !data) return null;
  if (!data.bitrix_id && data.deals.length === 0) return null;

  return (
    <div className="space-y-2" role="region" aria-label="Dados Bitrix24">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <Briefcase className="h-3 w-3" /> Bitrix24 CRM
        </p>
        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={fetchBitrixData} aria-label="Atualizar Bitrix24">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {data.company_name && (
        <div className="flex items-center gap-1.5 text-xs">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{sanitizeText(data.company_name)}</span>
        </div>
      )}

      {data.deals.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Neg\u00f3cios Ativos</p>
          {data.deals.slice(0, 5).map((deal) => (
            <div key={deal.id} className="bg-muted/20 rounded p-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{sanitizeText(deal.title)}</span>
                <Badge variant="outline" className="text-[10px] px-1">{deal.stage}</Badge>
              </div>
              {deal.amount && (
                <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span>{deal.amount.toLocaleString('pt-BR', { style: 'currency', currency: deal.currency || 'BRL' })}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data.bitrix_id && (
        <a
          href={`https://promobrindes.bitrix24.com.br/crm/contact/details/${data.bitrix_id}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> Abrir no Bitrix24
        </a>
      )}
    </div>
  );
};

export default ContactBitrix24Panel;

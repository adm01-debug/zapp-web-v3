/**
 * ContactDuplicateIndicator.tsx
 * Cross-channel duplicate detection indicator for the chat sidebar.
 * Solves Gap #14: No indication of possible duplicates in the chat panel.
 */
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, GitMerge, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { dbFrom } from '@/integrations/datasource/db';

interface DuplicateCandidate {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  channel: string | null;
  similarity_score: number;
}

interface ContactDuplicateIndicatorProps {
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  workspaceId: string;
  onMerge?: (duplicateId: string) => void;
}

export const ContactDuplicateIndicator: React.FC<ContactDuplicateIndicatorProps> = ({
  contactId, contactName, contactPhone, contactEmail, workspaceId, onMerge,
}) => {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const findDuplicates = async () => {
      if (!contactPhone && !contactEmail) return;
      setIsLoading(true);
      try {
        let query = dbFrom('contacts')
          .select('id, name, phone, email, channel')
          .eq('workspace_id', workspaceId)
          .neq('id', contactId)
          .is('deleted_at', null)
          .limit(5);

        // Search by normalized phone OR email
        const conditions: string[] = [];
        if (contactPhone) {
          const digits = contactPhone.replace(/\D/g, '');
          const last8 = digits.slice(-8);
          conditions.push(`phone.ilike.%${last8}%`);
        }
        if (contactEmail) {
          conditions.push(`email.eq.${contactEmail}`);
        }
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }

        const { data, error } = await query;
        if (error) throw error;

        const candidates: DuplicateCandidate[] = (data ?? []).map((d) => ({
          ...d,
          similarity_score: calculateSimilarity(contactName, contactPhone, contactEmail, d),
        })).filter((d) => d.similarity_score > 0.3)
          .sort((a, b) => b.similarity_score - a.similarity_score);

        setDuplicates(candidates);
      } catch (err) {
        console.error('[DuplicateIndicator] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    findDuplicates();
  }, [contactId, contactName, contactPhone, contactEmail, workspaceId]);

  if (isLoading || duplicates.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-2" role="alert" aria-label="Poss\u00edveis contatos duplicados">
      <div className="flex items-center gap-1.5">
        <Copy className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
          {duplicates.length} poss\u00edve{duplicates.length === 1 ? 'l' : 'is'} duplicata{duplicates.length === 1 ? '' : 's'}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-amber-600 hover:underline ml-auto"
        >
          {expanded ? 'Ocultar' : 'Ver'}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {duplicates.map((dup) => (
            <div key={dup.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded p-1.5 text-xs">
              <div className="min-w-0">
                <p className="font-medium truncate">{sanitizeText(dup.name)}</p>
                <p className="text-muted-foreground truncate">
                  {dup.phone ?? dup.email ?? 'Sem contato'}
                  {dup.channel && ` · ${dup.channel}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {Math.round(dup.similarity_score * 100)}%
                </Badge>
                {onMerge && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMerge(dup.id)} aria-label="Mesclar contatos">
                    <GitMerge className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function calculateSimilarity(
  name: string, phone: string | null, email: string | null,
  candidate: { name: string; phone: string | null; email: string | null }
): number {
  let score = 0;
  if (email && candidate.email && email.toLowerCase() === candidate.email.toLowerCase()) score += 0.5;
  if (phone && candidate.phone) {
    const d1 = phone.replace(/\D/g, '').slice(-8);
    const d2 = candidate.phone.replace(/\D/g, '').slice(-8);
    if (d1 === d2) score += 0.4;
  }
  const nameSim = jaroWinkler(name.toLowerCase(), candidate.name.toLowerCase());
  score += nameSim * 0.3;
  return Math.min(score, 1);
}

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  const window = Math.floor(maxLen / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  let matches = 0, transpositions = 0;
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true; s2Matches[j] = true; matches++; break;
    }
  }
  if (matches === 0) return 0;
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++; else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

export default ContactDuplicateIndicator;

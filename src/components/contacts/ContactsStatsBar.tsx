/**
 * ContactsStatsBar.tsx
 * Header stats bar for the contacts view.
 * Shows key metrics at a glance with alert indicators.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, AlertTriangle, Cake, Trash2 } from 'lucide-react';
import { useContactsStats } from './useContactsStats';
import { Skeleton } from '@/components/ui/skeleton';

interface ContactsStatsBarProps {
  workspaceId: string;
  onClickNoConsent?: () => void;
  onClickBirthdays?: () => void;
  onClickRecycleBin?: () => void;
}

export const ContactsStatsBar: React.FC<ContactsStatsBarProps> = ({
  workspaceId,
  onClickNoConsent,
  onClickBirthdays,
  onClickRecycleBin,
}) => {
  const { stats, loading } = useContactsStats(workspaceId);

  if (loading && !stats) {
    return (
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/20 text-xs">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-[90px]" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/20 text-xs flex-wrap">
        {/* Total contacts */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{stats.total.toLocaleString('pt-BR')}</span>
          <span>contato{stats.total !== 1 ? 's' : ''}</span>
        </div>

        {/* No LGPD consent — alert */}
        {stats.noConsent > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onClickNoConsent}
                className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                aria-label={`${stats.noConsent} contatos sem consentimento LGPD`}
              >
                <Badge
                  variant="outline"
                  className="gap-1 py-0 text-xs border-amber-400 text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {stats.noConsent} sem LGPD
                </Badge>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {stats.noConsent} contato{stats.noConsent !== 1 ? 's' : ''} sem consentimento LGPD registrado.
              Clique para filtrar.
            </TooltipContent>
          </Tooltip>
        )}

        {/* Birthdays today */}
        {stats.birthdayToday > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onClickBirthdays}
                className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                aria-label={`${stats.birthdayToday} aniversariantes hoje`}
              >
                <Badge
                  variant="outline"
                  className="gap-1 py-0 text-xs border-pink-400 text-pink-700 bg-pink-50 dark:text-pink-300 dark:bg-pink-950/40"
                >
                  <Cake className="h-3 w-3" />
                  {stats.birthdayToday} aniversário{stats.birthdayToday !== 1 ? 's' : ''} hoje
                </Badge>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {stats.birthdayToday} contato{stats.birthdayToday !== 1 ? 's fazem' : ' faz'} aniversário hoje!
            </TooltipContent>
          </Tooltip>
        )}

        {/* Recycle bin pending */}
        {stats.deletedPending > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onClickRecycleBin}
                className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                aria-label={`${stats.deletedPending} contatos na lixeira`}
              >
                <Badge
                  variant="outline"
                  className="gap-1 py-0 text-xs border-slate-400 text-slate-600 bg-slate-50 dark:text-slate-300 dark:bg-slate-900/40"
                >
                  <Trash2 className="h-3 w-3" />
                  {stats.deletedPending} na lixeira
                </Badge>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {stats.deletedPending} contato{stats.deletedPending !== 1 ? 's' : ''} aguardando purga permanente.
              Clique para abrir a lixeira.
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ContactsStatsBar;

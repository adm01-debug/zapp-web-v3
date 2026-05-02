/**
 * ContactOrphanState.tsx
 * Empty state for conversations without an identified contact.
 * Solves Gap #13: Panel crashes or shows empty for orphan contacts.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Link2, AlertCircle } from 'lucide-react';

interface ContactOrphanStateProps {
  remoteJid?: string;
  channel?: string;
  onCreateContact?: () => void;
  onLinkContact?: () => void;
}

export const ContactOrphanState: React.FC<ContactOrphanStateProps> = ({
  remoteJid, channel, onCreateContact, onLinkContact,
}) => (
  <div className="flex flex-col items-center justify-center p-6 text-center gap-3 h-full min-h-[200px]" role="status" aria-label="Contato não identificado">
    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
      <AlertCircle className="h-6 w-6 text-muted-foreground" />
    </div>
    <div>
      <h4 className="font-medium text-sm">Contato não identificado</h4>
      <p className="text-xs text-muted-foreground mt-1">
        {remoteJid ? `Número: ${remoteJid}` : 'Este contato ainda não está cadastrado.'}
      </p>
      {channel && <p className="text-xs text-muted-foreground">Canal: {channel}</p>}
    </div>
    <div className="flex gap-2 mt-2">
      {onCreateContact && (
        <Button size="sm" onClick={onCreateContact} className="gap-1.5 text-xs">
          <UserPlus className="h-3.5 w-3.5" /> Criar Contato
        </Button>
      )}
      {onLinkContact && (
        <Button size="sm" variant="outline" onClick={onLinkContact} className="gap-1.5 text-xs">
          <Link2 className="h-3.5 w-3.5" /> Vincular Existente
        </Button>
      )}
    </div>
  </div>
);

export default ContactOrphanState;

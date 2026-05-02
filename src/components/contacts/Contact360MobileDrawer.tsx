/**
 * Contact360MobileDrawer.tsx
 * Mobile-responsive drawer wrapper for Contact360Panel.
 * Solves Gap #17: No responsive mobile layout for contact panel.
 *
 * On desktop (>= 768px): renders as a standard sidebar panel.
 * On mobile (< 768px): renders as a bottom sheet / drawer overlay.
 */
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { Contact360Panel, Contact360Data } from './Contact360Panel';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface Contact360MobileDrawerProps {
  contact: Contact360Data | null;
  workspaceId: string;
  readonly?: boolean;
  isLoading?: boolean;
  onEdit?: () => void;
  remoteJid?: string;
  onCreateContact?: () => void;
  onLinkContact?: () => void;
  onOpenConversation?: (id: string) => void;
  onMergeContact?: (id: string) => void;
}

export const Contact360MobileDrawer: React.FC<Contact360MobileDrawerProps> = (props) => {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // On desktop, render inline
  if (isDesktop) {
    return (
      <div className="w-80 xl:w-96 border-l h-full overflow-hidden flex flex-col">
        <Contact360Panel {...props} />
      </div>
    );
  }

  // On mobile, render as a bottom sheet
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg md:hidden"
          aria-label="Ver dados do contato"
        >
          <User className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Dados do Contato</SheetTitle>
        </SheetHeader>
        <div className="h-full overflow-hidden">
          <Contact360Panel {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Contact360MobileDrawer;

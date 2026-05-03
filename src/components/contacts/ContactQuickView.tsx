import React from 'react';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, 
  SheetDescription, SheetFooter, SheetClose 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, Mail, Building, Briefcase, Calendar, 
  Tag, MessageSquare, Edit3, Trash2, Globe, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CONTACT_TYPE_CONFIG } from './contactTypeConfig';
import type { Contact } from './types';

interface ContactQuickViewProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onOpenChat: (phone: string, name: string) => void;
}

export const ContactQuickView: React.FC<ContactQuickViewProps> = ({
  contact, isOpen, onClose, onEdit, onDelete, onOpenChat
}) => {
  if (!contact) return null;

  const typeCfg = contact.contact_type ? CONTACT_TYPE_CONFIG[contact.contact_type] : null;
  const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md border-l border-border/50 shadow-2xl overflow-y-auto">
        <SheetHeader className="space-y-4 pb-6 border-b border-border/30">
          <div className="flex items-start justify-between">
            <Avatar className="w-20 h-20 border-4 border-background shadow-xl">
              <AvatarImage src={contact.avatar_url || ''} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="rounded-full" onClick={() => onEdit(contact)}>
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="outline" className="rounded-full text-destructive hover:bg-destructive/5" onClick={() => onDelete(contact)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-1">
            <SheetTitle className="text-2xl font-bold tracking-tight">
              {contact.name} {contact.surname}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {typeCfg && (
                <Badge variant="secondary" className="gap-1.5 px-2 py-0.5 font-medium">
                  {typeCfg.iconNode}
                  {typeCfg.label}
                </Badge>
              )}
              {contact.nickname && (
                <span className="text-sm text-muted-foreground font-medium italic">
                  "{contact.nickname}"
                </span>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {/* Informações de Contato */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Contato</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 group hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-background border border-border/50 flex items-center justify-center text-primary">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">WhatsApp / Celular</p>
                  <p className="font-semibold truncate">{contact.phone}</p>
                </div>
                <Button 
                  size="sm" 
                  className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onOpenChat(contact.phone, contact.name)}
                >
                  Conversar
                </Button>
              </div>

              {contact.email && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 group hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border/50 flex items-center justify-center text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">E-mail</p>
                    <p className="font-semibold truncate">{contact.email}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Empresa e Cargo */}
          {(contact.company || contact.job_title) && (
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Profissional</h3>
              <div className="grid grid-cols-1 gap-3">
                {contact.company && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background">
                    <Building className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Empresa</p>
                      <p className="font-semibold">{contact.company}</p>
                    </div>
                  </div>
                )}
                {contact.job_title && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Cargo</p>
                      <p className="font-semibold">{contact.job_title}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Tags</h3>
              <div className="flex flex-wrap gap-2 px-1">
                {contact.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="bg-primary/5 border-primary/20 text-primary px-3 py-1">
                    <Tag className="w-3 h-3 mr-1.5 opacity-70" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Timeline / Info */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Sistema</h3>
            <div className="p-4 rounded-xl bg-muted/30 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Criado em
                </span>
                <span className="font-medium">
                  {format(new Date(contact.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Origem
                </span>
                <Badge variant="secondary" className="text-[10px]">Hana CRM</Badge>
              </div>
            </div>
          </section>
        </div>

        <SheetFooter className="mt-8 pt-6 border-t border-border/30 sticky bottom-0 bg-background">
          <Button className="w-full gap-2 h-12 text-base shadow-lg shadow-primary/20" onClick={() => onOpenChat(contact.phone, contact.name)}>
            <MessageSquare className="w-5 h-5" />
            Abrir Conversa no WhatsApp
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
/**
 * ContactInlineEdit.tsx
 * Click-to-edit component for contact fields in the chat sidebar.
 * Solves Gap #6: No inline editing — agents had to open the full form.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeText } from '@/lib/sanitize';
import { invalidateContactCache } from '@/hooks/useContactRealtime';
import { dbFrom } from '@/integrations/datasource/db';

interface ContactInlineEditProps {
  contactId: string;
  field: string;
  value: string;
  displayValue?: string;
  className?: string;
  inputClassName?: string;
  readonly?: boolean;
  onSaved?: (newValue: string) => void;
  validate?: (value: string) => string | null;
  placeholder?: string;
}

export const ContactInlineEdit: React.FC<ContactInlineEditProps> = ({
  contactId, field, value, displayValue, className, inputClassName,
  readonly = false, onSaved, validate, placeholder,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(value);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isEditing, value]);

  const save = useCallback(async () => {
    const trimmed = editValue.trim();
    if (trimmed === value) { setIsEditing(false); return; }
    if (validate) {
      const err = validate(trimmed);
      if (err) { setError(err); return; }
    }
    setIsSaving(true);
    setError(null);
    try {
      const { error: updateError } = await dbFrom('contacts')
        .update({ [field]: trimmed || null })
        .eq('id', contactId);
      if (updateError) throw updateError;
      invalidateContactCache(contactId);
      onSaved?.(trimmed);
      toast.success(`Campo atualizado`);
      setIsEditing(false);
    } catch (err) {
      setError('Erro ao salvar');
      toast.error('Erro ao atualizar campo');
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, field, contactId, validate, onSaved]);

  const cancel = () => { setEditValue(value); setError(null); setIsEditing(false); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  if (readonly) return <span className={className}>{displayValue ?? sanitizeText(value)}</span>;

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => { setEditValue(e.target.value); setError(null); }}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (!isSaving) cancel(); }}
          className={cn('h-7 text-sm py-0 px-1.5', inputClassName)}
          disabled={isSaving}
          placeholder={placeholder}
          aria-label={`Editar ${field}`}
          aria-invalid={!!error}
        />
        <button onClick={save} disabled={isSaving} className="text-green-600 hover:text-green-700" aria-label="Salvar">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={cancel} className="text-muted-foreground hover:text-destructive" aria-label="Cancelar">
          <X className="h-3.5 w-3.5" />
        </button>
        {error && <span className="text-[10px] text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <span
      className={cn('group/inline cursor-pointer inline-flex items-center gap-1', className)}
      onClick={() => setIsEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsEditing(true); }}
      aria-label={`Clique para editar ${field}`}
    >
      {displayValue ?? sanitizeText(value)}
      <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/inline:opacity-50 transition-opacity" />
    </span>
  );
};

export default ContactInlineEdit;

/**
 * useContactFieldVisibility.ts
 * Role-based field visibility for the contact panel.
 * Solves Gap #11: No role-based field visibility.
 *
 * Determines which contact fields are visible/editable
 * based on the current agent's role in the workspace.
 */
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type AgentRole = 'admin' | 'supervisor' | 'agent' | 'viewer';

interface FieldPermission {
  visible: boolean;
  editable: boolean;
}

type FieldName =
  | 'name' | 'email' | 'phone' | 'company' | 'tags'
  | 'notes' | 'quick_notes' | 'consent' | 'custom_fields'
  | 'sla' | 'audit_log' | 'conversation_history'
  | 'duplicate_indicator' | 'merge_action';

const FIELD_PERMISSIONS: Record<AgentRole, Record<FieldName, FieldPermission>> = {
  admin: {
    name: { visible: true, editable: true },
    email: { visible: true, editable: true },
    phone: { visible: true, editable: true },
    company: { visible: true, editable: true },
    tags: { visible: true, editable: true },
    notes: { visible: true, editable: true },
    quick_notes: { visible: true, editable: true },
    consent: { visible: true, editable: true },
    custom_fields: { visible: true, editable: true },
    sla: { visible: true, editable: false },
    audit_log: { visible: true, editable: false },
    conversation_history: { visible: true, editable: false },
    duplicate_indicator: { visible: true, editable: false },
    merge_action: { visible: true, editable: true },
  },
  supervisor: {
    name: { visible: true, editable: true },
    email: { visible: true, editable: true },
    phone: { visible: true, editable: true },
    company: { visible: true, editable: true },
    tags: { visible: true, editable: true },
    notes: { visible: true, editable: true },
    quick_notes: { visible: true, editable: true },
    consent: { visible: true, editable: true },
    custom_fields: { visible: true, editable: true },
    sla: { visible: true, editable: false },
    audit_log: { visible: true, editable: false },
    conversation_history: { visible: true, editable: false },
    duplicate_indicator: { visible: true, editable: false },
    merge_action: { visible: true, editable: true },
  },
  agent: {
    name: { visible: true, editable: true },
    email: { visible: true, editable: true },
    phone: { visible: true, editable: false },
    company: { visible: true, editable: true },
    tags: { visible: true, editable: true },
    notes: { visible: true, editable: true },
    quick_notes: { visible: true, editable: true },
    consent: { visible: true, editable: false },
    custom_fields: { visible: true, editable: false },
    sla: { visible: true, editable: false },
    audit_log: { visible: false, editable: false },
    conversation_history: { visible: true, editable: false },
    duplicate_indicator: { visible: true, editable: false },
    merge_action: { visible: false, editable: false },
  },
  viewer: {
    name: { visible: true, editable: false },
    email: { visible: true, editable: false },
    phone: { visible: true, editable: false },
    company: { visible: true, editable: false },
    tags: { visible: true, editable: false },
    notes: { visible: true, editable: false },
    quick_notes: { visible: true, editable: false },
    consent: { visible: false, editable: false },
    custom_fields: { visible: true, editable: false },
    sla: { visible: true, editable: false },
    audit_log: { visible: false, editable: false },
    conversation_history: { visible: true, editable: false },
    duplicate_indicator: { visible: false, editable: false },
    merge_action: { visible: false, editable: false },
  },
};

export function useContactFieldVisibility(overrideRole?: AgentRole) {
  const { user } = useAuth();

  const role: AgentRole = useMemo(() => {
    if (overrideRole) return overrideRole;
    const metadata = user?.user_metadata;
    const userRole = metadata?.role ?? metadata?.workspace_role ?? 'agent';
    if (['admin', 'supervisor', 'agent', 'viewer'].includes(userRole)) {
      return userRole as AgentRole;
    }
    return 'agent';
  }, [user, overrideRole]);

  const permissions = useMemo(() => FIELD_PERMISSIONS[role], [role]);

  const canView = (field: FieldName): boolean => permissions[field]?.visible ?? false;
  const canEdit = (field: FieldName): boolean => permissions[field]?.editable ?? false;
  const isReadonly = (field: FieldName): boolean => !canEdit(field);

  return { role, permissions, canView, canEdit, isReadonly };
}

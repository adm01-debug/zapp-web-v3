/**
 * useContactFieldVisibility.ts — Role-based field visibility for EXTERNAL CRM contacts
 *
 * FIXED: Updated field list to match the EXTERNAL CRM database schema (49 columns)
 * instead of the Lovable Cloud simplified schema (27 columns).
 *
 * The external contacts table has rich fields like:
 * behavior (DISC/VAK), relationship_stage, sentiment, life_events,
 * personal_notes, family_info, hobbies, interests, etc.
 */

type UserRole = 'admin' | 'supervisor' | 'agent' | 'viewer';

interface FieldVisibility {
  visible: boolean;
  editable: boolean;
}

// Fields mapped to the EXTERNAL CRM contacts table schema
const FIELD_PERMISSIONS: Record<string, Record<UserRole, FieldVisibility>> = {
  // Basic identity — visible to all, editable by agent+
  first_name:         { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  last_name:          { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  full_name:          { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  apelido:            { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  nome_tratamento:    { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  avatar_url:         { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: false }, viewer: { visible: true, editable: false } },

  // Contact info
  email:              { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  phone:              { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  whatsapp:           { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },

  // Professional
  cargo:              { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  departamento:       { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  role_title:         { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  company_id:         { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: false }, viewer: { visible: true, editable: false } },

  // Social media
  linkedin:           { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  instagram:          { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  twitter:            { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },

  // Personal (restricted visibility)
  cpf:                { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: false }, agent: { visible: false, editable: false }, viewer: { visible: false, editable: false } },
  data_nascimento:    { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: false, editable: false } },
  birthday:           { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: false, editable: false } },
  sexo:               { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: false }, viewer: { visible: false, editable: false } },
  family_info:        { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: false, editable: false } },

  // Notes
  notes:              { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  personal_notes:     { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: false, editable: false } },

  // Behavioral intelligence (admin/supervisor only for editing)
  relationship_stage: { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: false }, viewer: { visible: false, editable: false } },
  relationship_score: { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: false }, viewer: { visible: false, editable: false } },
  sentiment:          { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: false }, viewer: { visible: false, editable: false } },
  behavior:           { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: false }, agent: { visible: true, editable: false }, viewer: { visible: false, editable: false } },
  life_events:        { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: false }, viewer: { visible: false, editable: false } },

  // Tags and categorization
  tags:               { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  tags_array:         { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  interests:          { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },
  hobbies:            { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: true },  viewer: { visible: true, editable: false } },

  // Source and system fields (admin only)
  source:             { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: false }, agent: { visible: true, editable: false }, viewer: { visible: false, editable: false } },
  bitrix_contact_id:  { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: false }, agent: { visible: false, editable: false }, viewer: { visible: false, editable: false } },
  is_duplicate:       { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: true },  agent: { visible: true, editable: false }, viewer: { visible: false, editable: false } },
  extra_data:         { admin: { visible: true, editable: true },  supervisor: { visible: true, editable: false }, agent: { visible: false, editable: false }, viewer: { visible: false, editable: false } },
};

export function useContactFieldVisibility(userRole: UserRole = 'agent') {
  const getFieldVisibility = (field: string): FieldVisibility => {
    const permissions = FIELD_PERMISSIONS[field];
    if (!permissions) return { visible: true, editable: userRole === 'admin' };
    return permissions[userRole] ?? { visible: false, editable: false };
  };

  const isFieldVisible = (field: string): boolean => {
    return getFieldVisibility(field).visible;
  };

  const isFieldEditable = (field: string): boolean => {
    return getFieldVisibility(field).editable;
  };

  const getVisibleFields = (): string[] => {
    return Object.keys(FIELD_PERMISSIONS).filter(f => isFieldVisible(f));
  };

  const getEditableFields = (): string[] => {
    return Object.keys(FIELD_PERMISSIONS).filter(f => isFieldEditable(f));
  };

  return {
    getFieldVisibility,
    isFieldVisible,
    isFieldEditable,
    getVisibleFields,
    getEditableFields,
    userRole,
  };
}

export default useContactFieldVisibility;

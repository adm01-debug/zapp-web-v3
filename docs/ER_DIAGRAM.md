# 📊 Diagrama ER — FATOR X (CRM & WhatsApp)

```mermaid
erDiagram
    evolution_contacts ||--o{ evolution_messages : "possui"
    evolution_contacts ||--o{ evolution_deals : "tem"
    evolution_contacts ||--o{ evolution_tasks : "tem"
    evolution_contacts ||--o{ evolution_calls : "recebe"
    
    evolution_deals ||--o{ evolution_audit_log : "gera"
    evolution_contacts ||--o{ evolution_audit_log : "gera"
    
    evolution_messages ||--o{ evolution_media : "contém"
    
    evolution_contacts {
        uuid id PK
        string remote_jid UK
        string push_name
        string lead_status
        uuid assigned_to
        timestamp deleted_at
    }
    
    evolution_messages {
        uuid id PK
        string message_id UK
        string remote_jid FK
        text content
        string direction
        timestamp created_at
    }
    
    evolution_deals {
        uuid id PK
        uuid contact_id FK
        string stage
        numeric value
        timestamp stage_changed_at
    }
```

## 🔐 Segurança (RLS)
- Todas as tabelas `evolution_*` possuem RLS ativo.
- Acesso de escrita é restrito a RPCs `SECURITY DEFINER`.
- Acesso de leitura é filtrado por `assigned_to` ou `department_id`.

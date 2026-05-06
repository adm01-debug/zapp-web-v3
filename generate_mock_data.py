import uuid
import random
from datetime import datetime, timedelta

# Constants from current DB
WHATSAPP_CONN_ID = "7b6dd712-9428-4531-b46c-e8e7daacf9a1"
AGENT_ID = "b70992ab-4c75-4ebd-9b7f-8c9b0c053e90"

# Use a unique prefix to avoid collisions
PREFIX = "MOCK_"

names = [
    "Ana Silva", "Bruno Santos", "Carla Oliveira", "Daniel Lima", "Eduarda Costa",
    "Felipe Pereira", "Gabriela Rocha", "Hugo Souza", "Isabela Martins", "João Ferreira",
    "Karen Alves", "Lucas Ribeiro", "Mariana Gomes", "Natan Carvalho", "Olivia Melo",
    "Pedro Araujo", "Quenia Lopes", "Rafael Cardoso", "Sara Teixeira", "Tiago Machado",
    "Ursula Bernardes", "Vitor Barros", "Wagner Antunes", "Xavier Nazario", "Yara Pinheiro",
    "Zeca Pagodinho", "Alice Wonder", "Bob Builder", "Charlie Brown", "Diana Prince",
    "Edward Stark", "Fiona Apple", "George Lucas", "Hannah Baker", "Ian Curtis",
    "Julia Roberts", "Kevin Hart", "Lana Del Rey", "Miles Davis", "Nina Simone",
    "Oscar Wilde", "Pablo Picasso", "Quentin Tarantino", "Rihanna", "Steve Jobs",
    "Taylor Swift", "Uma Thurman", "Vin Diesel", "Will Smith", "Zendaya"
]

sql_statements = []

for i, name in enumerate(names):
    contact_id = str(uuid.uuid4())
    # More unique phone number
    phone = f"+5511988{random.randint(100, 999)}{i:04d}"
    email = f"{PREFIX.lower()}{name.lower().replace(' ', '.')}@example.com"
    mock_name = f"{PREFIX}{name}"
    
    # Create Contact
    sql_statements.append(f"INSERT INTO public.contacts (id, name, phone, email, whatsapp_connection_id, assigned_to) VALUES ('{contact_id}', '{mock_name}', '{phone}', '{email}', '{WHATSAPP_CONN_ID}', '{AGENT_ID}') ON CONFLICT (phone) DO NOTHING;")
    
    # Create Conversation (linked to contact_id)
    conv_id = str(uuid.uuid4())
    status = random.choice(['open', 'closed', 'pending'])
    priority = random.choice(['low', 'medium', 'high', 'urgent'])
    # We use a subquery to ensure the contact exists (it might have been skipped by DO NOTHING if phone matched, 
    # but here we are using fresh UUIDs for IDs, so phone is the only conflict point)
    # Actually, if the contact was skipped, the conv insert will fail. 
    # Let's just use the contact_id we generated. If it fails, it fails.
    
    sql_statements.append(f"INSERT INTO public.conversations (id, contact_id, status, assigned_to, priority, message_count) VALUES ('{conv_id}', '{contact_id}', '{status}', '{AGENT_ID}', '{priority}', 10);")
    
    # Create Messages (10 per contact)
    for j in range(10):
        msg_id = str(uuid.uuid4())
        sender = random.choice(['agent', 'contact'])
        created_at = datetime.now() - timedelta(days=random.randint(0, 7), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        
        contents = [
            "Olá, sou um dado mock!",
            "Testando a funcionalidade de chat.",
            "Esta é uma mensagem de teste.",
            "Como está o sistema hoje?",
            "Tudo funcionando perfeitamente.",
            "Gostaria de saber mais sobre as novas features.",
            "Pode me ajudar com uma dúvida?",
            "Claro, qual seria?",
            "Obrigado pelo excelente atendimento!",
            "Até logo!"
        ]
        content = contents[j % len(contents)]
        msg_type = 'text'
        
        media_url = "NULL"
        if j == 4:
            msg_type = 'image'
            media_url = "'https://picsum.photos/400/300'"
            content = "Imagem de teste"
        
        is_read = "true" if sender == 'agent' else str(random.choice([True, False])).lower()
        
        sql_statements.append(f"INSERT INTO public.messages (id, contact_id, sender, content, message_type, media_url, is_read, whatsapp_connection_id, agent_id, status, created_at) VALUES ('{msg_id}', '{contact_id}', '{sender}', '{content}', '{msg_type}', {media_url}, {is_read}, '{WHATSAPP_CONN_ID}', '{AGENT_ID}', 'sent', '{created_at.isoformat()}');")

with open('mock_data.sql', 'w') as f:
    f.write("\n".join(sql_statements))

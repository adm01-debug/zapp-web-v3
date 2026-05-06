import uuid
import random
from datetime import datetime, timedelta

# Constants from current DB
WHATSAPP_CONN_ID = "7b6dd712-9428-4531-b46c-e8e7daacf9a1"
AGENT_ID = "b70992ab-4c75-4ebd-9b7f-8c9b0c053e90"

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
    phone = f"+551199999{i:04d}"
    email = f"{name.lower().replace(' ', '.')}@example.com"
    
    # Create Contact
    sql_statements.append(f"INSERT INTO public.contacts (id, name, phone, email, whatsapp_connection_id, assigned_to) VALUES ('{contact_id}', '{name}', '{phone}', '{email}', '{WHATSAPP_CONN_ID}', '{AGENT_ID}');")
    
    # Create Conversation
    conv_id = str(uuid.uuid4())
    status = random.choice(['open', 'closed', 'pending'])
    priority = random.choice(['low', 'medium', 'high', 'urgent'])
    sql_statements.append(f"INSERT INTO public.conversations (id, contact_id, status, assigned_to, priority, message_count) VALUES ('{conv_id}', '{contact_id}', '{status}', '{AGENT_ID}', '{priority}', 10);")
    
    # Create Messages (10 per contact)
    for j in range(10):
        msg_id = str(uuid.uuid4())
        sender = random.choice(['agent', 'contact'])
        # spread messages over the last 7 days
        created_at = datetime.now() - timedelta(days=random.randint(0, 7), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        
        contents = [
            "Olá, tudo bem?",
            "Como posso te ajudar hoje?",
            "Vi que você se interessou pelo nosso produto.",
            "Poderia me enviar mais detalhes?",
            "Claro, aqui está o catálogo.",
            "Obrigado pelo retorno!",
            "Qual o prazo de entrega?",
            "Geralmente entregamos em 3 dias úteis.",
            "Perfeito, vou realizar a compra.",
            "Temos uma promoção especial para você hoje!"
        ]
        content = contents[j % len(contents)]
        msg_type = 'text'
        
        # Add some variety (media messages)
        media_url = "NULL"
        if j == 4:
            msg_type = 'image'
            media_url = "'https://picsum.photos/400/300'"
            content = "Veja esta imagem"
        
        is_read = "true" if sender == 'agent' else str(random.choice([True, False])).lower()
        
        sql_statements.append(f"INSERT INTO public.messages (id, contact_id, sender, content, message_type, media_url, is_read, whatsapp_connection_id, agent_id, status, created_at) VALUES ('{msg_id}', '{contact_id}', '{sender}', '{content}', '{msg_type}', {media_url}, {is_read}, '{WHATSAPP_CONN_ID}', '{AGENT_ID}', 'sent', '{created_at.isoformat()}');")

with open('mock_data.sql', 'w') as f:
    f.write("\n".join(sql_statements))

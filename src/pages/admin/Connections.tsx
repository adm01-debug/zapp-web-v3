import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Database, 
  Globe, 
  Webhook, 
  Cpu, 
  Plus, 
  Settings, 
  Save, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Link
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminConnectionsPage() {
  const [activeTab, setActiveTab] = useState('external-db');
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_connections' as any)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setConnections(data);
    setLoading(false);
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-full">
      <PageHeader 
        title="Módulo de Conexão" 
        subtitle="Gerencie integrações externas, webhooks e conectores inteligentes"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Conexão' }]}
        actions={
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Nova Conexão
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full md:w-[600px] mb-8">
          <TabsTrigger value="external-db" className="gap-2">
            <Database className="w-4 h-4" /> Banco Externo
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Globe className="w-4 h-4" /> Integrações
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="w-4 h-4" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-2">
            <Cpu className="w-4 h-4" /> MCP (Claude)
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          {/* External Databases (Supabase) */}
          <TabsContent value="external-db">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" /> FATOR X (Supabase Externo)
                      </CardTitle>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Configurado</Badge>
                    </div>
                    <CardDescription>Conecta ao banco VPS que armazena mensagens e contatos WhatsApp</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>URL da Instância</Label>
                      <Input value="https://tdprnylgyrogbbhgdoik.supabase.co" readOnly className="font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                      <Label>Chave Anon (Public)</Label>
                      <Input type="password" value="********************************" readOnly className="font-mono text-xs" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-2">
                        <RefreshCw className="w-4 h-4" /> Testar Conexão
                      </Button>
                      <Button size="sm" className="flex-1 gap-2">
                        <Settings className="w-4 h-4" /> Editar Credenciais
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed border-secondary/40 bg-secondary/5">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <CardTitle>Adicionar Novo Banco</CardTitle>
                    <CardDescription>Conecte outro projeto Supabase ou PostgreSQL externo</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center pb-8">
                    <Button variant="secondary">Configurar Novo Supabase</Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* Integrations (Bitrix24, N8N) */}
          <TabsContent value="integrations">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-500" /> Bitrix24
                    </CardTitle>
                    <Badge variant="outline">Pendente</Badge>
                  </div>
                  <CardDescription>Sincronização bidirecional de Leads e Negócios</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Webhook URL (Inbound)</Label>
                    <Input placeholder="https://sua-empresa.bitrix24.com.br/rest/1/abc..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Token / Key</Label>
                    <Input type="password" placeholder="Digite o token de acesso" />
                  </div>
                  <Button className="w-full gap-2">
                    <Save className="w-4 h-4" /> Salvar Integração Bitrix
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Link className="w-5 h-5 text-orange-500" /> n8n (Workflows)
                    </CardTitle>
                    <Badge variant="outline">Pendente</Badge>
                  </div>
                  <CardDescription>Dispare automações complexas via webhooks do n8n</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL de Produção</Label>
                    <Input placeholder="https://n8n.sua-vps.com/webhook/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Auth Header (API Key)</Label>
                    <Input type="password" placeholder="Header X-N8N-API-KEY" />
                  </div>
                  <Button className="w-full gap-2" variant="secondary">
                    <Save className="w-4 h-4" /> Conectar n8n
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Webhooks (Internal Lovable Apps) */}
          <TabsContent value="webhooks">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5 text-emerald-500" /> Webhooks Inter-App
                  </CardTitle>
                  <CardDescription>Permita que outros sistemas criados no Lovable se conectem ao ZAPP Web</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-secondary/20">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left">Nome do App</th>
                          <th className="px-4 py-3 text-left">Eventos</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">CRM-Integrator-App</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-[10px]">messages</Badge>
                              <Badge variant="secondary" className="text-[10px]">contacts</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Ativo</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <Button className="mt-4 gap-2" variant="outline">
                    <Plus className="w-4 h-4" /> Gerar Novo Webhook de Entrada
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* MCP Claude */}
          <TabsContent value="mcp">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="border-purple-500/20 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-500" /> MCP (Model Context Protocol) para Claude
                  </CardTitle>
                  <CardDescription>Permita que instâncias do Claude Desktop ou AI Gateway acessem dados do ZAPP Web diretamente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-background border border-purple-500/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-purple-500 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Endpoint do Servidor MCP
                      </h4>
                      <Badge variant="secondary">Experimental</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Este endpoint expõe ferramentas como `search_contacts`, `list_messages` e `send_whatsapp` 
                      diretamente para modelos de linguagem usando o protocolo MCP da Anthropic.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input readOnly value="https://allrjhkpuscmgbsnmjlv.supabase.co/functions/v1/mcp-server" className="font-mono text-[10px]" />
                      <Button size="icon" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Habilitar Acesso MCP</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="space-y-2">
                      <Label>Token de Segurança MCP</Label>
                      <div className="flex gap-2">
                        <Input type="password" value="sk_mcp_zapp_********************" readOnly />
                        <Button variant="outline">Regerar</Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted p-3 rounded text-[10px] font-mono whitespace-pre overflow-x-auto border border-secondary/20">
{`"mcpServers": {
  "zapp-web": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-http", "https://.../mcp-server"],
    "env": { "ZAPP_API_TOKEN": "SUA_CHAVE_AQUI" }
  }
}`}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

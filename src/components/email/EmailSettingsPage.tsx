import { useState } from 'react';
import { Mail, Settings, Key, Clock, Signature, Bell, ChevronRight, Shield, Info, Wifi, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GmailAccountSelector } from '@/components/gmail/GmailAccountSelector';
import { EmailSignatureEditor } from '@/components/email/EmailSignatureEditor';
import { EmailSLADashboard } from '@/components/email/EmailSLADashboard';
import { useGmail } from '@/hooks/useGmail';

export function EmailSettingsPage() {
  const {
    accounts,
    tokenStatus,
    activeAccountId,
    setActiveAccountId,
    startOAuth,
    disconnect,
    syncNow,
    isSyncing,
  } = useGmail();

  const [slaThreshold, setSlaThreshold] = useState('480');
  const [slaWarningPct, setSlaWarningPct] = useState('80');
  const [businessHoursOnly, setBusinessHoursOnly] = useState(true);
  const [businessStart, setBusinessStart] = useState('8');
  const [businessEnd, setBusinessEnd] = useState('18');
  const [imapEmail, setImapEmail] = useState('');
  const [imapProvider, setImapProvider] = useState('outlook');
  const [imapPassword, setImapPassword] = useState('');

  const handleAddImapAccount = async () => {
    if (!imapEmail || !imapPassword) return;
    // Chama a Edge Function email-imap-bridge
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.functions.invoke('email-imap-bridge', {
      body: {
        action: 'saveCredentials',
        userId: (await supabase.auth.getUser()).data.user?.id,
        config: { email: imapEmail, provider: imapProvider, password: imapPassword, username: imapEmail },
      },
    });

    if (data?.success) {
      setImapEmail('');
      setImapPassword('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          Configurações de Email
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gerencie contas Gmail, assinaturas, SLA e notificações do Email Chat.
        </p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts" className="gap-2">
            <Key className="h-4 w-4" />
            Contas
          </TabsTrigger>
          <TabsTrigger value="signatures" className="gap-2">
            <Signature className="h-4 w-4" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-2">
            <Clock className="h-4 w-4" />
            SLA
          </TabsTrigger>
          <TabsTrigger value="imap" className="gap-2">
            <Wifi className="h-4 w-4" />
            IMAP/SMTP
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Contas Gmail ─────────────────────────────────────────── */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contas Gmail Conectadas</CardTitle>
              <CardDescription>
                Gerencie suas contas Gmail via OAuth2. Tokens são renovados automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accounts.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Mail className="h-12 w-12 text-muted-foreground/30" />
                  <div className="text-center">
                    <p className="font-medium">Nenhuma conta conectada</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Conecte sua conta Gmail para começar a usar o Email Chat
                    </p>
                  </div>
                  <Button onClick={startOAuth} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Conectar Gmail
                  </Button>
                </div>
              ) : (
                <GmailAccountSelector
                  accounts={accounts}
                  activeAccountId={activeAccountId}
                  tokenStatus={tokenStatus}
                  isSyncing={isSyncing}
                  onSelectAccount={setActiveAccountId}
                  onAddAccount={startOAuth}
                  onDisconnect={disconnect}
                  onSync={syncNow}
                />
              )}
            </CardContent>
          </Card>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Autenticação via OAuth2 seguro. Nunca armazenamos sua senha. Tokens são criptografados no banco.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* ── Tab: Assinaturas ─────────────────────────────────────────── */}
        <TabsContent value="signatures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assinaturas de Email</CardTitle>
              <CardDescription>
                Configure assinaturas HTML para cada conta Gmail. A assinatura padrão é inserida automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailSignatureEditor accountId={activeAccountId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: SLA ─────────────────────────────────────────────────── */}
        <TabsContent value="sla" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração de SLA</CardTitle>
              <CardDescription>
                Define prazos de resposta para emails recebidos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Prazo máximo (minutos)</Label>
                  <Input
                    type="number"
                    value={slaThreshold}
                    onChange={e => setSlaThreshold(e.target.value)}
                    min={15}
                    max={10080}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(Number(slaThreshold) / 60)}h {Number(slaThreshold) % 60}min
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Alerta de atenção (%)</Label>
                  <Input
                    type="number"
                    value={slaWarningPct}
                    onChange={e => setSlaWarningPct(e.target.value)}
                    min={50}
                    max={99}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerta aos {Math.round(Number(slaThreshold) * Number(slaWarningPct) / 100)}min
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Apenas horário comercial</p>
                  <p className="text-xs text-muted-foreground">
                    Não contabiliza noites, fins de semana e feriados
                  </p>
                </div>
                <Switch
                  checked={businessHoursOnly}
                  onCheckedChange={setBusinessHoursOnly}
                />
              </div>

              {businessHoursOnly && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Início do expediente (h)</Label>
                    <Select value={businessStart} onValueChange={setBusinessStart}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 6).map(h => (
                          <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Fim do expediente (h)</Label>
                    <Select value={businessEnd} onValueChange={setBusinessEnd}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 12).map(h => (
                          <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={() => {}}>
                Salvar Configurações de SLA
              </Button>
            </CardContent>
          </Card>

          <EmailSLADashboard />
        </TabsContent>

        {/* ── Tab: IMAP/SMTP ───────────────────────────────────────────── */}
        <TabsContent value="imap" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Para Gmail, use a aba <strong>Contas</strong> com autenticação OAuth2 (mais segura). 
              IMAP/SMTP é recomendado para Outlook, Yahoo e servidores customizados.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Conta IMAP/SMTP</CardTitle>
              <CardDescription>
                Suporte a Outlook, Yahoo Mail e servidores de email personalizados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Provedor</Label>
                <Select value={imapProvider} onValueChange={setImapProvider}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outlook">Microsoft Outlook / Office 365</SelectItem>
                    <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                    <SelectItem value="custom">Servidor Customizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Email</Label>
                  <Input
                    type="email"
                    value={imapEmail}
                    onChange={e => setImapEmail(e.target.value)}
                    placeholder="usuario@exemplo.com"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Senha / App Password</Label>
                  <Input
                    type="password"
                    value={imapPassword}
                    onChange={e => setImapPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleAddImapAccount}
                disabled={!imapEmail || !imapPassword}
              >
                <Plus className="h-4 w-4" />
                Adicionar Conta
              </Button>

              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-green-500" />
                  Segurança
                </p>
                <p className="text-xs text-muted-foreground">
                  Para Outlook, use uma App Password gerada em{' '}
                  <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer" className="underline">
                    account.microsoft.com/security
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EmailSettingsPage;

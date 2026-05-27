// @ts-nocheck
import { useState, useMemo } from 'react';
import { Shield, Eye, Lock, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/features/auth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const INBOX_PERMISSIONS = [
  { id: 'inbox.view_mine', label: 'Meus (Apenas as próprias)', description: 'O usuário vê apenas as conversas atribuídas a ele.' },
  { id: 'inbox.view_department', label: 'Departamento', description: 'O usuário vê todas as conversas do seu departamento.' },
  { id: 'inbox.view_all', label: 'Todos depts. (Empresa)', description: 'O usuário vê conversas de todos os departamentos da empresa.' }
];

const ROLES = [
  { id: 'admin', label: 'Administrador', color: 'text-destructive' },
  { id: 'manager', label: 'Gerente', color: 'text-warning' },
  { id: 'supervisor', label: 'Supervisor', color: 'text-info' },
  { id: 'agent', label: 'Agente', color: 'text-whatsapp' }
];

export function InboxScopeConfig() {
  const { permissions, rolePermissions, addPermissionToRole, removePermissionFromRole, loading } = usePermissions();
  const [updating, setUpdating] = useState<string | null>(null);

  // Map permission name to ID
  const permissionMap = useMemo(() => {
    return permissions.reduce((acc, p) => {
      acc[p.name] = p.id;
      return acc;
    }, {} as Record<string, string>);
  }, [permissions]);

  const hasPermission = (role: string, permissionName: string): boolean => {
    const permissionId = permissionMap[permissionName];
    if (!permissionId) return false;
    return rolePermissions.some(rp => rp.role === role && rp.permission_id === permissionId);
  };

  const handleToggle = async (role: string, permissionName: string) => {
    const permissionId = permissionMap[permissionName];
    if (!permissionId) {
      toast.error('Permissão não encontrada no sistema');
      return;
    }

    const key = `${role}-${permissionName}`;
    setUpdating(key);

    try {
      const active = hasPermission(role, permissionName);
      if (active) {
        await removePermissionFromRole(role, permissionId);
        toast.success(`Permissão ${permissionName} removida de ${role}`);
      } else {
        await addPermissionToRole(role, permissionId);
        toast.success(`Permissão ${permissionName} adicionada a ${role}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao atualizar permissão');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-whatsapp/20 bg-whatsapp/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-whatsapp/10 rounded-full flex items-center justify-center text-whatsapp">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Configuração de Escopo da Inbox</CardTitle>
              <CardDescription>
                Defina quais níveis de visualização cada perfil de usuário pode acessar na Caixa de Entrada
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-background/50 rounded-lg p-4 border border-border/50 flex gap-3 items-start">
            <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              As alterações aqui são aplicadas em tempo real. Usuários <strong>Agentes</strong> por padrão devem ver apenas "Meus". 
              Supervisores geralmente veem "Departamento" e Administradores veem "Todos".
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {ROLES.map((role) => (
          <Card key={role.id} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-base font-bold ${role.color}`}>{role.label}</CardTitle>
                <div className="px-2 py-0.5 bg-background rounded-full border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Role: {role.id}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {INBOX_PERMISSIONS.map((perm) => {
                const isActive = hasPermission(role.id, perm.id);
                const isUpdating = updating === `${role.id}-${perm.id}`;
                const isDisabled = role.id === 'admin' || isUpdating;

                return (
                  <div key={perm.id} className="flex items-start justify-between gap-4 p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/20 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isActive ? <Eye className="w-3 h-3 text-whatsapp" /> : <Lock className="w-3 h-3 text-muted-foreground/50" />}
                        <Label className="text-sm font-bold cursor-pointer">{perm.label}</Label>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug pl-5">
                        {perm.description}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-whatsapp" />
                      ) : (
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => handleToggle(role.id, perm.id)}
                          disabled={isDisabled}
                          className="data-[state=checked]:bg-whatsapp"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              
              {role.id === 'admin' && (
                <div className="mt-2 text-[10px] text-center text-muted-foreground bg-muted/50 py-1 rounded">
                  Administradores possuem acesso total por padrão
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

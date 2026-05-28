
import React, { useEffect, useState } from 'react';
import { buildValidator, ValidationEvidence } from '@/utils/buildValidation';
import { Shield, CheckCircle2, XCircle, AlertCircle, FileText, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const BuildValidationOverlay: React.FC = () => {
  const [evidence, setEvidence] = useState<ValidationEvidence | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const runVerification = async () => {
    setIsVerifying(true);
    const result = await buildValidator.runValidation();
    setEvidence(result);
    setIsVerifying(false);

    if (result.status === 'failure') {
      toast.error('Falha na validação pós-build!', {
        description: 'Alguns serviços essenciais não estão respondendo corretamente.',
      });
    } else {
      toast.success('Ambiente validado com sucesso!');
    }
  };

  useEffect(() => {
    // Run initial validation after a small delay to ensure app is mounted
    const timer = setTimeout(runVerification, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!evidence && !isVerifying) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[10000]">
      <Button
        variant={evidence?.status === 'failure' ? "destructive" : "secondary"}
        size="sm"
        className="rounded-full shadow-lg gap-2 h-10 px-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isVerifying ? <RefreshCw className="h-4 w-4 animate-spin" /> : 
          evidence?.status === 'success' ? <Shield className="h-4 w-4 text-green-500" /> : 
          <Shield className="h-4 w-4" />}
        <span className="text-xs font-semibold">
          {isVerifying ? 'Verificando...' : evidence?.status === 'success' ? 'Sistema OK' : 'Falha Detectada'}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 bg-background border rounded-lg shadow-xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Evidências Pós-Build
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {evidence?.checks.map((check, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded-md">
                <span className="font-medium">{check.name}</span>
                <div className="flex items-center gap-1">
                  {check.status === 'pass' ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className={check.status === 'pass' ? "text-green-500" : "text-red-500"}>
                    {check.status === 'pass' ? 'OK' : 'Erro'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t flex flex-col gap-2">
            <div className="text-[10px] text-muted-foreground italic">
              Última verificação: {evidence ? new Date(evidence.timestamp).toLocaleTimeString() : 'Nunca'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="w-full text-[10px]" onClick={runVerification}>
                Recarregar Testes
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full text-[10px]"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `zapp-build-evidence-${new Date().getTime()}.json`;
                  a.click();
                }}
              >
                Baixar Logs
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

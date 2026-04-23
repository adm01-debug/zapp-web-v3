import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_THRESHOLDS,
  saveThresholds,
  type RetryThresholds,
} from '@/lib/retryAlerts';

interface RetryAlertsConfigProps {
  value: RetryThresholds;
  onChange: (t: RetryThresholds) => void;
  hasBreaches?: boolean;
}

export function RetryAlertsConfig({ value, onChange, hasBreaches }: RetryAlertsConfigProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RetryThresholds>(value);

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next) setDraft(value);
  };

  const handleSave = () => {
    const sanitized: RetryThresholds = {
      p95Attempts: Math.max(1, Number(draft.p95Attempts) || DEFAULT_THRESHOLDS.p95Attempts),
      failureRatePct: Math.max(1, Math.min(100, Number(draft.failureRatePct) || DEFAULT_THRESHOLDS.failureRatePct)),
      minSampleSize: Math.max(1, Number(draft.minSampleSize) || DEFAULT_THRESHOLDS.minSampleSize),
    };
    saveThresholds(sanitized);
    onChange(sanitized);
    toast.success('Limites de alerta atualizados');
    setOpen(false);
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_THRESHOLDS });
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs relative"
          aria-label="Configurar alertas de retry"
        >
          <Bell className="w-3.5 h-3.5" />
          Alertas
          {hasBreaches && (
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive ring-2 ring-background"
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <p className="text-sm font-semibold">Limites de alerta</p>
          <p className="text-xs text-muted-foreground">
            Dispara alerta quando uma instância ultrapassa os limites na janela atual.
          </p>
        </div>
        <div className="space-y-2.5">
          <Field
            label="p95 de tentativas máx."
            value={draft.p95Attempts}
            onChange={(v) => setDraft({ ...draft, p95Attempts: v })}
            hint="Ex.: 3 → alerta se p95 ≥ 3 tentativas"
            min={1}
            max={20}
          />
          <Field
            label="% falha máxima"
            value={draft.failureRatePct}
            onChange={(v) => setDraft({ ...draft, failureRatePct: v })}
            hint="(failed + exhausted) / total × 100"
            min={1}
            max={100}
          />
          <Field
            label="Amostra mínima"
            value={draft.minSampleSize}
            onChange={(v) => setDraft({ ...draft, minSampleSize: v })}
            hint="Instâncias com menos runs são ignoradas"
            min={1}
            max={1000}
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1.5 h-8">
            <RotateCcw className="w-3 h-3" />
            Restaurar padrão
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs h-8">
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  min?: number;
  max?: number;
}

function Field({ label, value, onChange, hint, min, max }: FieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputSize="sm"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

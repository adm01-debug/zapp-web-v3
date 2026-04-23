import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Server } from 'lucide-react';

interface InstanceFilterSelectProps {
  instances: string[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

const ALL_VALUE = '__all__';

export function InstanceFilterSelect({
  instances,
  value,
  onChange,
  disabled,
}: InstanceFilterSelectProps) {
  return (
    <Select
      value={value ?? ALL_VALUE}
      onValueChange={(v) => onChange(v === ALL_VALUE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[200px]">
        <Server className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Todas as instâncias" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>Todas as instâncias</SelectItem>
        {instances.map((inst) => (
          <SelectItem key={inst} value={inst}>
            {inst}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

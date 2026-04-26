import { Sparkles, Check, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAutomationSuggestions } from "@/hooks/useAutomationSuggestions";
import { cn } from "@/lib/utils";

interface AutomationSuggestionsBarProps {
  remoteJid: string | null;
  onUseSuggestion: (text: string) => void;
  onSendNow?: (text: string) => Promise<void> | void;
}

export function AutomationSuggestionsBar({
  remoteJid,
  onUseSuggestion,
  onSendNow,
}: AutomationSuggestionsBarProps) {
  const { suggestions, accept, dismiss } = useAutomationSuggestions(remoteJid);

  if (!suggestions.length) return null;

  return (
    <div className="px-3 pt-2 space-y-2">
      {suggestions.map((s) => (
        <Card
          key={s.id}
          className={cn(
            "p-3 border-primary/30 bg-primary/5 flex items-start gap-3",
          )}
        >
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px] uppercase">
                Automação
              </Badge>
              {s.rule_name && (
                <span className="text-xs text-muted-foreground truncate">
                  {s.rule_name}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground leading-snug whitespace-pre-wrap">
              {s.suggestion_text}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="default"
                className="h-7"
                onClick={() => {
                  onUseSuggestion(s.suggestion_text ?? "");
                  accept(s.id);
                }}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Usar
              </Button>
              {onSendNow && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7"
                  onClick={async () => {
                    await onSendNow(s.suggestion_text ?? "");
                    accept(s.id);
                  }}
                >
                  <Send className="h-3.5 w-3.5 mr-1" /> Enviar
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => dismiss(s.id)}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Descartar
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

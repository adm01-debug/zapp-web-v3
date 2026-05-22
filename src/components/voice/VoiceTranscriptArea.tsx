// @ts-nocheck
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Loader2, MessageCircle } from 'lucide-react';
import type { VoiceAgentPhase } from '@/features/inbox';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface VoiceTranscriptAreaProps {
  phase: VoiceAgentPhase;
  partialTranscript: string;
  finalTranscript: string;
  agentResponse: string;
  error: string;
  colors: {
    primary: string;
    secondary: string;
    glow1: string;
    glow2: string;
  };
}

export function VoiceTranscriptArea({
  phase,
  partialTranscript,
  finalTranscript,
  agentResponse,
  error,
  colors,
}: VoiceTranscriptAreaProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="w-full min-h-[56px] space-y-2" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait">
        {partialTranscript && (
          <motion.div
            key="partial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm text-muted-foreground/50 italic"
          >
            "{partialTranscript}"
          </motion.div>
        )}

        {finalTranscript && !partialTranscript && (
          <motion.div
            key="final"
            initial={{ opacity: 0, y: prefersReduced ? 0 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-sm text-foreground/80 font-medium"
          >
            🎤 "{finalTranscript}"
          </motion.div>
        )}

        {agentResponse && (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: prefersReduced ? 0 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-sm font-medium px-4 py-3 rounded-2xl border border-primary/20 bg-primary/5 text-foreground shadow-glow-primary/5"
          >
            <MessageCircle className="w-4 h-4 inline-block mr-2 opacity-70 text-primary" />
            {agentResponse}
          </motion.div>
        )}

        {(phase === 'processing' || phase === 'booting') && !agentResponse && (
          <motion.div
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 text-muted-foreground/50 text-xs font-medium"
          >
            <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
            {phase === 'processing' ? 'Processando com IA...' : 'Conectando microfone...'}
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 py-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold uppercase tracking-wider mb-1">Erro de Voz</AlertTitle>
              <AlertDescription className="text-xs opacity-90">
                {error}
                <div className="mt-2 text-[10px] text-muted-foreground font-normal">
                  Toque no orbe para tentar novamente
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

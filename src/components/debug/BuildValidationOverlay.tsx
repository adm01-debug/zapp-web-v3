
import React, { useState } from 'react';
import { useValidation } from '@/components/providers/ValidationProvider';
import { validationLogger } from '@/utils/validationLogger';
import { Shield, AlertTriangle, CheckCircle, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export const BuildValidationOverlay: React.FC = () => {
  const { status, lastError, generateEvidence } = useValidation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Only show in development or if explicitly requested
  if (process.env.NODE_ENV === 'production' && !window.location.search.includes('debug=true')) {
    return null;
  }

  const events = validationLogger.getEvents();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {isOpen && (
        <div className="w-80 max-h-[400px] bg-background border rounded-lg shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Shield className="w-4 h-4 text-primary" />
              Build Validation
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Health Status</div>
                <div className="flex items-center gap-2">
                  {status === 'healthy' ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                      <CheckCircle className="w-3 h-3" /> Healthy
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" /> Issues Detected
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Recent Events</div>
                <div className="space-y-1">
                  {events.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">No events logged yet.</div>
                  ) : (
                    events.slice(0, 10).map((event, i) => (
                      <div key={i} className="text-[10px] p-1.5 rounded bg-muted/30 flex flex-col gap-0.5 border border-transparent hover:border-border">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "font-bold uppercase px-1 rounded",
                            event.type === 'error' ? "text-red-500 bg-red-500/10" :
                            event.type === 'network' ? "text-yellow-500 bg-yellow-500/10" :
                            "text-blue-500 bg-blue-500/10"
                          )}>
                            {event.type}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="truncate text-foreground font-medium" title={event.message}>
                          {event.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-muted/20 flex gap-2">
            <Button size="sm" className="w-full text-xs gap-1.5" onClick={generateEvidence}>
              <FileText className="w-3 h-3" /> Export Evidence
            </Button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95",
          status === 'healthy' ? "bg-green-500 text-white" : "bg-red-500 text-white animate-pulse"
        )}
      >
        {status === 'healthy' ? <Shield className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
      </button>
    </div>
  );
};

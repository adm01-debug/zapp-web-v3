
import React, { createContext, useContext, useEffect, useState } from 'react';
import { validationLogger } from '@/utils/validationLogger';

interface ValidationContextType {
  status: 'loading' | 'healthy' | 'warning' | 'error';
  lastError?: string;
  generateEvidence: () => void;
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export const ValidationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ValidationContextType['status']>('loading');
  const [lastError, setLastError] = useState<string>();

  useEffect(() => {
    // Initial render check
    validationLogger.addEvent('render', 'Initial App render started');
    
    const checkInterval = setInterval(() => {
      const evidence = validationLogger.getEvidence();
      if (evidence.summary.errors > 0 || evidence.summary.networkFailures > 0) {
        setStatus('error');
        const lastErr = evidence.events.find(e => e.type === 'error' || e.type === 'network');
        setLastError(lastErr?.message);
      } else {
        setStatus('healthy');
      }
    }, 2000);

    // Signal successful mount to the global loader
    if (window.__zappHideRootLoader) {
      setTimeout(() => {
        validationLogger.addEvent('render', 'App mount confirmed');
        window.__zappHideRootLoader();
      }, 500);
    }

    return () => clearInterval(checkInterval);
  }, []);

  const generateEvidence = () => {
    const evidence = validationLogger.getEvidence();
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zapp-validation-evidence-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ValidationContext.Provider value={{ status, lastError, generateEvidence }}>
      {children}
    </ValidationContext.Provider>
  );
};

export const useValidation = () => {
  const context = useContext(ValidationContext);
  if (!context) throw new Error('useValidation must be used within a ValidationProvider');
  return context;
};

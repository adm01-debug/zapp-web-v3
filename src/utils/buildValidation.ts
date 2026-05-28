
import { supabase } from "@/integrations/supabase/client";

export interface ValidationEvidence {
  timestamp: string;
  status: 'success' | 'failure' | 'warning';
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
  }[];
  logs: string[];
}

class BuildValidator {
  private logs: string[] = [];

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      this.logs.push(`[LOG] ${new Date().toISOString()}: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.logs.push(`[ERROR] ${new Date().toISOString()}: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.logs.push(`[WARN] ${new Date().toISOString()}: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
      originalWarn.apply(console, args);
    };
  }

  async runValidation(): Promise<ValidationEvidence> {
    const checks: ValidationEvidence['checks'] = [];

    // Check 1: Supabase Connectivity
    try {
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      if (error) throw error;
      checks.push({ name: 'Supabase Connection', status: 'pass' });
    } catch (err: any) {
      checks.push({ name: 'Supabase Connection', status: 'fail', message: err.message });
    }

    // Check 2: Auth Endpoints
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      checks.push({ name: 'Auth Service', status: 'pass' });
    } catch (err: any) {
      checks.push({ name: 'Auth Service', status: 'fail', message: err.message });
    }

    // Check 3: DOM Rendering
    const root = document.getElementById('root');
    const hasContent = root && root.innerHTML.length > 0;
    checks.push({ 
      name: 'DOM Rendering', 
      status: hasContent ? 'pass' : 'fail',
      message: hasContent ? undefined : 'Root element is empty'
    });

    const anyFail = checks.some(c => c.status === 'fail');
    const evidence: ValidationEvidence = {
      timestamp: new Date().toISOString(),
      status: anyFail ? 'failure' : 'success',
      checks,
      logs: this.logs.slice(-100) // Keep last 100 logs
    };

    localStorage.setItem('zapp_validation_evidence', JSON.stringify(evidence));
    return evidence;
  }

  getEvidence(): ValidationEvidence | null {
    const stored = localStorage.getItem('zapp_validation_evidence');
    return stored ? JSON.parse(stored) : null;
  }
}

export const buildValidator = new BuildValidator();

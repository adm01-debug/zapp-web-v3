
type ValidationEvent = {
  timestamp: string;
  type: 'log' | 'error' | 'network' | 'render';
  message: string;
  data?: any;
};

class ValidationLogger {
  private events: ValidationEvent[] = [];
  private maxEvents = 100;

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Intercept console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      this.addEvent('error', args.map(String).join(' '));
      originalConsoleError.apply(console, args);
    };

    // Intercept fetch for endpoint validation
    const originalFetch = window.fetch;
    window.fetch = async (...args: [URL | RequestInfo, RequestInit?]) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      try {
        const response = await originalFetch(...args);

        if (!response.ok) {
          this.addEvent('network', `Failed to fetch: ${url} (${response.status})`);
        }
        return response;
      } catch (error) {
        this.addEvent('network', `Network error: ${url} - ${String(error)}`);
        throw error;
      }
    };
  }

  public addEvent(type: ValidationEvent['type'], message: string, data?: any) {
    const event: ValidationEvent = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
    // Update evidence in local storage for persistence across reloads if possible
    try {
      localStorage.setItem('zapp_validation_evidence', JSON.stringify(this.events.slice(0, 50)));
    } catch (e) {}
  }

  public getEvents() {
    return this.events;
  }

  public getEvidence() {
    return {
      summary: {
        totalEvents: this.events.length,
        errors: this.events.filter(e => e.type === 'error').length,
        networkFailures: this.events.filter(e => e.type === 'network').length,
        renderChecks: this.events.filter(e => e.type === 'render').length,
      },
      events: this.events,
      browserInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }
    };
  }
}

export const validationLogger = new ValidationLogger();
